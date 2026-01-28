
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Download, Replace, Edit, Hand, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const CanvasEditor: React.FC<{
    image: string;
    brushSize: number;
    zoom: number;
    isHandActive: boolean;
    onMaskChange: (mask: string) => void;
}> = ({ image, brushSize, zoom, isHandActive, onMaskChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        const maskCtx = maskCanvas?.getContext('2d');
        if (!canvas || !ctx || !maskCanvas || !maskCtx) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = image;
        img.onload = () => {
            // Set canvas size to image size for high fidelity, we scale via CSS transform in parent
            canvas.width = img.width;
            canvas.height = img.height;
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            maskCtx.fillStyle = 'black';
            maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        };
    }, [image]);

    // Map screen coordinates to canvas coordinates accounting for zoom
    const getCoords = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom,
        };
    };

    const startDrawing = (e: React.MouseEvent) => { 
        if (isHandActive) return;
        setIsDrawing(true); 
        draw(e); 
    };
    
    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const maskCanvas = maskCanvasRef.current;
        if (maskCanvas) onMaskChange(maskCanvas.toDataURL('image/png'));
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || isHandActive) return;
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const canvasCtx = canvas?.getContext('2d');
        const maskCtx = maskCanvas?.getContext('2d');
        if (!canvasCtx || !maskCtx || !canvas) return;

        const { x, y } = getCoords(e);
        
        canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        canvasCtx.fill();
        
        maskCtx.fillStyle = 'white';
        maskCtx.beginPath();
        maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        maskCtx.fill();
    };

    return (
        <>
             <canvas 
                ref={canvasRef} 
                onMouseDown={startDrawing} 
                onMouseUp={stopDrawing} 
                onMouseMove={draw} 
                onMouseLeave={stopDrawing} 
                className="shadow-2xl border border-white/10"
                style={{ cursor: isHandActive ? 'grab' : 'crosshair' }} 
            />
             <canvas ref={maskCanvasRef} className="hidden" />
        </>
    );
};


