
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Upload, Download, Waves, Edit, ZoomIn, ZoomOut, Maximize2, Minimize2, Hand, RotateCcw } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const tools = [
    { id: 'inflate', label: 'Inflar', icon: Maximize2, description: 'Expande a área selecionada.' },
    { id: 'deflate', label: 'Encolher', icon: Minimize2, description: 'Comprime a área selecionada.' },
    { id: 'warp', label: 'Liquefazer', icon: Waves, description: 'Distorce a área de forma fluida.' },
];

// --- CANVAS EDITOR COMPONENT ---
// Handles the drawing logic on the canvas element itself
const CanvasEditor: React.FC<{
    canvasRef: React.RefObject<HTMLCanvasElement>;
    maskCanvasRef: React.RefObject<HTMLCanvasElement>;
    image: string;
    brushSize: number;
    zoom: number;
    activeToolId: string;
    isHandActive: boolean;
    onMaskChange: (mask: string) => void;
}> = ({ canvasRef, maskCanvasRef, image, brushSize, zoom, activeToolId, isHandActive, onMaskChange }) => {
    const [isDrawing, setIsDrawing] = useState(false);

    // Initial Draw
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
            
            // Initialize mask with black (no effect)
            maskCtx.fillStyle = 'black';
            maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        };
    }, [image]);

    // Coordinate mapping (Screen -> Canvas)
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
        if (isHandActive) return; // Don't draw if panning
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
        
        // Draw Mask
        maskCtx.fillStyle = 'white';
        maskCtx.beginPath();
        maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        maskCtx.fill();

        // Visual Feedback
        canvasCtx.save();
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        canvasCtx.fillStyle = activeToolId === 'deflate' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 255, 255, 0.1)';
        canvasCtx.fill();
        canvasCtx.restore();
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
                style={{ 
                    cursor: isHandActive ? 'grab' : 'none', // Hide default cursor when painting to use custom brush
                    display: 'block'
                }}
            />
            <canvas ref={maskCanvasRef} className="hidden" />
        </>
    );
};

