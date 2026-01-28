
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, MousePointer2, RotateCcw, Hand, Eraser, Maximize, Minimize } from 'lucide-react';
import { imageUrlToBase64 } from '../utils/fileUtils';

// --- TYPES & INTERFACES ---
type LiquifyTool = 'warp' | 'bloat' | 'pucker' | 'reconstruct';

interface LiquifyParams {
    brushSize: number;
    pressure: number;
    density: number;
}

// --- MATH HELPERS ---
// Optimized bilinear sampling
const bilinearSample = (
    buffer: Uint8ClampedArray, 
    width: number, 
    height: number, 
    x: number, 
    y: number, 
    offset: number
): number => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    
    // Clamp coordinates to image bounds
    const x0 = Math.max(0, Math.min(ix, width - 1));
    const y0 = Math.max(0, Math.min(iy, height - 1));
    const x1 = Math.max(0, Math.min(ix + 1, width - 1));
    const y1 = Math.max(0, Math.min(iy + 1, height - 1));

    const dx = x - ix;
    const dy = y - iy;
    const oneMinusDx = 1 - dx;
    const oneMinusDy = 1 - dy;

    const row0 = y0 * width * 4;
    const row1 = y1 * width * 4;

    const val00 = buffer[row0 + x0 * 4 + offset];
    const val10 = buffer[row0 + x1 * 4 + offset];
    const val01 = buffer[row1 + x0 * 4 + offset];
    const val11 = buffer[row1 + x1 * 4 + offset];

    const top = val00 * oneMinusDx + val10 * dx;
    const bottom = val01 * oneMinusDx + val11 * dx;
    
    return top * oneMinusDy + bottom * dy;
};

