
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Download, Wand2, Edit } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const sampleImages = [
    { name: 'Retrato', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=300&fit=crop' },
    { name: 'Paisagem', url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=200&h=300&fit=crop' },
    { name: 'Comida', url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=300&fit=crop' },
    { name: 'Noturno', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=200&h=300&fit=crop' },
];

const Header: React.FC<{ onBack: () => void; onDownload: () => void; canDownload: boolean; }> = ({ onBack, onDownload, canDownload }) => (
    <header className="flex-shrink-0 bg-[#2c2c2c] text-white flex items-center justify-between px-4 h-14 border-b border-gray-700/50 z-20">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <h1 className="font-semibold text-lg">Aprimoramento Pro</h1>
        </div>
        <button onClick={onDownload} disabled={!canDownload} className="px-4 py-2 font-bold bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm disabled:bg-gray-500 disabled:cursor-not-allowed">
            <Download size={16} />
            Baixar
        </button>
    </header>
);

const ImageCompare: React.FC<{ before: string; after: string }> = ({ before, after }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
        setSliderPos(percent);
    };

    return (
        <div ref={containerRef} className="relative w-full h-full" onMouseMove={handleMove}>
            <img src={after} alt="Depois" className="absolute inset-0 w-full h-full object-contain" decoding="async" />
            <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={before} alt="Antes" className="absolute inset-0 w-full h-full object-contain" decoding="async" />
            </div>
            <div className="absolute top-0 bottom-0 bg-white w-1 cursor-ew-resize" style={{ left: `calc(${sliderPos}% - 1px)` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 rounded-full bg-white shadow-md grid place-items-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                </div>
            </div>
            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Original</div>
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Aprimorado</div>
        </div>
    );
};

export const OneTapEnhanceScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage?: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(initialImage || null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleEnhance = async (imageUrl: string) => {
        if (!imageUrl) return;
        setIsProcessing(true);
        setError(null);

        try {
            const { base64, mimeType } = await imageUrlToBase64(imageUrl);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `Enhance this photo using advanced AI processing (Gemini 2.5 Flash).
            1. Lighting: Balance exposure, recover shadow details, and fix blown-out highlights.
            2. Color: Correct white balance and boost vibrance naturally.
            3. Details: Sharpen fine details and reduce noise.
            4. Faces: If present, subtly enhance facial features for clarity.
            Result should be a professional-grade, 4K quality image.`;

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
              config: { responseModalities: [Modality.IMAGE] },
            });

            const candidate = response.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            let newImageFound = false;

            for (const part of parts) {
              if (part.inlineData && part.inlineData.mimeType.includes('image')) {
                const base64ImageBytes: string = part.inlineData.data;
                const newMimeType = part.inlineData.mimeType;
                const resultUrl = `data:${newMimeType};base64,${base64ImageBytes}`;
                setProcessedImage(resultUrl);
                newImageFound = true;
                break;
              }
            }
            if (!newImageFound) {
                const text = candidate?.content?.parts?.[0]?.text;
                if (text) throw new Error(`Falha: ${text}`);
                throw new Error("A IA não retornou uma imagem. Tente novamente.");
            }
            
        } catch (err: any) {
            console.error("Erro ao aprimorar:", err);
            setError(err.message || "Falha ao processar a imagem. Tente novamente.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    useEffect(() => {
        if (initialImage) {
            handleEnhance(initialImage);
        }
    }, [initialImage]);

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target?.result as string;
            setOriginalImage(imageUrl);
            setProcessedImage(null);
            setError(null);
            handleEnhance(imageUrl);
        };
        reader.readAsDataURL(file);
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
          handleImageUpload(file);
        }
    };

    const handleSampleSelect = (url: string) => {
        setOriginalImage(url);
        setProcessedImage(null);
        setError(null);
        handleEnhance(url);
    };

    const handleDownload = () => {
        if (!processedImage) return;
        const link = document.createElement('a');
        link.href = processedImage;
        link.download = `aprimorado-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
            <Header onBack={onBack} onDownload={handleDownload} canDownload={!!processedImage} />
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 relative flex items-center justify-center p-8">
                   {isProcessing && (
                        <div className="absolute inset-0 bg-zinc-900/80 z-10 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm">
                            <svg className="w-16 h-16 animate-spin text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <h3 className="text-white font-semibold text-lg drop-shadow-md">Aprimorando sua foto...</h3>
                            <p className="text-gray-300 text-sm mt-1 drop-shadow-md">Motor: Gemini 2.5 Flash</p>
                        </div>
                   )}
                   
                   {processedImage && originalImage ? (
                        <ImageCompare before={originalImage} after={processedImage} />
                   ) : originalImage ? (
                        <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" />
                   ) : (
                        <div className="w-full max-w-2xl text-center">
                            <div className="flex justify-center items-center">
                                <div className="w-20 h-20 bg-zinc-700 text-blue-400 rounded-full flex items-center justify-center mb-4 ring-8 ring-zinc-800">
                                    <Wand2 size={40} />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold mb-2">Aprimoramento de Foto (Pro)</h2>
                            <p className="text-gray-400 mb-6">Melhore instantaneamente suas fotos com o poder do Gemini 2.5.</p>
                            <div className="flex justify-center my-4">
                                <button onClick={() => inputRef.current?.click()} className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 flex items-center gap-2">
                                    <Upload size={20} /> Carregar Imagem
                                </button>
                            </div>
                            <p className="text-gray-500 text-sm my-6">ou experimente um destes:</p>
                            <div className="flex justify-center gap-4">
                                {sampleImages.map((img) => (
                                    <div key={img.name} onClick={() => handleSampleSelect(img.url)} className="cursor-pointer group">
                                        <img src={img.url} alt={img.name} className="w-24 h-36 rounded-md object-cover transition-all group-hover:scale-105 group-hover:ring-2 ring-blue-500" loading="lazy" decoding="async" />
                                        <p className="text-sm text-gray-400 mt-2 group-hover:text-white">{img.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                   )}
                </div>
                 <div className="flex-shrink-0 p-4 pt-0 flex flex-col items-center">
                    {processedImage && (
                        <button onClick={() => onEdit(processedImage)} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-full flex items-center gap-2 hover:bg-gray-700 transition-colors">
                            <Edit size={18}/>
                            Editar no Editor Principal
                        </button>
                    )}
                    {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-lg mt-4">{error}</p>}
                </div>
            </main>
        </div>
    );
};
