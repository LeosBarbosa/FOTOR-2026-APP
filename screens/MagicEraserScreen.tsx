
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Upload, Download, Wand, Edit, Eraser, ZoomIn, ZoomOut, Hand, RotateCcw } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const CanvasEditor: React.FC<{
    canvasRef: React.RefObject<HTMLCanvasElement>;
    maskCanvasRef: React.RefObject<HTMLCanvasElement>;
    image: string;
    brushSize: number;
    zoom: number;
    isHandActive: boolean;
    onMaskChange: (mask: string) => void;
}> = ({ canvasRef, maskCanvasRef, image, brushSize, zoom, isHandActive, onMaskChange }) => {
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!canvas || !maskCanvas) return;
        const ctx = canvas.getContext('2d');
        const maskCtx = maskCanvas.getContext('2d');
        if (!ctx || !maskCtx) return;

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
            y: (e.clientY - rect.top) / zoom
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
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        const canvasCtx = canvasRef.current?.getContext('2d');
        if (!maskCtx || !canvasCtx) return;

        const { x, y } = getCoords(e);
        
        maskCtx.fillStyle = 'white';
        maskCtx.beginPath();
        maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        maskCtx.fill();

        canvasCtx.globalAlpha = 0.5;
        canvasCtx.fillStyle = 'rgba(255, 50, 50, 0.5)'; // More visible red
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.globalAlpha = 1.0;
    };

    return (
        <>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onMouseLeave={stopDrawing}
                style={{ cursor: isHandActive ? 'grab' : 'none', display: 'block' }}
                className="shadow-2xl border border-white/10"
            />
            <canvas ref={maskCanvasRef} className="hidden" />
        </>
    );
};

