
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Download, Wand, Edit, Brush, X, Key, Hand, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

// CanvasEditor Component
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
            canvas.width = img.width;
            canvas.height = img.height;
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            maskCtx.fillStyle = 'black';
            maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        };
    }, [image]);

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
        if (maskCanvas) {
            onMaskChange(maskCanvas.toDataURL('image/png'));
        }
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

// Main Screen Component
export const VirtualTattooScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; }> = ({ onBack, onEdit }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [maskImage, setMaskImage] = useState<string | null>(null);
    const [tattooImage, setTattooImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [brushSize, setBrushSize] = useState(40);
    const bodyPhotoInputRef = useRef<HTMLInputElement>(null);
    const tattooImageInputRef = useRef<HTMLInputElement>(null);

    // Zoom & Pan State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isHandToolMode, setIsHandToolMode] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
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
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const handleGenerate = async () => {
        if (!originalImage || !maskImage || (!prompt.trim() && !tattooImage)) {
            setError('Carregue uma foto, pinte a área e descreva ou carregue um modelo de tatuagem.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setProcessedImage(null);

        try {
            const { base64: bodyBase64, mimeType: bodyMimeType } = await imageUrlToBase64(originalImage);
            const { base64: maskBase64, mimeType: maskMimeType } = await imageUrlToBase64(maskImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const parts: any[] = [
                { inlineData: { data: bodyBase64, mimeType: bodyMimeType } },
                { inlineData: { data: maskBase64, mimeType: maskMimeType } },
            ];
    
            let fullPrompt = `Use the second image as a mask. On the first image, apply a realistic tattoo on the white area of the mask.`;
            
            if (tattooImage) {
                const { base64: tattooBase64, mimeType: tattooMimeType } = await imageUrlToBase64(tattooImage);
                parts.push({ inlineData: { data: tattooBase64, mimeType: tattooMimeType } });
                fullPrompt += ` Use the third image (tattoo design) as the primary visual reference.`;
            }
    
            if (prompt.trim()) {
                fullPrompt += ` Design description: "${prompt}".`;
            }
    
            fullPrompt += ` IMPORTANT: The tattoo MUST follow the natural contours, skin texture, and curvature of the body realistically. Adjust opacity and lighting so it looks like ink under the skin, not a sticker. Result: High Resolution 4K.`;
            
            parts.push({ text: fullPrompt });

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts },
              config: { responseModalities: [Modality.IMAGE] },
            });
            
            const candidate = response.candidates?.[0];
            const partsRes = candidate?.content?.parts || [];
            let imageFound = false;
            
            for (const part of partsRes) {
                if (part.inlineData) {
                    const resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    setProcessedImage(resultUrl);
                    imageFound = true;
                    break;
                }
            }
            if (!imageFound) {
                const text = partsRes.find(p => p.text)?.text;
                throw new Error(text || "A IA não retornou uma imagem.");
            }
        } catch (err: any) {
            console.error("Erro na tatuagem virtual:", err);
            setError(err.message || "Falha ao gerar a tatuagem.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBodyPhotoUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setOriginalImage(e.target?.result as string);
            setProcessedImage(null);
            setMaskImage(null);
            setZoom(1);
            setPan({x:0, y:0});
        };
        reader.readAsDataURL(file);
    };

    const handleBodyPhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleBodyPhotoUpload(e.target.files[0]);
    };

    const handleTattooImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setTattooImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleTattooImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleTattooImageUpload(e.target.files[0]);
    };

    const handleDownload = () => {
        if (!processedImage) return;
        const link = document.createElement('a');
        link.href = processedImage;
        link.download = `tatuagem-ia-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Panning & Zooming
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

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
            <style>{`.bg-checkered { background-color: #222; background-image: linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; }`}</style>
            <input type="file" ref={bodyPhotoInputRef} className="hidden" accept="image/*" onChange={handleBodyPhotoFileChange} />
            <input type="file" ref={tattooImageInputRef} className="hidden" accept="image/*" onChange={handleTattooImageFileChange} />
            
            <header className="flex-shrink-0 z-10 p-4 bg-[#1a1a1a] border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-semibold text-lg drop-shadow-md">Tatuagem Virtual IA</h1>
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
                        className="origin-top-left transition-transform duration-75 ease-out w-full h-full flex items-center justify-center"
                        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                    >
                        {isProcessing ? (
                            <div className="text-center transform scale-100">
                                <svg className="w-16 h-16 animate-spin text-white mb-4 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <h3 className="text-white font-semibold text-lg">Aplicando Tatuagem Pro...</h3>
                                <p className="text-gray-300 text-sm mt-1">A IA está renderizando na pele com precisão.</p>
                            </div>
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
                                <div className="w-24 h-24 bg-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <Wand size={48} className="text-purple-400"/>
                                </div>
                                <h2 className="text-3xl font-bold mb-2">Tatuagem Virtual (Pro)</h2>
                                <p className="text-gray-400 mb-8 max-w-sm mx-auto">Visualize designs no seu corpo com realismo fotográfico usando Gemini 2.5 Flash.</p>
                                <button onClick={() => bodyPhotoInputRef.current?.click()} className="bg-purple-600 text-white font-bold py-4 px-10 rounded-full flex items-center gap-3 hover:bg-purple-700 transition-all shadow-xl shadow-purple-900/20 pointer-events-auto">
                                    <Upload size={22} /> Carregar Foto do Corpo
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

                <footer className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/90 to-transparent pointer-events-none flex justify-center">
                    {error && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-4 p-3 bg-red-900/80 rounded-lg text-center text-xs text-red-200 backdrop-blur-sm border border-red-500/50 pointer-events-auto">{error}</div>}
                    
                    {processedImage ? (
                        <div className="max-w-md w-full flex items-center justify-center gap-4 bg-black/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 pointer-events-auto">
                            <button onClick={() => onEdit(processedImage)} className="bg-gray-700 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-600 transition-all"> <Edit size={18} /> Editar </button>
                            <button onClick={handleDownload} className="bg-blue-600 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"> <Download size={18} /> Baixar </button>
                        </div>
                    ) : originalImage ? (
                        <div className="max-w-xl w-full flex flex-col gap-4 bg-black/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10 pointer-events-auto shadow-2xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pincel da Máscara</label>
                                    <input type="range" min="10" max="150" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full mt-2 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button onClick={() => tattooImageInputRef.current?.click()} className="flex items-center justify-between bg-gray-700/50 px-4 py-2.5 rounded-xl text-xs hover:bg-gray-600/50 border border-white/5 transition-colors">
                                        <span className="truncate">{tattooImage ? 'Design Carregado ✅' : 'Carregar Referência (Opcional)'}</span>
                                        <Upload size={14} className="flex-shrink-0" />
                                    </button>
                                    <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ou descreva o desenho..." className="bg-gray-800/80 border border-white/5 p-2.5 rounded-xl text-xs w-full focus:ring-1 focus:ring-purple-500 outline-none" />
                                </div>
                            </div>
                            <button 
                                onClick={handleGenerate} 
                                disabled={isProcessing} 
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-purple-900/20"
                            >
                                <Wand size={18} /> Aplicar Tatuagem Pro
                            </button>
                        </div>
                    ) : null}
                </footer>
            </div>
        </div>
    );
};