// --- CUSTOM HOOK: useLiquify ---
const useLiquify = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    imageSrc: string | null
) => {
    // Data refs
    const dataRef = useRef<{
        width: number;
        height: number;
        originalBuffer: Uint8ClampedArray | null; 
        currentBuffer: Uint8ClampedArray | null; 
        ctx: CanvasRenderingContext2D | null;
    }>({ width: 0, height: 0, originalBuffer: null, currentBuffer: null, ctx: null });

    // Brush Kernel Cache (Optimization)
    // Stores the falloff values (0.0 to 1.0) for the current brush size
    const brushKernelRef = useRef<{ size: number, data: Float32Array } | null>(null);

    // Interaction State Refs (accessed by RAF loop)
    const interactionRef = useRef<{
        isActive: boolean;
        currentPoint: { x: number, y: number } | null;
        lastRenderPoint: { x: number, y: number } | null;
        tool: LiquifyTool;
        params: LiquifyParams;
    }>({
        isActive: false,
        currentPoint: null,
        lastRenderPoint: null,
        tool: 'warp',
        params: { brushSize: 100, pressure: 0.5, density: 0.5 }
    });

    const rafIdRef = useRef<number | null>(null);

    // Initialize Canvas Data
    useEffect(() => {
        if (!canvasRef.current || !imageSrc) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageSrc;

        img.onload = () => {
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            dataRef.current = {
                width: canvas.width,
                height: canvas.height,
                originalBuffer: new Uint8ClampedArray(imageData.data), 
                currentBuffer: imageData.data, 
                ctx: ctx
            };
        };
        
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        };
    }, [imageSrc]);

    // OPTIMIZATION: Pre-calculate brush falloff
    const updateBrushKernel = (size: number) => {
        // Only regenerate if size changed
        if (brushKernelRef.current?.size === size) return;

        const radius = size / 2;
        const radiusSq = radius * radius;
        // Use a Float32Array for memory efficiency
        const kernel = new Float32Array(size * size);
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Center of the pixel relative to center of brush
                const dy = y - radius + 0.5;
                const dx = x - radius + 0.5;
                const distSq = dx*dx + dy*dy;
                
                if (distSq < radiusSq) {
                    // Smooth falloff function: (1 - (r/R)^2)^2
                    // This avoids Math.sqrt inside the loop for performance
                    const distRatioSq = distSq / radiusSq;
                    const falloff = (1 - distRatioSq) * (1 - distRatioSq);
                    kernel[y * size + x] = falloff;
                } else {
                    kernel[y * size + x] = 0;
                }
            }
        }
        brushKernelRef.current = { size, data: kernel };
    };

    // Core Processing Function
    const processDistortion = (
        centerX: number, 
        centerY: number, 
        movementX: number, 
        movementY: number, 
        tool: LiquifyTool,
        params: LiquifyParams
    ) => {
        const { width, height, currentBuffer, originalBuffer, ctx } = dataRef.current;
        if (!currentBuffer || !originalBuffer || !ctx) return;

        // Ensure kernel is up to date
        updateBrushKernel(Math.ceil(params.brushSize));
        const kernel = brushKernelRef.current;
        if (!kernel) return;

        const radius = params.brushSize / 2;
        const pressure = params.pressure;
        const density = params.density;
        
        // Define bounding box for update to avoid iterating whole image
        const startX = Math.max(0, Math.floor(centerX - radius));
        const startY = Math.max(0, Math.floor(centerY - radius));
        const endX = Math.min(width, Math.ceil(centerX + radius));
        const endY = Math.min(height, Math.ceil(centerY + radius));
        const rectW = endX - startX;
        const rectH = endY - startY;

        if (rectW <= 0 || rectH <= 0) return;

        // Calculate offset into the kernel
        // The kernel's (0,0) corresponds to (centerX - radius, centerY - radius)
        // startX is the actual image pixel we start at.
        const kernelOffsetX = Math.floor(centerX - radius);
        const kernelOffsetY = Math.floor(centerY - radius);

        // Use a temporary buffer for this frame's calculations
        const destBuffer = new Uint8ClampedArray(rectW * rectH * 4);

        for (let y = 0; y < rectH; y++) {
            const globalY = startY + y;
            
            // Map image Y to Kernel Y
            const ky = globalY - kernelOffsetY;
            // Safety check for kernel bounds
            if (ky < 0 || ky >= kernel.size) continue;
            
            const kernelRowOffset = ky * kernel.size;
            const globalRowOffset = globalY * width;
            const destRowOffset = y * rectW;

            for (let x = 0; x < rectW; x++) {
                const globalX = startX + x;
                
                // Map image X to Kernel X
                const kx = globalX - kernelOffsetX;
                if (kx < 0 || kx >= kernel.size) continue;

                // Lookup influence from pre-calculated kernel
                const falloff = kernel.data[kernelRowOffset + kx];
                
                const destIdx = (destRowOffset + x) * 4;
                const globalIdx = (globalRowOffset + globalX) * 4;

                // Optimization: Skip pixels with zero or near-zero influence
                if (falloff > 0.001) {
                    const influence = falloff * (0.5 + density * 0.5) * pressure;
                    let sourceX = globalX;
                    let sourceY = globalY;

                    if (tool === 'warp') {
                        sourceX = globalX - (movementX * influence);
                        sourceY = globalY - (movementY * influence);
                    } 
                    else if (tool === 'bloat') {
                        // Bloat pushes away from center
                        const dx = globalX - centerX;
                        const dy = globalY - centerY;
                        const factor = 1.0 - (influence * 0.1); 
                        sourceX = centerX + dx * factor;
                        sourceY = centerY + dy * factor;
                    }
                    else if (tool === 'pucker') {
                        // Pucker pulls towards center
                        const dx = globalX - centerX;
                        const dy = globalY - centerY;
                        const factor = 1.0 + (influence * 0.1); 
                        sourceX = centerX + dx * factor;
                        sourceY = centerY + dy * factor;
                    }
                    else if (tool === 'reconstruct') {
                        // Blend current towards original
                        for (let c = 0; c < 4; c++) {
                            const currentVal = currentBuffer[globalIdx + c];
                            const originalVal = originalBuffer[globalIdx + c];
                            destBuffer[destIdx + c] = currentVal + (originalVal - currentVal) * (influence * 0.2);
                        }
                        continue;
                    }

                    // Resample color from calculated source position
                    destBuffer[destIdx] = bilinearSample(currentBuffer, width, height, sourceX, sourceY, 0);
                    destBuffer[destIdx + 1] = bilinearSample(currentBuffer, width, height, sourceX, sourceY, 1);
                    destBuffer[destIdx + 2] = bilinearSample(currentBuffer, width, height, sourceX, sourceY, 2);
                    destBuffer[destIdx + 3] = bilinearSample(currentBuffer, width, height, sourceX, sourceY, 3);
                } else {
                    // Copy directly if no influence
                    destBuffer[destIdx] = currentBuffer[globalIdx];
                    destBuffer[destIdx + 1] = currentBuffer[globalIdx + 1];
                    destBuffer[destIdx + 2] = currentBuffer[globalIdx + 2];
                    destBuffer[destIdx + 3] = currentBuffer[globalIdx + 3];
                }
            }
        }

        // Write back to canvas and update current buffer source
        const newImageData = new ImageData(destBuffer, rectW, rectH);
        ctx.putImageData(newImageData, startX, startY);

        // Update the main buffer for the next frame iteration
        // Using `set` is much faster than manual loop
        for (let y = 0; y < rectH; y++) {
            const rowOffsetGlobal = (startY + y) * width * 4;
            const rowOffsetLocal = y * rectW * 4;
            currentBuffer.set(
                destBuffer.subarray(rowOffsetLocal, rowOffsetLocal + rectW * 4), 
                rowOffsetGlobal + startX * 4
            );
        }
    };

    // The Render Loop
    const renderLoop = () => {
        const { isActive, currentPoint, lastRenderPoint, tool, params } = interactionRef.current;

        if (isActive && currentPoint) {
            const prev = lastRenderPoint || currentPoint;
            
            // Calculate distance to determine interpolation steps
            const dist = Math.hypot(currentPoint.x - prev.x, currentPoint.y - prev.y);
            
            // Interpolation density: Ensure we don't have gaps if mouse moves fast
            const stepSize = Math.max(1, params.brushSize * 0.15);
            const steps = Math.ceil(dist / stepSize);

            if (steps > 0 && tool === 'warp') {
                for (let i = 1; i <= steps; i++) {
                    const t = i / steps;
                    const x = prev.x + (currentPoint.x - prev.x) * t;
                    const y = prev.y + (currentPoint.y - prev.y) * t;
                    
                    const stepMoveX = (currentPoint.x - prev.x) / steps;
                    const stepMoveY = (currentPoint.y - prev.y) / steps;

                    processDistortion(x, y, stepMoveX, stepMoveY, tool, params);
                }
            } else if (tool !== 'warp') {
                // For bloat/pucker/reconstruct, apply at current position
                processDistortion(currentPoint.x, currentPoint.y, 0, 0, tool, params);
            }

            interactionRef.current.lastRenderPoint = { ...currentPoint };
        }

        if (interactionRef.current.isActive) {
            rafIdRef.current = requestAnimationFrame(renderLoop);
        }
    };

    // Public API for the Hook
    const startInteraction = (x: number, y: number, tool: LiquifyTool, params: LiquifyParams) => {
        interactionRef.current = {
            isActive: true,
            currentPoint: { x, y },
            lastRenderPoint: { x, y },
            tool,
            params
        };
        if (!rafIdRef.current) {
            renderLoop();
        }
    };

    const updateInteraction = (x: number, y: number) => {
        if (interactionRef.current.isActive) {
            interactionRef.current.currentPoint = { x, y };
        }
    };

    const stopInteraction = () => {
        interactionRef.current.isActive = false;
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
    };

    const reset = useCallback(() => {
        const { width, height, originalBuffer, ctx } = dataRef.current;
        if (!originalBuffer || !ctx) return;
        
        // Restore from original buffer
        const restoredData = new Uint8ClampedArray(originalBuffer);
        const newImageData = new ImageData(restoredData, width, height);
        
        ctx.putImageData(newImageData, 0, 0);
        dataRef.current.currentBuffer = newImageData.data; // Update current buffer ref
    }, []);

    const getDataUrl = () => canvasRef.current?.toDataURL();

    return {
        startInteraction,
        updateInteraction,
        stopInteraction,
        getDataUrl,
        reset
    };
};

