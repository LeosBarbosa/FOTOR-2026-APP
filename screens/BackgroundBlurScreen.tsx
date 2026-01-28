
import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Download, CircleDot, Edit, Aperture } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const sampleImages = [
    { name: 'Retrato', url: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=200&h=300&fit=crop' },
    { name: 'Animal', url: 'https://images.unsplash.com/photo-1583337130417-2346a5be24c1?w=200&h=300&fit=crop' },
];

const Header: React.FC<{ onBack: () => void; }> = ({ onBack }) => (
    <header className="flex-shrink-0 bg-[#2c2c2c] text-white flex items-center justify-between px-4 h-14 border-b border-gray-700/50 z-20">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <h1 className="font-semibold text-lg">Foco & Desfoque Pro</h1>
        </div>
    </header>
);

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
        <div ref={containerRef} className="relative w-full h-full" onMouseMove={handleMove}>
            <img src={after} alt="Depois" className="absolute inset-0 w-full h-full object-contain" />
            <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={before} alt="Antes" className="absolute inset-0 w-full h-full object-contain" />
            </div>
            <div className="absolute top-0 bottom-0 bg-white w-1 cursor-ew-resize" style={{ left: `calc(${sliderPos}% - 1px)` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 rounded-full bg-white shadow-md grid place-items-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                </div>
            </div>
        </div>
    );
};

export const BackgroundBlurScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; }> = ({ onBack, onEdit }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [intensity, setIntensity] = useState(50);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleProcess = async () => {
        if (!originalImage) return;
        setIsProcessing(true);
        setError(null);
        try {
            const { base64, mimeType } = await imageUrlToBase64(originalImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let intensityDesc = "medium";
            if (intensity < 30) intensityDesc = "subtle";
            if (intensity > 70) intensityDesc = "strong";

            const prompt = `Identify the main subject in this image (person, animal, or object) and keep it perfectly sharp and in focus. Apply a ${intensityDesc} blur effect to the background (bokeh) to create depth. The boundary between the sharp subject and the blurred background must be precise. Maintain original colors.`;

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
                const text = candidate?.content?.parts?.[0]?.text;
                if (text) throw new Error(`Falha: ${text}`);
                throw new Error("A IA não retornou uma imagem.");
            }
        } catch (err: any) {
            console.error("Erro no desfoque:", err);
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
        link.download = `fundo-desfocado-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <Header onBack={onBack} />

            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">
                {isProcessing ? (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="font-semibold">Aplicando desfoque de lente...</p>
                    </div>
                ) : processedImage && originalImage ? (
                    <ImageCompare before={originalImage} after={processedImage} />
                ) : originalImage ? (
                    <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain rounded-lg"/>
                ) : (
                    <div className="text-center max-w-2xl">
                       <Aperture size={48} className="mx-auto text-blue-400 mb-4"/>
                        <h2 className="text-3xl font-bold mb-2">Desfoque de Fundo (Bokeh)</h2>
                        <p className="text-gray-400 mb-6">Crie um efeito de profundidade de campo profissional.</p>
                        <button onClick={() => inputRef.current?.click()} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 hover:bg-blue-700 mx-auto">
                            <Upload size={20} /> Carregar Imagem
                        </button>
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
            </main>
            
            <footer className="flex-shrink-0 z-10 p-4">
                {error && <div className="max-w-xl mx-auto mb-2 p-2 bg-red-900/80 rounded-lg text-center text-sm text-red-300 backdrop-blur-sm">{error}</div>}
                {originalImage && (
                    <div className="max-w-xl mx-auto flex flex-col gap-4 bg-black/30 backdrop-blur-sm p-4 rounded-xl">
                        <div>
                            <div className="flex justify-between text-xs text-gray-300 mb-2">
                                <span>Suave</span>
                                <span>Intenso</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={intensity} 
                                onChange={(e) => setIntensity(Number(e.target.value))}
                                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleProcess} disabled={isProcessing} className="flex-1 bg-blue-600 font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">
                                {isProcessing ? 'Gerando...' : 'Aplicar Desfoque'}
                            </button>
                            {processedImage && (
                                 <>
                                    <button onClick={() => onEdit(processedImage)} className="bg-gray-600 font-bold py-3 px-4 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={handleDownload} className="bg-blue-600 font-bold py-3 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                                        <Download size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
};
