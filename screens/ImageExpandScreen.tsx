
import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Download, Expand, Edit } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const sampleImages = [
    { name: 'Paisagem', url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=300&h=200&fit=crop' },
    { name: 'Pessoa', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop' },
];

const AspectRatioButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${active ? 'bg-gray-200 text-black' : 'bg-[#3a3d43] text-gray-300 hover:bg-[#4a4d53]'}`}>
        {label}
    </button>
);

export const ImageExpandScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; }> = ({ onBack, onEdit }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleProcess = async () => {
        if (!originalImage) return;
        setIsProcessing(true);
        setError(null);
        try {
            const { base64, mimeType } = await imageUrlToBase64(originalImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Prompt avançado com bloqueio de personagem (Character Lock)
            const prompt = `Change the aspect ratio of this image to ${aspectRatio}. 
            IMPORTANT: The main character/subject MUST remain exactly locked in its current position and size. Do not distort, stretch, or move the subject. 
            If the new ratio is smaller (e.g. 1:1), reduce the background/crop intelligently while keeping the subject centered.
            If the new ratio is larger (e.g. 16:9), use generative outpainting to fill the new areas seamlessly with matching context.
            Create a cohesive, high-resolution result (4K).`;

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
            console.error("Erro na expansão de imagem:", err);
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
        link.download = `imagem-expandida-${Date.now()}.jpg`;
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
                    <h1 className="font-semibold text-lg drop-shadow-md">Adaptação de Proporção IA</h1>
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">
                {isProcessing ? (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="font-semibold">Adaptando imagem (Personagem Bloqueado)...</p>
                    </div>
                ) : processedImage ? (
                    <img src={processedImage} alt="Resultado" className="max-w-full max-h-full object-contain rounded-lg"/>
                ) : originalImage ? (
                     <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain rounded-lg"/>
                ) : (
                    <div className="text-center max-w-2xl">
                       <Expand size={48} className="mx-auto text-blue-400 mb-4"/>
                        <h2 className="text-3xl font-bold mb-2">Adaptação de Proporção Inteligente</h2>
                        <p className="text-gray-400 mb-6">Mude o formato da imagem para mídias sociais mantendo o personagem fixo.</p>
                        <button onClick={() => inputRef.current?.click()} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 hover:bg-blue-700 mx-auto">
                            <Upload size={20} /> Carregar Imagem
                        </button>
                         <p className="text-gray-500 text-sm my-6">ou experimente um destes:</p>
                         <div className="flex justify-center gap-4">
                            {sampleImages.map((img) => (
                                <div key={img.name} onClick={() => handleSampleSelect(img.url)} className="cursor-pointer group">
                                    <img src={img.url} alt={img.name} className="w-36 h-24 rounded-md object-cover transition-all group-hover:scale-105 group-hover:ring-2 ring-blue-500" loading="lazy" decoding="async" />
                                    <p className="text-sm text-gray-400 mt-2 group-hover:text-white">{img.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
            
            <footer className="flex-shrink-0 z-10 p-4">
                {error && <div className="max-w-lg mx-auto mb-2 p-2 bg-red-900/80 rounded-lg text-center text-sm text-red-300 backdrop-blur-sm">{error}</div>}
                {originalImage && (
                    <div className="max-w-lg mx-auto flex items-center gap-4 bg-black/30 backdrop-blur-sm p-4 rounded-xl">
                        <div>
                            <h4 className="font-semibold text-sm mb-2 text-gray-300">Nova Proporção</h4>
                            <div className="flex justify-center gap-2">
                               <AspectRatioButton label="16:9" active={aspectRatio === '16:9'} onClick={() => setAspectRatio('16:9')} />
                               <AspectRatioButton label="1:1" active={aspectRatio === '1:1'} onClick={() => setAspectRatio('1:1')} />
                               <AspectRatioButton label="9:16" active={aspectRatio === '9:16'} onClick={() => setAspectRatio('9:16')} />
                               <AspectRatioButton label="4:3" active={aspectRatio === '4:3'} onClick={() => setAspectRatio('4:3')} />
                            </div>
                        </div>
                        <div className="w-px self-stretch bg-gray-700"></div>
                        <div className="flex flex-col gap-3">
                            {processedImage ? (
                                <>
                                    <button onClick={() => onEdit(processedImage)} className="bg-gray-600 font-bold py-2 px-4 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                                        <Edit size={18} /> Editar
                                    </button>
                                    <button onClick={handleDownload} className="bg-blue-600 font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                                        <Download size={18} /> Baixar
                                    </button>
                                </>
                            ) : (
                                 <button onClick={handleProcess} disabled={isProcessing} className="bg-blue-600 font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-500 self-stretch">
                                    {isProcessing ? 'Processando...' : 'Aplicar'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
};