// --- COMPONENT ---

export const ProgressiveSalienceScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage?: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(initialImage || null);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    
    // UI State
    const [activeTool, setActiveTool] = useState<LiquifyTool>('warp');
    const [brushSize, setBrushSize] = useState(150);
    const [pressure, setPressure] = useState(50); 
    const [density, setDensity] = useState(50);   
    const [zoom, setZoom] = useState(1);
    
    // Hand Tool / Pan State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isHandMode, setIsHandMode] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Refs for interaction handling
    const isPanning = useRef(false);
    const lastPanPos = useRef<{ x: number, y: number } | null>(null);
    const isLiquifying = useRef(false);

    // Hook
    const { startInteraction, updateInteraction, stopInteraction, getDataUrl, reset } = useLiquify(canvasRef, currentImage);

    // Effective Hand Tool active state
    const isHandActive = isHandMode || isSpacePressed;

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                setIsSpacePressed(true);
            }
            if (e.key.toLowerCase() === 'h') {
                e.preventDefault();
                setIsHandMode(prev => !prev);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') setIsSpacePressed(false);
        };
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        // Close menu on click
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('click', closeMenu);
        };
    }, []);

    // Initial Fit
    const fitImageToContainer = useCallback((imgUrl: string) => {
        const img = new Image();
        img.src = imgUrl;
        img.onload = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const padding = 40;
                // Calculate Scale
                const scale = Math.min((clientWidth - padding) / img.width, (clientHeight - padding) / img.height);
                setZoom(Math.max(scale, 0.1));
                
                // Calculate Center Position
                // With transform-origin: 0 0, we need to manually calculate the centered translation
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const centerX = (clientWidth - scaledWidth) / 2;
                const centerY = (clientHeight - scaledHeight) / 2;
                
                setPan({ x: centerX, y: centerY });
            }
        };
    }, []);

    useEffect(() => {
        if (initialImage) {
            imageUrlToBase64(initialImage).then(({ base64, mimeType }) => {
                const safeUrl = `data:${mimeType};base64,${base64}`;
                setOriginalImage(safeUrl);
                setCurrentImage(safeUrl);
                fitImageToContainer(safeUrl);
            }).catch(() => {
                setOriginalImage(initialImage);
                setCurrentImage(initialImage);
                fitImageToContainer(initialImage);
            });
        }
    }, [initialImage, fitImageToContainer]);

    // --- INTERACTION ---
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        
        // Panning Logic (Space or Hand Tool)
        if (isHandActive) {
            isPanning.current = true;
            lastPanPos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (!canvasRef.current) return;

        // Map screen coordinates to canvas image coordinates
        const rect = canvasRef.current.getBoundingClientRect();
        // Since transform origin is 0 0, finding coordinate is simpler relative to top-left of rect
        const scale = zoom; // Current zoom level IS the scale factor
        
        // Coordinates relative to the canvas element (unscaled)
        // e.clientX - rect.left gives pixel distance from left edge of visual element
        // dividing by scale gives internal canvas coordinate
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        
        // Start Liquify
        startInteraction(x, y, activeTool, {
            brushSize,
            pressure: pressure / 100,
            density: density / 100
        });
        isLiquifying.current = true;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        // Panning
        if (isPanning.current && lastPanPos.current) {
            const dx = e.clientX - lastPanPos.current.x;
            const dy = e.clientY - lastPanPos.current.y;
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
            lastPanPos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        // Liquify
        if (!isHandActive && canvasRef.current && isLiquifying.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const scale = zoom;
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;
            
            updateInteraction(x, y);
        }
    };

    const handleMouseUp = () => {
        isPanning.current = false;
        lastPanPos.current = null;
        stopInteraction();
        isLiquifying.current = false;
    };

    const handleMouseLeave = () => {
        isPanning.current = false;
        lastPanPos.current = null;
        stopInteraction();
        isLiquifying.current = false;
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isHandActive) {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
        }
    };

    // Zoom Handling
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const delta = -e.deltaY;
        const scaleFactor = 0.1;
        const newZoom = Math.max(0.1, Math.min(5, zoom + (delta > 0 ? scaleFactor : -scaleFactor)));
        
        if (newZoom === zoom) return;

        // Mouse-centered zoom logic
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;
            
            // Calculate new pan to keep mouse pointer fixed relative to image
            // Logic: (mouseX - panX) / oldZoom = (mouseX - newPanX) / newZoom
            // newPanX = mouseX - (mouseX - panX) * (newZoom / oldZoom)
            
            const scaleChange = newZoom / zoom;
            const newPanX = mouseX - (mouseX - pan.x) * scaleChange;
            const newPanY = mouseY - (mouseY - pan.y) * scaleChange;
            
            setPan({ x: newPanX, y: newPanY });
        }
        setZoom(newZoom);
    };

    const handleSave = () => {
        const newUrl = getDataUrl();
        if (newUrl) onEdit(newUrl);
    };

    const handleReset = () => {
        reset(); // Call the hook's reset function to restore pixel data
        if (originalImage) {
            fitImageToContainer(originalImage); // Re-center
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const url = ev.target?.result as string;
                setOriginalImage(url);
                setCurrentImage(url);
                fitImageToContainer(url);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#121212] text-white overflow-hidden">
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            
            <header className="flex-shrink-0 z-10 h-14 border-b border-white/5 bg-[#1a1a1a] flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <span className="font-bold text-sm tracking-wide">Ferramentas de Distorção Manual</span>
                </div>
                {currentImage && (
                    <button onClick={handleSave} className="px-4 py-1.5 text-xs font-bold bg-green-600 rounded hover:bg-green-500 flex items-center gap-2">
                        <Save size={14} /> Salvar Edição
                    </button>
                )}
            </header>

            <div className="flex-1 flex overflow-hidden">
                
                {/* 1. LEFT TOOLBAR */}
                <div className="w-16 bg-[#181818] border-r border-white/5 flex flex-col items-center py-4 gap-4 z-20 flex-shrink-0">
                    <button
                        onClick={() => setIsHandMode(!isHandMode)}
                        className={`group relative p-3 rounded-xl transition-all ${isHandActive ? 'bg-yellow-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title="Ferramenta Mão (H ou Espaço) - Arraste para mover"
                    >
                        <Hand size={22} />
                    </button>
                    <div className="w-8 h-px bg-white/10 my-1"></div>
                    <button
                        onClick={() => setActiveTool('warp')}
                        className={`group relative p-3 rounded-xl transition-all ${activeTool === 'warp' && !isHandActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title="Distorcer (Warp)"
                    >
                        <MousePointer2 size={22} />
                    </button>
                    <button
                        onClick={() => setActiveTool('bloat')}
                        className={`group relative p-3 rounded-xl transition-all ${activeTool === 'bloat' && !isHandActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title="Inflar (Bloat)"
                    >
                        <Maximize size={22} />
                    </button>
                    <button
                        onClick={() => setActiveTool('pucker')}
                        className={`group relative p-3 rounded-xl transition-all ${activeTool === 'pucker' && !isHandActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title="Enrugar (Pucker)"
                    >
                        <Minimize size={22} />
                    </button>
                    <button
                        onClick={() => setActiveTool('reconstruct')}
                        className={`group relative p-3 rounded-xl transition-all ${activeTool === 'reconstruct' && !isHandActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title="Reconstruir (Apagar)"
                    >
                        <Eraser size={22} />
                    </button>
                </div>

                {/* 2. MAIN CANVAS */}
                <div 
                    ref={containerRef} 
                    className={`flex-1 relative bg-[#0a0a0a] overflow-hidden ${isHandActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-none'}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onWheel={handleWheel}
                    onContextMenu={handleContextMenu}
                >
                    {currentImage ? (
                        <canvas
                            ref={canvasRef}
                            className="absolute shadow-2xl border border-white/5"
                            style={{ 
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
                                transformOrigin: '0 0', 
                                transition: isPanning.current ? 'none' : 'transform 0.05s ease-out',
                                cursor: isHandActive ? 'inherit' : 'none'
                            }}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-8 border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                                <MousePointer2 size={32} className="text-blue-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold mb-2">Liquify Studio</h3>
                                <button onClick={() => inputRef.current?.click()} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold mt-4 text-sm">
                                    Carregar Foto
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Visual Brush Cursor (CSS based) */}
                    {currentImage && !isHandActive && (
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
                            <button 
                                onClick={() => { fitImageToContainer(currentImage || ''); setContextMenu(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white"
                            >
                                Ajustar à Tela
                            </button>
                            <button 
                                onClick={() => { setZoom(1); setContextMenu(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white"
                            >
                                100%
                            </button>
                        </div>
                    )}
                </div>

                {/* 3. RIGHT SIDEBAR (Properties) */}
                <div className="w-72 bg-[#1a1a1a] border-l border-white/5 flex flex-col p-5 overflow-y-auto z-20 flex-shrink-0">
                    <div className="mb-6">
                        <h3 className="font-bold text-sm uppercase tracking-wide text-blue-400 mb-1 flex items-center gap-2">
                            {activeTool === 'warp' && <MousePointer2 size={16}/>}
                            {activeTool === 'bloat' && <Maximize size={16}/>}
                            {activeTool === 'pucker' && <Minimize size={16}/>}
                            {activeTool === 'reconstruct' && <Eraser size={16}/>}
                            
                            {activeTool === 'warp' && 'Distorcer'}
                            {activeTool === 'bloat' && 'Inflar'}
                            {activeTool === 'pucker' && 'Enrugar'}
                            {activeTool === 'reconstruct' && 'Reconstruir'}
                        </h3>
                        <p className="text-[10px] text-gray-500">
                            {activeTool === 'warp' && 'Empurre os pixels como se fossem líquidos.'}
                            {activeTool === 'bloat' && 'Expanda a área do centro para fora.'}
                            {activeTool === 'pucker' && 'Puxe a área em direção ao centro.'}
                            {activeTool === 'reconstruct' && 'Restaure a imagem original gradualmente.'}
                        </p>
                    </div>

                    <div className="space-y-6 flex-1">
                        {/* Brush Size */}
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-gray-300">Tamanho</label>
                                <span className="text-xs font-mono text-gray-500">{brushSize}px</span>
                            </div>
                            <input 
                                type="range" min="10" max="500" value={brushSize} 
                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        {/* Pressure */}
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-gray-300">Pressão</label>
                                <span className="text-xs font-mono text-gray-500">{pressure}%</span>
                            </div>
                            <input 
                                type="range" min="1" max="100" value={pressure} 
                                onChange={(e) => setPressure(Number(e.target.value))}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        {/* Density (Hardness) */}
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-gray-300">Densidade (Borda)</label>
                                <span className="text-xs font-mono text-gray-500">{density}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="100" value={density} 
                                onChange={(e) => setDensity(Number(e.target.value))}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        <div className="mt-auto pt-6 border-t border-white/5">
                            <button 
                                onClick={handleReset}
                                className="w-full py-2.5 text-xs text-gray-400 hover:text-white flex items-center justify-center gap-2 border border-white/5 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <RotateCcw size={14} /> Restaurar Original
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
