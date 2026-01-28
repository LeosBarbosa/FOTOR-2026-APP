
import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Download, Image, Edit } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const sampleImages = [
    { name: 'Produto', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=300&fit=crop' },
    { name: 'Pessoa', url: 'https://images.unsplash.com/photo-1583344469424-5040f5302f78?w=200&h=300&fit=crop' },
];

const promptPresets = [
    "Padrão abstrato vibrante e colorido",
    "Estúdio profissional minimalista",
    "Praia tropical ensolarada",
    "Cidade cyberpunk futurista",
    "Natureza com desfoque suave",
    "Mármore luxuoso com luz suave"
];

export const AiBackgroundScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; }> = ({ onBack, onEdit }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleProcess = async () => {
        if (!originalImage || !prompt) {
            setError('Carregue uma imagem e descreva o fundo.');
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            const { base64, mimeType } = await imageUrlToBase64(originalImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const fullPrompt = `Pegue o assunto principal da imagem fornecida e coloque-o em um fundo recém-gerado com base nesta descrição: "${prompt}". O fundo deve ser fotorrealista e de alta qualidade (4K). Garanta que o assunto esteja bem integrado com sombras, reflexos e iluminação realistas que correspondam ao novo ambiente.`;

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: fullPrompt }] },
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
            console.error("Erro no Fundo de IA:", err);
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
        link.download = `fundo-ia-${Date.now()}.jpg`;
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
                    <h1 className="font-semibold text-lg drop-shadow-md">Fundo de IA (Pro)</h1>
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">
                {isProcessing ? (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="font-semibold">Gerando seu fundo personalizado com Gemini 2.5...</p>
                    </div>
                ) : processedImage ? (
                    <img src={processedImage} alt="Resultado" className="max-w-full max-h-full object-contain rounded-lg"/>
                ) : originalImage ? (
                    <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain rounded-lg"/>
                ) : (
                    <div className="text-center max-w-2xl">
                       <Image size={48} className="mx-auto text-blue-400 mb-4"/>
                        <h2 className="text-3xl font-bold mb-2">Gerador de Fundo com IA</h2>
                        <p className="text-gray-400 mb-6">Crie fundos de produtos e retratos impressionantes do zero.</p>
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
                            <label className="text-sm font-semibold text-gray-300 mb-2 block">Sugestões de Estilo</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {promptPresets.map(preset => (
                                    <button 
                                        key={preset}
                                        onClick={() => setPrompt(preset)}
                                        className="whitespace-nowrap px-3 py-1.5 bg-gray-700/50 hover:bg-blue-600 hover:text-white rounded-full text-xs text-gray-300 border border-gray-600 transition-colors"
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-300">Descreva o fundo</label>
                            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex: em uma mesa de madeira com plantas desfocadas" className="w-full h-20 mt-2 bg-gray-700/50 p-2 rounded-md text-sm resize-none" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleProcess} disabled={isProcessing || !prompt} className="flex-1 bg-blue-600 font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">
                                {isProcessing ? 'Gerando...' : 'Gerar'}
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
