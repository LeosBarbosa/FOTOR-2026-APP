
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Download, History, Edit, Sparkles, Wand2, ShieldCheck, Zap, Info, RotateCcw, Undo2, Check } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const sampleImages = [
    { name: 'Retrato 1920', url: 'https://storage.googleapis.com/aistudio-project-files/89c17245-0925-4632-a550-985c7d2429a3/e00665f8-5807-4b77-929c-6a16f22e841d' },
    { name: 'Família Vintage', url: 'https://storage.googleapis.com/aistudio-project-files/89c17245-0925-4632-a550-985c7d2429a3/5668e219-417c-47a3-863a-2321c172088f' },
];

const ImageCompare: React.FC<{ before: string; after: string }> = ({ before, after }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const handleMove = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        setSliderPos((x / rect.width) * 100);
    };

    return (
        <div 
            ref={containerRef} 
            className="relative w-full h-full select-none cursor-ew-resize overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-[#0a0a0a]"
            onMouseMove={(e) => handleMove(e.clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        >
            <img src={after} alt="Atual" className="absolute inset-0 w-full h-full object-contain" />
            <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={before} alt="Original" className="absolute inset-0 w-full h-full object-contain brightness-75" />
            </div>
            <div className="absolute top-0 bottom-0 bg-white/80 w-0.5" style={{ left: `calc(${sliderPos}% - 0.25px)` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -left-5 w-10 h-10 rounded-full bg-white shadow-xl grid place-items-center text-gray-800 backdrop-blur-md">
                    <History size={20} />
                </div>
            </div>
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/70 border border-white/10">Original</div>
            <div className="absolute top-4 right-4 bg-blue-600/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white border border-white/10">Melhorada</div>
        </div>
    );
};

const ToolButton: React.FC<{ 
    label: string; 
    description: string;
    onClick: () => void;
    icon: React.ElementType;
    isLoading: boolean;
    disabled: boolean;
    applied: boolean;
}> = ({ label, description, onClick, icon: Icon, isLoading, disabled, applied }) => (
    <button 
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`flex flex-col items-center gap-2 p-3 rounded-2xl text-center transition-all border duration-300 group min-w-[100px] ${
            applied 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
        } disabled:opacity-30`}
    >
        <div className={`p-3 rounded-xl transition-all ${
            isLoading ? 'animate-pulse bg-blue-500 text-white' : 
            applied ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-400 group-hover:text-white'
        }`}>
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icon size={20} />}
        </div>
        <div className="hidden md:block">
            <p className={`text-[11px] font-black uppercase tracking-tighter ${applied ? 'text-green-400' : 'text-white'}`}>{label}</p>
            <p className="text-[9px] text-gray-500 font-medium leading-tight">{description}</p>
        </div>
        {applied && !isLoading && <Check size={12} className="text-green-500 mt-1" />}
    </button>
);

export const OldPhotoRestorerScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage?: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    // States for Sequential Processing
    const [baseOriginal, setBaseOriginal] = useState<string | null>(initialImage || null);
    const [workingImage, setWorkingImage] = useState<string | null>(initialImage || null);
    const [history, setHistory] = useState<string[]>([]); // Undo stack
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const [appliedSteps, setAppliedSteps] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialImage && !baseOriginal) {
            setBaseOriginal(initialImage);
            setWorkingImage(initialImage);
        }
    }, [initialImage]);

    const applyEnhancement = async (toolId: string, prompt: string) => {
        if (!workingImage) return;

        setActiveTool(toolId);
        setIsProcessing(true);
        setError(null);

        try {
            const { base64, mimeType } = await imageUrlToBase64(workingImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { 
                  parts: [
                      { inlineData: { data: base64, mimeType } }, 
                      { text: `Task: ${prompt} \nMaintain all previous details and colors if present. Output high-fidelity 4K result.` }
                  ] 
              },
              config: { responseModalities: [Modality.IMAGE] },
            });
            
            const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
            if (part?.inlineData) {
                const resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                setHistory(prev => [...prev, workingImage]); // Push current to undo history
                setWorkingImage(resultUrl);
                setAppliedSteps(prev => new Set(prev).add(toolId));
            } else {
                const text = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
                throw new Error(text || "A IA não conseguiu aplicar este aprimoramento.");
            }
        } catch (err: any) {
            console.error(`Erro ao aplicar ${toolId}:`, err);
            setError(err.message || "Erro no processamento.");
        } finally {
            setIsProcessing(false);
            setActiveTool(null);
        }
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setWorkingImage(previous);
        setHistory(prev => prev.slice(0, -1));
        // Reset applied flags - simple version: just clear all or keep track better
        setAppliedSteps(new Set()); 
    };

    const handleResetAll = () => {
        if (!baseOriginal || !window.confirm("Deseja voltar para a foto original e perder todas as melhorias?")) return;
        setWorkingImage(baseOriginal);
        setHistory([]);
        setAppliedSteps(new Set());
    };

    const handleDownload = () => {
        if (!workingImage) return;
        const link = document.createElement('a');
        link.href = workingImage;
        link.download = `restaurada-pro-sequencial-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#080808] text-white overflow-hidden">
            <input type="file" ref={inputRef} onChange={(e) => {
                if (e.target.files?.[0]) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const url = ev.target?.result as string;
                        setBaseOriginal(url);
                        setWorkingImage(url);
                        setHistory([]);
                        setAppliedSteps(new Set());
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            }} className="hidden" accept="image/*" />
            
            <header className="flex-shrink-0 z-10 px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-xl">
                <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="font-bold text-base flex items-center gap-2">
                                <History size={18} className="text-blue-400" />
                                Estúdio de Restauração Pro
                            </h1>
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Fluxo Sequencial Gemini 2.5</p>
                        </div>
                    </div>
                    {workingImage !== baseOriginal && (
                        <div className="flex items-center gap-3">
                             <button onClick={handleUndo} disabled={isProcessing || history.length === 0} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all border border-white/5" title="Desfazer">
                                <Undo2 size={18} />
                            </button>
                             <button onClick={handleResetAll} disabled={isProcessing} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20" title="Reiniciar">
                                <RotateCcw size={18} />
                            </button>
                             <button onClick={handleDownload} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-blue-500 transition-all flex items-center gap-2 text-xs shadow-lg shadow-blue-900/20">
                                <Download size={16} /> Baixar
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 relative">
                {workingImage && baseOriginal ? (
                    <div className="w-full h-full flex flex-col max-w-6xl mx-auto">
                        <div className="flex-1 min-h-0">
                             <ImageCompare before={baseOriginal} after={workingImage} />
                        </div>
                    </div>
                ) : (
                    <div className="text-center max-w-xl px-4 animate-in fade-in zoom-in duration-500">
                       <div className="w-24 h-24 bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 text-blue-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 ring-1 ring-white/10 shadow-2xl">
                            <History size={48} />
                       </div>
                        <h2 className="text-4xl font-black mb-4 tracking-tighter text-white uppercase italic">Sequência de Restauração</h2>
                        <p className="text-gray-400 text-base mb-12 leading-relaxed font-medium">
                            Melhore sua foto passo a passo. Aplique cores, restaure rostos e adicione nitidez de forma controlada e profissional.
                        </p>
                        <button onClick={() => inputRef.current?.click()} className="bg-white text-black font-black uppercase text-sm tracking-widest py-5 px-14 rounded-full flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] mx-auto">
                            <Upload size={20} /> Começar Restauração
                        </button>
                        
                        <div className="mt-16 pt-8 border-t border-white/5">
                             <div className="flex justify-center gap-8">
                                {sampleImages.map((img) => (
                                    <div key={img.name} onClick={() => { setBaseOriginal(img.url); setWorkingImage(img.url); }} className="cursor-pointer group flex flex-col items-center">
                                        <div className="w-28 h-36 rounded-2xl overflow-hidden ring-1 ring-white/10 group-hover:ring-blue-500 transition-all group-hover:-translate-y-2 shadow-2xl">
                                            <img src={img.url} alt={img.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" loading="lazy" />
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-500 mt-4 group-hover:text-blue-400 uppercase tracking-widest transition-colors">{img.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
            
            <footer className="flex-shrink-0 z-10 p-6 border-t border-white/5 bg-black/60 backdrop-blur-2xl">
                {error && (
                    <div className="max-w-xl mx-auto mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center justify-center gap-3 animate-in slide-in-from-bottom-2">
                        <Info size={16} className="text-red-400" />
                        <span className="text-xs text-red-200 font-medium">{error}</span>
                    </div>
                )}
                
                {workingImage && (
                    <div className="max-w-5xl mx-auto flex flex-col gap-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <ToolButton 
                                label="Auto Limpeza" 
                                description="Remove rasgos e poeira"
                                onClick={() => applyEnhancement('clean', 'Professionally restore this old photo. Remove all scratches, dust, folds, and mold damage while preserving original texture.')}
                                icon={ShieldCheck}
                                isLoading={activeTool === 'clean'}
                                disabled={isProcessing}
                                applied={appliedSteps.has('clean')}
                            />
                            <ToolButton 
                                label="Colorizar" 
                                description="Restaura cores vivas"
                                onClick={() => applyEnhancement('color', 'Apply realistic and historically accurate color to this image. Keep skin tones natural.')}
                                icon={Sparkles}
                                isLoading={activeTool === 'color'}
                                disabled={isProcessing}
                                applied={appliedSteps.has('color')}
                            />
                            <ToolButton 
                                label="Rostos HD" 
                                description="Reconstrói feições"
                                onClick={() => applyEnhancement('faces', 'Identify and reconstruct all human faces with high definition. Sharpen eyes, lips and skin texture.')}
                                icon={Wand2}
                                isLoading={activeTool === 'faces'}
                                disabled={isProcessing}
                                applied={appliedSteps.has('faces')}
                            />
                            <ToolButton 
                                label="Remover Ruído" 
                                description="Limpa granulação"
                                onClick={() => applyEnhancement('noise', 'Denoise the image perfectly. Eliminate grain without losing professional detail.')}
                                icon={Zap}
                                isLoading={activeTool === 'noise'}
                                disabled={isProcessing}
                                applied={appliedSteps.has('noise')}
                            />
                            <ToolButton 
                                label="Ultra Nitidez" 
                                description="Qualidade 4K final"
                                onClick={() => applyEnhancement('sharpen', 'Apply high-end professional sharpening and contrast adjustment for 4K clarity.')}
                                icon={Zap}
                                isLoading={activeTool === 'sharpen'}
                                disabled={isProcessing}
                                applied={appliedSteps.has('sharpen')}
                            />
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
};
