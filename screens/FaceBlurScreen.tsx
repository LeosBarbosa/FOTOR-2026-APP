import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Download, EyeOff, Edit } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const sampleImages = [
    { name: 'Grupo', url: 'https://images.unsplash.com/photo-1527515637462-c0b1a3212130?w=200&h=300&fit=crop' },
    { name: 'Retrato', url: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=200&h=300&fit=crop' },
];

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
        <div ref={containerRef} className="relative w-full h-full select-none" onMouseMove={handleMove}>
            <img src={after} alt="Depois" className="absolute inset-0 w-full h-full object-contain" decoding="async" />
            <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={before} alt="Antes" className="absolute inset-0 w-full h-full object-contain" decoding="async" />
            </div>
            <div className="absolute top-0 bottom-0 bg-white w-1 cursor-ew-resize" style={{ left: `calc(${sliderPos}% - 1px)` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 rounded-full bg-white shadow-md grid place-items-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                </div>
            </div>
        </div>
    );
};

export const FaceBlurScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; }> = ({ onBack, onEdit }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleProcess = async (imageUrl: string) => {
        setIsProcessing(true);
        setError(null);
        try {
            const { base64, mimeType } = await imageUrlToBase64(imageUrl);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = "Detecte todos os rostos nesta imagem e aplique um efeito de desfoque (blur) a eles. O desfoque deve ser forte o suficiente para ocultar a identidade, mas parecer natural. Não altere nenhuma outra parte da imagem.";

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
              config: { responseModalities: [Modality.IMAGE] },
            });
            
            const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
            if (part?.inlineData) {
                const resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                setProcessedImage(resultUrl);
            } else {
                throw new Error("A IA não retornou uma imagem.");
            }
        } catch (err) {
            console.error("Erro no desfoque de rosto:", err);
            setError("Falha ao processar a imagem.");
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
            handleProcess(url);
        };
        reader.readAsDataURL(file);
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
    };
    
    const handleSampleSelect = (url: string) => {
        setOriginalImage(url);
        setProcessedImage(null);
        handleProcess(url);
    };

    const handleDownload = () => {
        if (!processedImage) return;
        const link = document.createElement('a');
        link.href = processedImage;
        link.download = `rosto-desfocado-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            
            <header className="flex-shrink-0 z-10 p-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-semibold text-lg drop-shadow-md">Desfoque de Rosto IA</h1>
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">
                {isProcessing ? (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                        <svg className="w-16 h-16 animate-spin text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <h3 className="text-white font-semibold text-lg">Detectando e desfocando rostos...</h3>
                        <p className="text-gray-300 text-sm mt-1">A IA está protegendo a privacidade.</p>
                    </div>
                ) : processedImage && originalImage ? (
                    <ImageCompare before={originalImage} after={processedImage} />
                ) : (
                    <div className="text-center max-w-2xl">
                        <EyeOff size={48} className="mx-auto text-blue-400 mb-4"/>
                        <h2 className="text-3xl font-bold mb-2">Desfoque de Rosto IA</h2>
                        <p className="text-gray-400 mb-6">Desfoque automaticamente os rostos em suas fotos com um clique.</p>
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
                {error && <div className="max-w-md mx-auto mb-2 p-2 bg-red-900/80 rounded-lg text-center text-sm text-red-300 backdrop-blur-sm">{error}</div>}
                {processedImage && (
                    <div className="max-w-md mx-auto flex items-center justify-center gap-4 bg-black/30 backdrop-blur-sm p-4 rounded-xl">
                         <button onClick={() => onEdit(processedImage)} className="bg-gray-600 font-bold py-3 px-6 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                            <Edit size={18} /> Editar
                        </button>
                        <button onClick={handleDownload} className="bg-blue-600 font-bold py-3 px-6 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                            <Download size={18} /> Baixar
                        </button>
                    </div>
                )}
            </footer>
        </div>
    );
};