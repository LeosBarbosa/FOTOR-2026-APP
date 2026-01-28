
import React, { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { Header } from './EditorScreen';
import { SideNav } from './SideNav';
import { UploaderScreen } from './UploaderScreen';
import { BottomToolbar } from './ProcessingModal';
import { NavItemId, CanvasElementData } from '../types';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';
import { TopToolbar } from './TopToolbar';
import { ImageCompareSlider } from './ImageCompareSlider';
import { useEditor } from '../contexts/EditorContext';
import { CanvasElement } from './canvas/CanvasElement';
import { CropOverlay } from './canvas/CropOverlay';
import { GlobalSearch } from './GlobalSearch';

// --- Lazy Load Panels for Code Splitting ---
const EffectsPanel = React.lazy(() => import('./LeftSidebar').then(module => ({ default: module.EffectsPanel })));
const ToolsPanel = React.lazy(() => import('./ToolsPanel').then(module => ({ default: module.ToolsPanel })));
const AdjustPanel = React.lazy(() => import('./AdjustPanel').then(module => ({ default: module.AdjustPanel })));
const BeautyPanel = React.lazy(() => import('./BeautyPanel').then(module => ({ default: module.BeautyPanel })));
const TextPanel = React.lazy(() => import('./TextPanel').then(module => ({ default: module.TextPanel })));
const ElementsPanel = React.lazy(() => import('./ElementsPanel').then(module => ({ default: module.ElementsPanel })));
const AiAgeChangerPanel = React.lazy(() => import('./AiAgeChangerPanel').then(module => ({ default: module.AiAgeChangerPanel })));
const FramePanel = React.lazy(() => import('./FramePanel').then(module => ({ default: module.FramePanel })));
const HslPanel = React.lazy(() => import('./HslPanel').then(module => ({ default: module.HslPanel })));
const FaceEnhancePanel = React.lazy(() => import('./FaceEnhancePanel').then(module => ({ default: module.FaceEnhancePanel })));

// --- MAIN COMPONENT ---
interface EditorInterfaceProps {
    onToolSelect: (toolId: string, image: string | null) => void;
    initialImage: string | null;
    onClearInitialImage: () => void;
}

export const EditorInterface: React.FC<EditorInterfaceProps> = ({ onToolSelect, initialImage, onClearInitialImage }) => {
    // Consuming EditorContext
    const { image, setImage, history, addToHistory, undo, redo, canUndo, canRedo, originalImage, setOriginalImage, resetToOriginal, loadImage } = useEditor();
    
    // Local UI state
    const [activeNav, setActiveNav] = useState<NavItemId>('ferramentas');
    const [activeSubTool, setActiveSubTool] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [layoutMode, setLayoutMode] = useState<'overlay' | 'split'>('overlay');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Canvas and Zoom State
    const [zoomLevel, setZoomLevel] = useState(1);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Hand Tool State
    const [isHandToolMode, setIsHandToolMode] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    // CSS Filters and Adjustments State
    const [tempCssFilter, setTempCssFilter] = useState<string | null>(null);
    const [appliedCssFilter, setAppliedCssFilter] = useState<string | null>(null);
    const [rotation, setRotation] = useState(0);
    const [flip, setFlip] = useState({ horizontal: 1, vertical: 1 });
    const [adjustments, setAdjustments] = useState({ brightness: 100, contrast: 100, saturate: 100, sharpness: 100, hue: 0 });
    
    // Canvas Elements State
    const [elements, setElements] = useState<CanvasElementData[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
    const nextElementId = useRef(1);

    // Frame State
    const [frameStyle, setFrameStyle] = useState<React.CSSProperties>({});
    
    // Cropping State
    const [isCropping, setIsCropping] = useState(false);
    const [cropBox, setCropBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

    // View State
    const [isCompareViewActive, setIsCompareViewActive] = useState(false);

    // Effective Hand Tool State (Either selected or Spacebar held)
    const isHandActive = isHandToolMode || isSpacePressed;

    useEffect(() => {
        if(initialImage && initialImage !== image) {
             if (history.length === 0) {
                 loadImage(initialImage);
             } else {
                 addToHistory(initialImage);
             }
             onClearInitialImage();
        }
    }, [initialImage, image, onClearInitialImage, loadImage, addToHistory, history.length]);

    // Handle Keyboard Shortcuts (Spacebar & H)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
                return;
            }

            // Hand Tool Shortcuts
            if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault();
                setIsSpacePressed(true);
            }
            if (e.key.toLowerCase() === 'h' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault();
                setIsHandToolMode(prev => !prev);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Close Context Menu on click
    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const fitZoom = useCallback(() => {
        if (!imageRef.current || !canvasContainerRef.current) return;
        const img = imageRef.current;
        const container = canvasContainerRef.current;
    
        if (img.naturalWidth === 0 || img.naturalHeight === 0 || container.clientWidth === 0 || container.clientHeight === 0) {
            return;
        }
    
        const padding = 20; // Slight padding for better aesthetics
        const availableWidth = container.clientWidth - padding * 2;
        const availableHeight = container.clientHeight - padding * 2;

        const scaleX = availableWidth / img.naturalWidth;
        const scaleY = availableHeight / img.naturalHeight;
        
        // Ensure it fits within the window (contain)
        const newZoom = Math.min(scaleX, scaleY);
        
        setZoomLevel(newZoom);
        
        const scaledWidth = img.naturalWidth * newZoom;
        const scaledHeight = img.naturalHeight * newZoom;
        
        const centerX = (container.clientWidth - scaledWidth) / 2;
        const centerY = (container.clientHeight - scaledHeight) / 2;
        
        setPan({ x: centerX, y: centerY });
    }, []);

    useEffect(() => {
        window.addEventListener('resize', fitZoom);
        return () => {
            window.removeEventListener('resize', fitZoom);
        };
    }, [fitZoom]);

    useEffect(() => {
        // Trigger fitZoom when sidebar opens/closes, layout changes, or tab changes (e.g. 'Adjust')
        // Using a timeout to wait for CSS transitions
        const timer = setTimeout(() => {
            fitZoom();
        }, 350); 
        return () => clearTimeout(timer);
    }, [isSidebarOpen, layoutMode, activeNav, activeSubTool, fitZoom, image]);

    // --- Pan & Zoom Handlers ---
    const handleWheelZoom = (e: React.WheelEvent) => {
        if (isCropping) return;
        e.preventDefault();
        e.stopPropagation();

        const delta = -e.deltaY;
        const scaleMultiplier = 0.1;
        const newZoom = Math.max(0.1, Math.min(10, zoomLevel + (delta > 0 ? scaleMultiplier : -scaleMultiplier)));
        
        if (newZoom === zoomLevel) return;

        const containerRect = canvasContainerRef.current?.getBoundingClientRect();
        if (containerRect) {
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;
            
            // Adjust pan to zoom towards mouse
            const scaleChange = newZoom / zoomLevel;
            const newPanX = mouseX - (mouseX - pan.x) * scaleChange;
            const newPanY = mouseY - (mouseY - pan.y) * scaleChange;
            
            setPan({ x: newPanX, y: newPanY });
        }
        
        setZoomLevel(newZoom);
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (isCropping) return;
        
        // Panning Logic (Spacebar or Hand Tool)
        if (isHandActive) {
            isPanning.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
            return;
        }

        // Standard Interaction (Deselect elements if background clicked)
        if (selectedElementId !== null) {
            setSelectedElementId(null);
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (isPanning.current) {
            e.preventDefault();
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        }
    };

    const handleCanvasMouseUp = () => {
        isPanning.current = false;
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isHandActive) {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
        }
    };

    // --- Crop Handlers ---
    const handleCropStart = () => {
        if (!imageRef.current) return;
        setIsCropping(true);
        setCropBox({
            x: 0,
            y: 0,
            width: imageRef.current.naturalWidth,
            height: imageRef.current.naturalHeight,
        });
    };

    const handleCropCancel = () => {
        setIsCropping(false);
        setCropBox(null);
    };
    
    const handleCropApply = () => {
        if (!image || !cropBox || !imageRef.current) return;
    
        const sourceImage = new Image();
        sourceImage.src = image; 
        sourceImage.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = cropBox.width;
            canvas.height = cropBox.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
        
            ctx.drawImage(
                sourceImage,
                cropBox.x, cropBox.y, cropBox.width, cropBox.height,
                0, 0, cropBox.width, cropBox.height
            );
            
            canvas.toBlob((blob) => {
                if(blob) {
                     const croppedDataUrl = URL.createObjectURL(blob);
                     addToHistory(croppedDataUrl);
                }
            }, 'image/png');
            
            handleCropCancel();
            setActiveNav('ferramentas');
            setTimeout(() => setActiveNav('ajustar'), 10);
        };
    };

    // Handlers for panels
    const handleRotate = (deg: number) => setRotation(r => r + deg);
    const handleFlip = (axis: 'horizontal' | 'vertical') => setFlip(f => ({ ...f, [axis]: f[axis] * -1 }));
    const handleAdjustmentChange = (adj: keyof typeof adjustments, value: number) => setAdjustments(a => ({ ...a, [adj]: value }));
    const handleAllAdjustmentsReset = () => {
        setRotation(0);
        setFlip({ horizontal: 1, vertical: 1 });
        setAdjustments({ brightness: 100, contrast: 100, saturate: 100, sharpness: 100, hue: 0 });
    };
    const handleImageSelect = (imageUrl: string) => {
        loadImage(imageUrl);
        setAppliedCssFilter(null);
        setTempCssFilter(null);
        setRotation(0);
        setFlip({ horizontal: 1, vertical: 1 });
        setAdjustments({ brightness: 100, contrast: 100, saturate: 100, sharpness: 100, hue: 0 });
        setElements([]);
        setSelectedElementId(null);
        setFrameStyle({});
    };

    const handleCrop = () => {
        setActiveNav('ajustar');
        setIsSidebarOpen(true);
    };
    
    const handleAddElement = (type: 'text' | 'emoji' | 'shape', content: string, options?: Partial<CanvasElementData>) => {
        const newElement: CanvasElementData = {
            id: nextElementId.current++,
            type,
            content,
            x: 50,
            y: 50,
            width: type === 'text' ? 200 : 100,
            height: type === 'text' ? 50 : 100,
            rotation: 0,
            ...options,
        };
        setElements(e => [...e, newElement]);
        setSelectedElementId(newElement.id);
    };
    
    const handleUpdateElement = (id: number, updates: Partial<CanvasElementData>) => {
        setElements(elements => elements.map(el => el.id === id ? { ...el, ...updates } : el));
    };

    const handleDeleteElement = (id: number) => {
        setElements(elements => elements.filter(el => el.id !== id));
        setSelectedElementId(null);
    };

    const handleReorderElement = (id: number, direction: 'front' | 'back' | 'forward' | 'backward') => {
        setElements(currentElements => {
            const index = currentElements.findIndex(el => el.id === id);
            if (index === -1) return currentElements;

            const newElements = [...currentElements];
            const [item] = newElements.splice(index, 1);

            if (direction === 'front') {
                newElements.push(item);
            } else if (direction === 'back') {
                newElements.unshift(item);
            } else if (direction === 'forward') {
                newElements.splice(Math.min(index + 1, newElements.length), 0, item);
            } else if (direction === 'backward') {
                newElements.splice(Math.max(index - 1, 0), 0, item);
            }
            
            return newElements;
        });
    };

    const handleMagicEnhance = async () => {
        if (!image) return;
        setIsProcessing(true);
        try {
            const { base64, mimeType } = await imageUrlToBase64(image);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Aplique um aprimoramento sutil à imagem para melhorar a qualidade geral, focando no brilho, contraste e equilíbrio de cores. Mantenha a aparência natural e profissional.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const candidate = response.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            let imageFound = false;

            for (const part of parts) {
                if (part.inlineData) {
                    const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    addToHistory(imageUrl);
                    imageFound = true;
                    break;
                }
            }
            if (!imageFound) {
                 const textResponse = candidate?.content?.parts?.[0]?.text;
                 if (textResponse) {
                     console.warn("A IA não gerou a imagem. Resposta: ", textResponse);
                 }
            }

        } catch (error) {
            console.error("Magic enhance failed", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNavSelect = (id: NavItemId) => {
      if (activeNav === id && isSidebarOpen) {
        setIsSidebarOpen(false);
      } else {
        setActiveNav(id);
        setActiveSubTool(null);
        setIsSidebarOpen(true);
      }
    };
    
    const handleLayoutToggle = () => {
        setLayoutMode(prev => (prev === 'overlay' ? 'split' : 'overlay'));
    };

    const handleSearchSelect = (item: { id: string; type: 'tool' | 'nav' }) => {
        if (item.type === 'tool') {
            onToolSelect(item.id, image);
            const internalPanelTools = ['ai-age-changer', 'ai-face-enhance'];
            if (internalPanelTools.includes(item.id)) {
                if (item.id === 'ai-age-changer' || item.id === 'ai-face-enhance') {
                     setActiveNav('beleza');
                     setActiveSubTool(item.id);
                     setIsSidebarOpen(true);
                }
            }
        } else if (item.type === 'nav') {
            setActiveNav(item.id as NavItemId);
            setActiveSubTool(null);
            setIsSidebarOpen(true);
        }
    };

    const panelComponents: { [key in NavItemId]?: React.ReactNode } & { [key: string]: React.ReactNode } = {
        'ferramentas': <ToolsPanel onToolSelect={(toolId) => onToolSelect(toolId, image)} />,
        'efeitos': <EffectsPanel image={image} setImage={addToHistory} setTempFilter={setTempCssFilter} setAppliedCssFilter={setAppliedCssFilter} />,
        'ajustar': <AdjustPanel onRotate={handleRotate} onFlip={handleFlip} adjustments={adjustments} onAdjustmentChange={handleAdjustmentChange} onAllAdjustmentsReset={handleAllAdjustmentsReset} image={image} onApply={addToHistory} onCropStart={handleCropStart} onCropApply={handleCropApply} onCropCancel={handleCropCancel} onMagicEnhance={handleMagicEnhance} />,
        'beleza': <BeautyPanel onSelectSubTool={setActiveSubTool} onToolSelect={(toolId) => onToolSelect(toolId, image)} />,
        'texto': <TextPanel onAddText={(opts) => handleAddElement('text', 'Adicionar texto', opts)} selectedElement={elements.find(e => e.id === selectedElementId) || null} onUpdateElement={handleUpdateElement} />,
        'elementos': <ElementsPanel onElementSelect={(opts) => handleAddElement(opts.type, opts.content)} elements={elements} selectedElementId={selectedElementId} onLayerSelect={setSelectedElementId} onReorder={handleReorderElement} />,
        'quadros': <FramePanel onSelectFrame={setFrameStyle} />,
        'ai-age-changer': <AiAgeChangerPanel onBack={() => setActiveSubTool(null)} image={image} onApply={addToHistory} />,
        'ai-face-enhance': <FaceEnhancePanel onBack={() => setActiveSubTool(null)} image={image} onApply={addToHistory} />,
    };

    if (!image) {
        return <UploaderScreen onImageSelect={handleImageSelect} />;
    }

    const activePanel = activeSubTool ? panelComponents[activeSubTool] : panelComponents[activeNav];
    const panelMaxWidth = activeNav === 'ferramentas' ? 'sm:w-96' : 'sm:w-80';
    const panelWidthClass = isSidebarOpen ? `w-full ${panelMaxWidth}` : 'w-0';

    const filterString = [
        `brightness(${adjustments.brightness}%)`,
        `contrast(${adjustments.contrast}%)`,
        `saturate(${adjustments.saturate}%)`,
        `hue-rotate(${adjustments.hue}deg)`,
        tempCssFilter || appliedCssFilter || ''
    ].filter(Boolean).join(' ');

    const imageStyle: React.CSSProperties = {
        transform: `rotate(${rotation}deg) scaleX(${flip.horizontal}) scaleY(${flip.vertical})`,
        filter: filterString,
        maxWidth: 'none',
        maxHeight: 'none',
        display: 'block',
    };

    return (
        <div className="flex flex-col h-screen w-screen text-white bg-[#1F1F1F] overflow-hidden">
             <GlobalSearch 
                isOpen={isSearchOpen} 
                onClose={() => setIsSearchOpen(false)} 
                onSelect={handleSearchSelect}
            />
             {isProcessing && (
                <div className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center text-center p-4">
                    <svg className="w-16 h-16 animate-spin text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h3 className="text-white font-semibold text-lg">Aprimorando imagem...</h3>
                    <p className="text-gray-300 text-sm mt-1">Aguarde um momento.</p>
                </div>
            )}
            <Header 
                onUploadClick={() => document.getElementById('file-upload-input')?.click()} 
                onDownloadClick={() => {}} 
                onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                layoutMode={layoutMode}
                onLayoutToggle={handleLayoutToggle}
                onSearchClick={() => setIsSearchOpen(true)}
            />
            <div className="flex-1 overflow-hidden flex flex-row relative">
                
                {/* 1. SideNav */}
                <div className="flex-shrink-0 z-30 h-full bg-[#212121]/95 border-r border-white/5 shadow-xl">
                     <SideNav activeNav={activeNav} setActiveNav={handleNavSelect} />
                </div>

                {/* 2. Sliding Panel */}
                <aside 
                    className={`
                        h-full bg-[#2c2c2c] overflow-hidden transition-[width,opacity] duration-300 ease-in-out z-20
                        ${layoutMode === 'overlay' ? 'absolute left-20 shadow-2xl h-full' : 'relative flex-shrink-0'}
                        ${panelWidthClass}
                        ${!isSidebarOpen && layoutMode === 'overlay' ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                    `}
                >
                    <div className="w-full h-full min-w-[20rem]">
                        <Suspense fallback={<div className="w-full h-full bg-[#2c2c2c] animate-pulse"></div>}>
                            {activePanel}
                        </Suspense>
                    </div>
                </aside>
                
                {/* 3. Main Content Area */}
                <main className="flex-1 flex flex-col min-w-0 bg-[#f0f2f5] relative z-10 transition-all duration-300">
                    <TopToolbar
                        onCrop={handleCrop}
                        onRotate={handleRotate}
                        onFlip={handleFlip}
                        onToggleCompare={() => setIsCompareViewActive(p => !p)}
                        isCompareActive={isCompareViewActive}
                        onHandToolToggle={() => setIsHandToolMode(!isHandToolMode)}
                        isHandToolActive={isHandToolMode}
                        onFitScreen={fitZoom}
                    />
                    <div 
                        ref={canvasContainerRef} 
                        className={`flex-1 overflow-hidden relative bg-[#333] ${isHandActive ? (isPanning.current ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
                        onWheel={handleWheelZoom}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        onContextMenu={handleContextMenu}
                    >
                         <div 
                            className="absolute top-0 left-0 transition-transform duration-75 ease-out origin-top-left" 
                            style={{ 
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`, 
                                transformOrigin: '0 0'
                            }}
                        >
                            {isCompareViewActive && originalImage ? (
                                <ImageCompareSlider
                                    beforeSrc={originalImage}
                                    afterSrc={image}
                                    afterStyle={imageStyle}
                                    onLoad={fitZoom}
                                />
                            ) : (
                                <img ref={imageRef} src={image} alt="Edit" className="block shadow-lg pointer-events-none select-none" style={imageStyle} onLoad={fitZoom} />
                            )}
                             {elements.map(el => (
                                <CanvasElement 
                                    key={el.id} 
                                    element={el} 
                                    onUpdate={handleUpdateElement} 
                                    onDelete={handleDeleteElement}
                                    zoomLevel={zoomLevel}
                                    isSelected={selectedElementId === el.id}
                                    onSelect={() => setSelectedElementId(el.id)}
                                />
                            ))}
                        </div>
                         {isCropping && cropBox && (
                            <CropOverlay 
                                imageRef={imageRef}
                                cropBox={cropBox}
                                setCropBox={setCropBox}
                            />
                        )}
                        
                        {/* Context Menu for Hand Tool */}
                        {contextMenu && (
                            <div 
                                className="absolute bg-[#2c2c2c] border border-gray-600 rounded-md shadow-xl py-1 z-50 min-w-[150px]"
                                style={{ top: contextMenu.y, left: contextMenu.x }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button 
                                    onClick={() => { fitZoom(); setContextMenu(null); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white"
                                >
                                    Ajustar à Tela
                                </button>
                                <button 
                                    onClick={() => { setZoomLevel(1); setContextMenu(null); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white"
                                >
                                    100%
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <BottomToolbar
                        zoomLevel={zoomLevel}
                        onZoomIn={() => setZoomLevel(z => Math.min(5, z + 0.1))}
                        onZoomOut={() => setZoomLevel(z => Math.max(0.1, z - 0.1))}
                        onZoomFit={fitZoom}
                        onZoomReset={() => setZoomLevel(1)}
                        onZoomChange={setZoomLevel}
                        onRevertToOriginal={resetToOriginal}
                        isRevertable={image !== originalImage}
                        onUndo={undo}
                        onRedo={redo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                    />
                </main>
            </div>
        </div>
    );
};
