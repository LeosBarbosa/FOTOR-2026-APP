
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Download, User, Edit } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const sampleImages = [
    { name: 'Exemplo 1', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=300&fit=crop' },
    { name: 'Exemplo 2', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=300&fit=crop' },
];

export const Upcoming2026Screen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage?: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(initialImage || null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialImage) {
            handleProcess(initialImage);
        }
    }, [initialImage]);

    const handleProcess = async (imageUrl: string) => {
        setIsProcessing(true);
        setError(null);
        try {
            const { base64, mimeType } = await imageUrlToBase64(imageUrl);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = "Ultra-realistic image of a young stylish person (matching the face in the uploaded photo) sitting confidently on large “Happy New Year 2026” numbers on a road in a beautiful park. The numbers have a futuristic black outline. They are wearing a Balmain oversized t-shirt, Dior pants, and Louis Vuitton sneakers. The Kolkata Maidan background includes green trees, colorful flowers, and a soft golden sunset sky, with a modern, cinematic, positive vibe. Ensure the face from the uploaded photo is accurately and realistically integrated.";

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
            console.error("Erro na geração da imagem 'Upcoming 2026':", err);
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
        link.download = `upcoming-2026-${Date.now()}.jpg`;
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
                    <h1 className="font-semibold text-lg drop-shadow-md">Upcoming 2026</h1>
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">
                {isProcessing ? (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="font-semibold">Gerando sua visão de 2026...</p>
                    </div>
                ) : processedImage ? (
                     <img src={processedImage} alt="Resultado" className="max-w-full max-h-full object-contain rounded-lg"/>
                ) : (
                    <div className="text-center max-w-2xl">
                       <User size={48} className="mx-auto text-blue-400 mb-4"/>
                        <h2 className="text-3xl font-bold mb-2">Gerador de Imagem Upcoming 2026</h2>
                        <p className="text-gray-400 mb-6">Crie uma imagem sua em uma cena futurista para o Ano Novo de 2026.</p>
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