// --- MAIN SCREEN ---
export const LiquifyScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage?: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(initialImage || null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [maskImage, setMaskImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Tools State
    const [activeTool, setActiveTool] = useState(tools[0]);
    const [brushSize, setBrushSize] = useState(100);
    const [intensity, setIntensity] = useState(50);

    // Viewport/Camera State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isHandToolMode, setIsHandToolMode] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Panning Refs
    const isPanning = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const isHandActive = isHandToolMode || isSpacePressed;

    // --- KEYBOARD SHORTCUTS ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault(); // Prevent scrolling
                setIsSpacePressed(true);
            }
            if (e.key.toLowerCase() === 'h') {
                e.preventDefault();
                setIsHandToolMode(prev => !prev);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') setIsSpacePressed(false);
        };
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

    // --- MOUSE EVENTS FOR PANNING ---
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

    const handleContainerMouseUp = () => {
        isPanning.current = false;
    };

    const handleWheelZoom = (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const delta = -e.deltaY;
        const scaleFactor = 0.1;
        const newZoom = Math.max(0.1, Math.min(5, zoom + (delta > 0 ? scaleFactor : -scaleFactor)));
        
        if (newZoom === zoom) return;

        // Calculate offset to zoom towards mouse
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;
            
            // Adjust pan to keep mouse point stable
            const scaleChange = newZoom / zoom;
            const newPanX = mouseX - (mouseX - pan.x) * scaleChange;
            const newPanY = mouseY - (mouseY - pan.y) * scaleChange;
            
            setPan({ x: newPanX, y: newPanY });
        }
        setZoom(newZoom);
    };

    const fitToScreen = useCallback(() => {
        if (!canvasRef.current || !containerRef.current) return;
        const imgWidth = canvasRef.current.width;
        const imgHeight = canvasRef.current.height;
        const containerWidth = containerRef.current.clientWidth - 40;
        const containerHeight = containerRef.current.clientHeight - 40;

        if (imgWidth === 0 || imgHeight === 0) return;

        const scale = Math.min(containerWidth / imgWidth, containerHeight / imgHeight);
        setZoom(Math.max(scale, 0.1));
        
        // Center
        const scaledW = imgWidth * scale;
        const scaledH = imgHeight * scale;
        setPan({ 
            x: (containerRef.current.clientWidth - scaledW) / 2, 
            y: (containerRef.current.clientHeight - scaledH) / 2 
        });
    }, []);

    useEffect(() => {
        if (originalImage) {
            setTimeout(fitToScreen, 100);
        }
    }, [originalImage, fitToScreen]);

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isHandActive) {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
        }
    };

    // --- ACTIONS ---
    const handleApply = async () => {
        if (!originalImage || !maskImage) {
            setError('Pinte a área que deseja alterar.');
            return;
        }
        setIsProcessing(true);
        setError(null);

        try {
            const { base64: originalB64, mimeType: originalMime } = await imageUrlToBase64(originalImage);
            const { base64: maskB64, mimeType: maskMime } = await imageUrlToBase64(maskImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let promptAction = "";
            let intensityDesc = intensity > 70 ? "Extreme" : intensity > 40 ? "Strong" : "Subtle";

            switch (activeTool.id) {
                case 'inflate': promptAction = `Apply a localized SPHERICAL BULGE distortion (fish-eye/magnify effect) to the masked area. Make the area look inflated and larger. Intensity: ${intensityDesc}.`; break;
                case 'deflate': promptAction = `Apply a localized PINCH distortion (shrinking effect) to the masked area. Make the area look compressed and smaller. Intensity: ${intensityDesc}.`; break;
                case 'warp': promptAction = `Apply a FLUID LIQUIFY distortion to the masked area. Warp the pixels as if they are melting or flowing. Intensity: ${intensityDesc}.`; break;
            }

            const fullPrompt = `Task: Digital Image Manipulation (Liquify Tool). Use the second image as a MASK (white areas are the target). Action: ${promptAction}. Seamlessly blend the distorted area with the surrounding pixels. Do NOT change the background or colors outside the mask. Output high-resolution 4K image.`;
            
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
            const part = candidate?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
                setProcessedImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            } else {
                throw new Error("A IA não conseguiu aplicar o efeito.");
            }
        } catch (err: any) {
            console.error("Erro no Liquify:", err);
            setError(err.message || "Falha ao processar.");
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
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleDownload = () => {
        if (!processedImage) return;
        const link = document.createElement('a');
        link.href = processedImage;
        link.download = `liquify-${activeTool.id}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            
            <header className="flex-shrink-0 z-10 p-4 border-b border-white/5 bg-[#1a1a1a]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-semibold text-lg flex items-center gap-2">
                            <Waves size={20} className="text-cyan-400" />
                            Ferramenta Liquefazer & Inflar
                        </h1>
                    </div>
                    {processedImage && (
                        <div className="flex gap-2">
                            <button onClick={() => { setOriginalImage(processedImage); setProcessedImage(null); setMaskImage(null); }} className="px-4 py-2 text-xs font-bold bg-white/10 rounded-lg hover:bg-white/20">
                                Usar como Base
                            </button>
                            <button onClick={handleDownload} className="px-4 py-2 text-xs font-bold bg-blue-600 rounded-lg hover:bg-blue-500 flex items-center gap-2">
                                <Download size={14} /> Baixar
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Canvas Area */}
                <div 
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
                                <img src={processedImage} alt="Resultado" className="pointer-events-none shadow-2xl border border-white/10 rounded-lg" />
                                <button 
                                    onClick={() => setProcessedImage(null)} 
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 hover:bg-black/80 transition-all text-sm pointer-events-auto"
                                >
                                    <RotateCcw size={14} className="inline mr-2"/> Voltar para Edição
                                </button>
                            </div>
                        ) : originalImage ? (
                            <CanvasEditor 
                                canvasRef={canvasRef}
                                maskCanvasRef={maskCanvasRef}
                                image={originalImage} 
                                brushSize={brushSize} 
                                zoom={zoom} 
                                activeToolId={activeTool.id}
                                isHandActive={isHandActive}
                                onMaskChange={setMaskImage}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4 mt-20">
                                <Waves size={64} className="opacity-20" />
                                <p>Carregue uma imagem para começar</p>
                                <button onClick={() => inputRef.current?.click()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-500 transition-colors pointer-events-auto cursor-pointer">
                                    Upload Foto
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Custom Cursor Overlay */}
                    {originalImage && !processedImage && !isHandActive && (
                        <div 
                            className="pointer-events-none fixed z-50 rounded-full border-2 border-white/50 bg-white/5 mix-blend-difference"
                            style={{
                                width: brushSize * zoom,
                                height: brushSize * zoom,
                                left: lastMousePos.current.x - (brushSize * zoom / 2), // Note: This simplistic tracking needs React state or raw DOM listener for smoothness.
                                // For better performance, we use SVG cursor in style prop of CanvasEditor, but here is a fallback or conceptual div
                                display: 'none' 
                            }} 
                        />
                    )}
                    {originalImage && !processedImage && !isHandActive && (
                         <style>{`
                            canvas {
                                cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(32, brushSize)}" height="${Math.max(32, brushSize)}" viewBox="0 0 ${brushSize} ${brushSize}"><circle cx="${brushSize/2}" cy="${brushSize/2}" r="${Math.max(1, brushSize/2-2)}" fill="rgba(255,255,255,0.1)" stroke="white" stroke-width="1.5"/></svg>') ${brushSize/2} ${brushSize/2}, auto !important;
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
                            <button onClick={() => { fitToScreen(); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600">Ajustar à Tela</button>
                            <button onClick={() => { setZoom(1); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600">100%</button>
                        </div>
                    )}

                    {/* Processing Overlay */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-cyan-400 font-bold uppercase tracking-widest text-sm">Aplicando Deformação...</p>
                        </div>
                    )}
                </div>

                {/* Sidebar Controls */}
                <div className="w-80 bg-[#1a1a1a] border-l border-white/5 flex flex-col p-6 gap-8 overflow-y-auto z-20 shadow-xl">
                    {/* Navigation Tools */}
                    <div className="bg-white/5 p-2 rounded-xl flex gap-2">
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

                    {/* Tools Selection */}
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Modo de Deformação</h3>
                        <div className="grid gap-2">
                            {tools.map(tool => (
                                <button
                                    key={tool.id}
                                    onClick={() => { setActiveTool(tool); setIsHandToolMode(false); }}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${
                                        activeTool.id === tool.id && !isHandActive
                                            ? 'bg-blue-600/20 border-blue-500 text-blue-200' 
                                            : 'bg-[#252525] border-transparent text-gray-400 hover:bg-[#303030]'
                                    }`}
                                >
                                    <tool.icon size={20} />
                                    <div className="text-left">
                                        <div className="font-bold text-xs">{tool.label}</div>
                                        <div className="text-[9px] opacity-70">{tool.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Brush Settings */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Tamanho do Pincel</h3>
                            <span className="text-xs font-mono text-gray-400">{brushSize}px</span>
                        </div>
                        <input 
                            type="range" min="20" max="300" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} 
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>

                    {/* Intensity Settings */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Intensidade</h3>
                            <span className="text-xs font-mono text-gray-400">{intensity}%</span>
                        </div>
                        <input 
                            type="range" min="10" max="100" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} 
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/5">
                        <button 
                            onClick={handleApply}
                            disabled={!maskImage || isProcessing}
                            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-sm text-white shadow-lg shadow-cyan-900/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                        >
                            {isProcessing ? 'Processando...' : 'Aplicar Liquefazer'}
                        </button>
                        {error && <p className="text-red-400 text-xs text-center mt-3">{error}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};
