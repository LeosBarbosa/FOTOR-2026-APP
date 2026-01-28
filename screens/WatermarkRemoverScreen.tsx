
import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Download, Sparkles, Edit, ShieldCheck } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const sampleImages = [
    { name: 'Documento', url: 'https://storage.googleapis.com/aistudio-project-files/89c17245-0925-4632-a550-985c7d2429a3/78b9e697-3f81-4321-8255-a0c0b1351d18' },
    { name: 'Stock Photo', url: 'https://storage.googleapis.com/aistudio-project-files/89c17245-0925-4632-a550-985c7d2429a3/45500d0f-48e8-4623-8686-22a84e62a937' },
];

const ImageCompare: React.FC<{ before: string; after: string }> = ({ before, after }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    const handleMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        setSliderPos((x / rect.width) * 100);
    };
    return (
        <div ref={containerRef} className="relative w-full h-full select-none cursor-ew-resize" onMouseMove={handleMove}>
            <img src={after} alt="Depois" className="absolute inset-0 w-full h-full object-contain" />
            <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={before} alt="Antes" className="absolute inset-0 w-full h-full object-contain" />
            </div>
            <div className="absolute top-0 bottom-0 bg-white w-1" style={{ left: `calc(${sliderPos}% - 0.5px)` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 rounded-full bg-white shadow-lg grid place-items-center text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                </div>
            </div>
        </div>
    );
};

export const WatermarkRemoverScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; }> = ({ onBack, onEdit }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleProcess = async (imageUrl: string) => {
        if (!imageUrl) return;

        setIsProcessing(true);
        setError(null);
        try {
            const { base64, mimeType } = await imageUrlToBase64(imageUrl);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Prompt otimizado para o modelo Gemini 2.5 Flash
            const prompt = `Task: Watermark Removal (Professional High-Fidelity). 
            Analyze the provided image and remove any logos, text overlays, timestamps, or translucent watermarks. 
            Reconstruct the underlying pixels with 100% accuracy based on surrounding textures, patterns, and colors. 
            Ensure the edited area is invisible and blends perfectly with the original image. 
            Result must be high resolution 4K without any artifacts or blurs.`;

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
                    const resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    setProcessedImage(resultUrl);
                    imageFound = true;
                    break;
                }
            }
            if (!imageFound) {
                const text = candidate?.content?.parts?.find(p => p.text)?.text;
                if (text) throw new Error(`A IA retornou texto em vez de imagem: ${text}`);
                throw new Error("A IA não conseguiu remover a marca d'água automaticamente. Tente uma imagem mais clara.");
            }
        } catch (err: any) {
            console.error("Erro na remoção de marca d'água:", err);
            setError(err.message || "Falha ao processar a imagem.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const url = e.target?.result as string;
            setOriginalImage(url);
            setProcessedImage(null);
        };
        reader.readAsDataURL(file);
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
    };

    const handleSampleSelect = (url: string) => {
        setOriginalImage(url);
        setProcessedImage(null);
    };
    
    const handleDownload = () => {
        if (!processedImage) return;
        const link = document.createElement('a');
        link.href = processedImage;
        link.download = `limpo-ia-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            
            <header className="flex-shrink-0 z-10 p-4 border-b border-gray-800/50">
                <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-semibold text-lg flex items-center gap-2">
                            <ShieldCheck size={20} className="text-blue-400" />
                            Removedor de Marca D'água (Pro)
                        </h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 relative">
                {isProcessing ? (
                    <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
                            <svg className="w-16 h-16 animate-spin text-blue-500 relative" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <h3 className="text-white font-bold text-xl uppercase tracking-tighter">Limpando Imagem...</h3>
                        <p className="text-gray-400 text-sm mt-2 max-w-xs leading-relaxed">
                            O Gemini 2.5 Flash está reconstruindo as áreas cobertas por marcas e logotipos.
                        </p>
                    </div>
                ) : processedImage && originalImage ? (
                    <div className="w-full h-full flex flex-col max-w-5xl mx-auto">
                        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-[#0a0a0a]">
                             <ImageCompare before={originalImage} after={processedImage} />
                        </div>
                        <div className="flex-shrink-0 mt-4 flex justify-center items-center gap-4">
                             <button onClick={() => onEdit(processedImage)} className="bg-gray-700 text-white font-bold py-2.5 px-8 rounded-full hover:bg-gray-600 transition-all flex items-center gap-2 border border-gray-600">
                                <Edit size={18} /> Editar no Canvas
                            </button>
                             <button onClick={handleDownload} className="bg-blue-600 text-white font-bold py-2.5 px-8 rounded-full hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/40">
                                <Download size={18} /> Baixar Sem Marca
                            </button>
                        </div>
                    </div>
                ) : originalImage ? (
                     <div className="w-full h-full flex flex-col items-center justify-center max-w-3xl mx-auto">
                        <div className="flex-1 min-h-0 w-full flex items-center justify-center p-4">
                            <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-gray-800"/>
                        </div>
                    </div>
                ) : (
                    <div className="text-center max-w-2xl px-4">
                        <div className="w-24 h-24 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-8 ring-1 ring-blue-500/20 shadow-xl">
                            <Sparkles size={48} />
                        </div>
                        <h2 className="text-4xl font-bold mb-4 tracking-tight text-white">Remoção de Marcas com IA</h2>
                        <p className="text-gray-400 text-lg mb-10 leading-relaxed">
                            Elimine logotipos, marcas d'água e carimbos de data indesejados. Nossa IA reconstrói o fundo perfeitamente.
                        </p>
                        <button onClick={() => inputRef.current?.click()} className="bg-white text-black font-extrabold py-4 px-12 rounded-full flex items-center gap-3 hover:scale-105 transition-all shadow-xl hover:shadow-white/10 mx-auto">
                            <Upload size={22} /> Carregar Imagem
                        </button>
                         <p className="text-gray-500 text-xs mt-12 uppercase tracking-[0.2em] font-bold mb-6">Experimente com um exemplo</p>
                         <div className="flex justify-center gap-6">
                            {sampleImages.map((img) => (
                                <div key={img.name} onClick={() => handleSampleSelect(img.url)} className="cursor-pointer group flex flex-col items-center">
                                    <div className="w-32 h-24 rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-blue-500/50 transition-all group-hover:scale-105 shadow-lg relative">
                                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 mt-3 group-hover:text-blue-400 uppercase tracking-widest">{img.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
            
            <footer className="flex-shrink-0 z-10 p-4 border-t border-gray-800/50 bg-[#1A1A1A]">
                {error && <div className="max-w-xl mx-auto mb-4 p-3 bg-red-900/30 border border-red-500/40 rounded-xl text-center text-xs text-red-200 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">{error}</div>}
                
                {originalImage && !processedImage && (
                    <div className="max-w-xl mx-auto">
                        <button 
                            onClick={() => handleProcess(originalImage)} 
                            disabled={isProcessing} 
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 font-black uppercase text-xs tracking-[0.2em] py-4 rounded-2xl hover:brightness-110 disabled:opacity-50 disabled:grayscale transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? 'Processando Pixels...' : 'Iniciar Remoção Inteligente'}
                        </button>
                    </div>
                )}
            </footer>
        </div>
    );
};