export const AiReplaceScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; }> = ({ onBack, onEdit }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [maskImage, setMaskImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [brushSize, setBrushSize] = useState(40);
    const inputRef = useRef<HTMLInputElement>(null);

    // Zoom & Pan State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isHandToolMode, setIsHandToolMode] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const isPanning = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const isHandActive = isHandToolMode || isSpacePressed;

    // Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setIsSpacePressed(true); }
            if (e.key.toLowerCase() === 'h' && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); setIsHandToolMode(prev => !prev); }
        };
        const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('click', closeMenu);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('click', closeMenu);
        };
    }, []);

    // Fit to screen logic
    const fitImage = () => {
        if (!containerRef.current) return;
        // Simple heuristic reset
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // Panning & Zooming Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (isHandActive) {
            isPanning.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning.current) {
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = () => isPanning.current = false;

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = -e.deltaY;
        const scaleFactor = 0.1;
        const newZoom = Math.max(0.1, Math.min(5, zoom + (delta > 0 ? scaleFactor : -scaleFactor)));
        if (newZoom === zoom) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const scaleChange = newZoom / zoom;
            setPan({
                x: mouseX - (mouseX - pan.x) * scaleChange,
                y: mouseY - (mouseY - pan.y) * scaleChange
            });
        }
        setZoom(newZoom);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isHandActive) {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
        }
    };

    const handleApply = async () => {
        if (!originalImage || !maskImage || !prompt) {
            setError('Carregue uma imagem, pinte uma área e descreva a substituição.');
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            const { base64: originalB64, mimeType: originalMime } = await imageUrlToBase64(originalImage);
            const { base64: maskB64, mimeType: maskMime } = await imageUrlToBase64(maskImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const fullPrompt = `Use a segunda imagem como uma máscara. Na primeira imagem, substitua a área correspondente às partes brancas da máscara pelo seguinte: "${prompt}". Combine a substituição perfeitamente com o resto da imagem em termos de iluminação, estilo e perspectiva.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [
                    { inlineData: { data: originalB64, mimeType: originalMime } },
                    { inlineData: { data: maskB64, mimeType: maskMime } },
                    { text: fullPrompt },
                ]},
                config: { responseModalities: [Modality.IMAGE] },
            });

            const candidate = response.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            let imageFound = false;
            for (const part of parts) {
                if (part.inlineData) {
                    setProcessedImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    imageFound = true;
                    break;
                }
            }
            if (!imageFound) {
                const text = candidate?.content?.parts?.[0]?.text;
                if (text) throw new Error(`Falha: ${text}`);
                throw new Error("A IA não retornou uma imagem.");
            }

        } catch (err: any) {
            console.error("Erro na Substituição com IA:", err);
            setError(err.message || "Falha ao processar a imagem.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setOriginalImage(ev.target?.result as string);
                setProcessedImage(null);
                setMaskImage(null);
                setZoom(1);
                setPan({x: 0, y: 0});
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleDownload = () => {
        if (!processedImage) return;
        const link = document.createElement('a');
        link.href = processedImage;
        link.download = `substituicao-ia-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
             <style>{`.bg-checkered { background-color: #222; background-image: linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; }`}</style>
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            
            <header className="flex-shrink-0 z-10 p-4 border-b border-white/5 bg-[#1a1a1a] flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-semibold text-lg drop-shadow-md">Substituição com IA</h1>
                </div>
                {originalImage && !processedImage && (
                    <div className="flex items-center gap-2 bg-black/30 p-1 rounded-lg border border-white/10">
                        <button 
                            onClick={() => setIsHandToolMode(!isHandToolMode)}
                            className={`p-2 rounded-md transition-colors ${isHandActive ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="Ferramenta Mão (H)"
                        >
                            <Hand size={18} />
                        </button>
                        <div className="w-px h-4 bg-white/10"></div>
                        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 rounded-md text-gray-400 hover:text-white"><ZoomOut size={18}/></button>
                        <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="p-2 rounded-md text-gray-400 hover:text-white"><ZoomIn size={18}/></button>
                    </div>
                )}
            </header>

            <div className="relative flex-1 overflow-hidden flex">
                <main 
                    ref={containerRef}
                    className={`flex-1 relative bg-[#0a0a0a] overflow-hidden ${isHandActive ? (isPanning.current ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-none'}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    onContextMenu={handleContextMenu}
                >
                    <div 
                        ref={canvasRef}
                        className="origin-top-left transition-transform duration-75 ease-out w-full h-full flex items-center justify-center"
                        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                    >
                        {isProcessing ? (
                            <div className="text-center transform scale-100"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div><p>Substituindo...</p></div>
                        ) : processedImage ? (
                            <div className="relative inline-block">
                                <img src={processedImage} alt="Resultado" className="pointer-events-none rounded-lg shadow-2xl border border-white/10"/>
                                <button onClick={() => setProcessedImage(null)} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 hover:bg-black/80 transition-all text-sm pointer-events-auto">
                                    <RotateCcw size={14} className="inline mr-2"/> Voltar
                                </button>
                            </div>
                        ) : originalImage ? (
                            <CanvasEditor 
                                image={originalImage} 
                                brushSize={brushSize} 
                                zoom={zoom}
                                isHandActive={isHandActive}
                                onMaskChange={setMaskImage} 
                            />
                        ) : (
                            <div className="text-center p-4">
                                <Replace size={48} className="mx-auto text-blue-400 mb-4"/>
                                <h2 className="text-3xl font-bold mb-2">Substituição com IA</h2>
                                <p className="text-gray-400 mb-6">Pinte uma área e diga à IA o que gerar no lugar.</p>
                                <button onClick={() => inputRef.current?.click()} className="bg-blue-600 font-bold py-3 px-8 rounded-full flex items-center gap-2 pointer-events-auto hover:bg-blue-700">
                                    <Upload size={20} /> Carregar Imagem
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Context Menu */}
                    {contextMenu && (
                        <div 
                            className="absolute bg-[#2c2c2c] border border-gray-600 rounded-md shadow-xl py-1 z-50 min-w-[150px]"
                            style={{ top: contextMenu.y, left: contextMenu.x }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button onClick={() => { fitImage(); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600">Ajustar à Tela</button>
                            <button onClick={() => { setZoom(1); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600">100%</button>
                        </div>
                    )}
                </main>

                <aside className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/90 to-transparent pointer-events-none flex justify-center">
                    {error && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-4 p-3 bg-red-900/80 rounded-lg text-center text-xs text-red-200 backdrop-blur-sm pointer-events-auto">{error}</div>}
                    {originalImage && !processedImage && (
                        <div className="max-w-xl w-full flex flex-col gap-4 bg-[#1a1a1a]/90 backdrop-blur-md p-4 rounded-xl border border-white/10 pointer-events-auto shadow-2xl">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tamanho do Pincel: {brushSize}px</label>
                                    <input type="range" min="10" max="150" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full mt-2 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prompt</label>
                                    <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex: um gato de óculos" className="w-full mt-2 bg-black/50 border border-white/10 p-2 rounded-lg text-sm focus:border-blue-500 outline-none" />
                                </div>
                            </div>
                             <div className="flex gap-3">
                                <button onClick={handleApply} disabled={isProcessing} className="flex-1 bg-blue-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:bg-gray-700 disabled:opacity-50 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">
                                    <Replace size={18} /> Aplicar Substituição
                                </button>
                            </div>
                        </div>
                    )}
                    {processedImage && (
                        <div className="max-w-md w-full flex gap-3 pointer-events-auto">
                            <button onClick={() => onEdit(processedImage)} className="flex-1 bg-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-600 flex items-center justify-center gap-2">
                                <Edit size={18} /> Editar
                            </button>
                            <button onClick={handleDownload} className="flex-1 bg-blue-600 font-bold py-3 px-4 rounded-xl hover:bg-blue-500 flex items-center justify-center gap-2">
                                <Download size={18} /> Baixar
                            </button>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};