export const MagicEraserScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(initialImage || null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [maskImage, setMaskImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [brushSize, setBrushSize] = useState(40);
    
    // View State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isHandToolMode, setIsHandToolMode] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isPanning = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const isHandActive = isHandToolMode || isSpacePressed;

    useEffect(() => {
        if (initialImage && !originalImage) setOriginalImage(initialImage);
    }, [initialImage, originalImage]);

    // Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setIsSpacePressed(true); }
            if (e.key.toLowerCase() === 'h') { e.preventDefault(); setIsHandToolMode(prev => !prev); }
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

    // Initial Fit
    useEffect(() => {
        if (originalImage && canvasRef.current && containerRef.current) {
            // Need a slight delay for image to load in canvas first
            setTimeout(() => {
                if(!canvasRef.current || !containerRef.current) return;
                const scale = Math.min(
                    (containerRef.current.clientWidth - 40) / canvasRef.current.width,
                    (containerRef.current.clientHeight - 40) / canvasRef.current.height
                );
                setZoom(Math.max(scale, 0.1));
                setPan({ 
                    x: (containerRef.current.clientWidth - canvasRef.current.width * scale) / 2, 
                    y: (containerRef.current.clientHeight - canvasRef.current.height * scale) / 2 
                });
            }, 100);
        }
    }, [originalImage]);

    // Panning & Zooming
    const handleContainerMouseDown = (e: React.MouseEvent) => {
        if (isHandActive) {
            isPanning.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    };

    const handleContainerMouseMove = (e: React.MouseEvent) => {
        if (isPanning.current) {
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleContainerMouseUp = () => isPanning.current = false;

    const handleWheelZoom = (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = -e.deltaY;
        const scaleFactor = 0.1;
        const newZoom = Math.max(0.1, Math.min(5, zoom + (delta > 0 ? scaleFactor : -scaleFactor)));
        if (newZoom === zoom) return;

        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;
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

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setOriginalImage(e.target?.result as string);
            setProcessedImage(null);
            setMaskImage(null);
            setZoom(1);
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
    };

    const handleApply = async () => {
        if (!originalImage || !maskImage) {
            setError('Por favor, carregue uma imagem e marque a área a ser removida.');
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            const { base64: originalB64, mimeType: originalMime } = await imageUrlToBase64(originalImage);
            const { base64: maskB64, mimeType: maskMime } = await imageUrlToBase64(maskImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = "Use a segunda imagem como uma máscara. Remova a área da primeira imagem que corresponde às partes brancas da máscara. Preencha a área removida de forma realista e contínua, combinando com o fundo e a textura circundantes.";
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: originalB64, mimeType: originalMime } },
                        { inlineData: { data: maskB64, mimeType: maskMime } },
                        { text: prompt },
                    ],
                },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const candidate = response.candidates?.[0];
            const part = candidate?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
                setProcessedImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            } else {
                throw new Error("A IA não retornou uma imagem.");
            }
        } catch (err: any) {
            console.error("Erro na Borracha Mágica:", err);
            setError(err.message || "Falha ao processar a imagem.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!processedImage) return;
        const link = document.createElement('a');
        link.href = processedImage;
        link.download = `apagado-magicamente-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
             <style>{`.bg-checkered { background-color: #222; background-image: linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; }`}</style>
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            
            <header className="flex-shrink-0 z-10 p-4 border-b border-white/5 bg-[#1a1a1a]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-semibold text-lg flex items-center gap-2">
                            <Wand size={20} className="text-blue-400" /> Borracha Mágica IA
                        </h1>
                    </div>
                    {processedImage && (
                        <div className="flex gap-2">
                            <button onClick={() => { setOriginalImage(processedImage); setProcessedImage(null); setMaskImage(null); }} className="px-4 py-2 text-xs font-bold bg-white/10 rounded-lg hover:bg-white/20">
                                Continuar Editando
                            </button>
                            <button onClick={handleDownload} className="bg-blue-600 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-500 text-xs"> <Download size={14} /> Baixar </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main 
                    ref={containerRef}
                    className={`flex-1 relative bg-[#0a0a0a] overflow-hidden ${isHandActive ? (isPanning.current ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-none'}`}
                    onMouseDown={handleContainerMouseDown}
                    onMouseMove={handleContainerMouseMove}
                    onMouseUp={handleContainerMouseUp}
                    onMouseLeave={handleContainerMouseUp}
                    onWheel={handleWheelZoom}
                    onContextMenu={handleContextMenu}
                >
                    <div 
                        className="origin-top-left transition-transform duration-75 ease-out"
                        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                    >
                        {processedImage ? (
                            <div className="relative inline-block">
                                <img src={processedImage} alt="Resultado" className="pointer-events-none rounded-lg shadow-2xl border border-white/10"/>
                                <button onClick={() => setProcessedImage(null)} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 hover:bg-black/80 transition-all text-sm pointer-events-auto">
                                    <RotateCcw size={14} className="inline mr-2"/> Voltar
                                </button>
                            </div>
                        ) : originalImage ? (
                            <CanvasEditor 
                                canvasRef={canvasRef}
                                maskCanvasRef={maskCanvasRef}
                                image={originalImage} 
                                brushSize={brushSize} 
                                zoom={zoom}
                                isHandActive={isHandActive}
                                onMaskChange={setMaskImage}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-screen -mt-20 gap-6 text-gray-500">
                                <Wand size={64} className="opacity-20"/>
                                <p>Carregue uma imagem para começar a apagar</p>
                                <button onClick={() => inputRef.current?.click()} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 hover:bg-blue-700 pointer-events-auto">
                                    <Upload size={20} /> Carregar Imagem
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Processing Overlay */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm">
                            <svg className="w-16 h-16 animate-spin text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <h3 className="text-white font-semibold text-lg drop-shadow-md">Removendo objeto...</h3>
                            <p className="text-gray-300 text-sm mt-1 drop-shadow-md">Reconstruindo o fundo com IA.</p>
                        </div>
                    )}

                    {/* Custom Cursor */}
                    {originalImage && !processedImage && !isHandActive && (
                        <div 
                            className="pointer-events-none fixed z-50 rounded-full border-2 border-red-500/50 bg-red-500/10"
                            style={{
                                width: brushSize * zoom,
                                height: brushSize * zoom,
                                left: -1000, // Hidden until moved, JS tracking would improve smoothness but standard cursor:none works for now
                                display: 'none' 
                            }} 
                        />
                    )}
                    {originalImage && !processedImage && !isHandActive && (
                         <style>{`
                            canvas {
                                cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(32, brushSize)}" height="${Math.max(32, brushSize)}" viewBox="0 0 ${brushSize} ${brushSize}"><circle cx="${brushSize/2}" cy="${brushSize/2}" r="${Math.max(1, brushSize/2-2)}" fill="rgba(255,0,0,0.1)" stroke="red" stroke-width="1.5"/></svg>') ${brushSize/2} ${brushSize/2}, auto !important;
                            }
                        `}</style>
                    )}

                    {/* Context Menu */}
                    {contextMenu && (
                        <div 
                            className="absolute bg-[#2c2c2c] border border-gray-600 rounded-md shadow-xl py-1 z-50 min-w-[150px]"
                            style={{ top: contextMenu.y, left: contextMenu.x }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button onClick={() => {
                                if(!canvasRef.current || !containerRef.current) return;
                                const scale = Math.min((containerRef.current.clientWidth - 40) / canvasRef.current.width, (containerRef.current.clientHeight - 40) / canvasRef.current.height);
                                setZoom(Math.max(scale, 0.1));
                                setPan({ x: (containerRef.current.clientWidth - canvasRef.current.width * scale) / 2, y: (containerRef.current.clientHeight - canvasRef.current.height * scale) / 2 });
                                setContextMenu(null);
                            }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600">Ajustar à Tela</button>
                            <button onClick={() => { setZoom(1); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600">100%</button>
                        </div>
                    )}
                </main>

                <aside className="w-80 bg-[#1a1a1a] border-l border-white/5 flex flex-col p-6 z-20 shadow-xl overflow-y-auto">
                    {/* Hand Tool Toggle */}
                    <div className="bg-white/5 p-2 rounded-xl flex gap-2 mb-6">
                        <button 
                            onClick={() => setIsHandToolMode(!isHandToolMode)}
                            className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${isHandActive ? 'bg-yellow-600 text-white' : 'hover:bg-white/10 text-gray-400'}`}
                            title="Ferramenta Mão (H)"
                        >
                            <Hand size={18} /> <span className="text-xs font-bold">Mover</span>
                        </button>
                        <div className="flex gap-1">
                            <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><ZoomOut size={18} /></button>
                            <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><ZoomIn size={18} /></button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Tamanho do Pincel</label>
                                <span className="text-xs font-mono text-gray-400">{brushSize}px</span>
                            </div>
                            <input type="range" min="10" max="200" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
                        </div>
                        
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <h4 className="text-xs font-bold text-red-300 mb-1 flex items-center gap-2"><Eraser size={14}/> Dica Pro</h4>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Pinte ligeiramente além das bordas do objeto para ajudar a IA a entender o contexto do fundo.
                            </p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 mt-auto">
                        <button onClick={handleApply} disabled={isProcessing || !originalImage} className="w-full bg-blue-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20">
                            {isProcessing ? 'Apagando...' : 'Apagar Objeto'}
                        </button>
                        {error && <div className="mt-3 p-2 bg-red-900/50 border border-red-500/20 rounded-lg text-center text-xs text-red-200">{error}</div>}
                    </div>
                </aside>
            </div>
        </div>
    );
};
