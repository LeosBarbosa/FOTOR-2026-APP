
import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Download, Armchair, Edit, Loader } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const sampleImages = [
    { name: 'Modelo', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=300&fit=crop' },
    { name: 'Produto', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=300&fit=crop' },
];

export const LifestyleSceneScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage?: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(initialImage || null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleProcess = async () => {
        if (!originalImage || !prompt) {
            setError('Carregue uma imagem e descreva a cena de estilo de vida.');
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            const { base64, mimeType } = await imageUrlToBase64(originalImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Prompt otimizado para o Gemini 2.5 Flash Image
            const fullPrompt = `
            ATUE COMO UM DIRETOR DE ARTE E FOTÓGRAFO DE ESTILO DE VIDA.
            
            Tarefa: Crie uma cena de estilo de vida ("Lifestyle Scene") combinando o sujeito da imagem fornecida com novos elementos baseados na descrição: "${prompt}".
            
            Diretrizes de Qualidade de Estúdio (Gemini 2.5 Flash):
            1. Integração: O sujeito deve interagir naturalmente com o novo ambiente. Ajuste a perspectiva e a escala para realismo total.
            2. Iluminação e Cor: Aplique uma gradação de cores sofisticada que combine o sujeito com o cenário. As sombras devem ser projetadas corretamente no novo ambiente.
            3. Composição: Crie uma composição equilibrada, adicionando elementos de apoio (props) que façam sentido com a descrição.
            4. Fidelidade: Mantenha a identidade e os detalhes do sujeito principal intactos, mas adapte a iluminação sobre ele para corresponder à nova cena.
            
            Resultado: Uma imagem fotorrealista, alta resolução (4K), pronta para editorial ou mídia social.
            `;

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
                if (text) throw new Error(`A IA respondeu: ${text}`);
                throw new Error("A IA não retornou uma imagem.");
            }

        } catch (err: any) {
            console.error("Erro na Cena de Estilo de Vida:", err);
            setError(err.message || "Falha ao criar a cena.");
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
        link.download = `lifestyle-scene-${Date.now()}.jpg`;
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
                    <h1 className="font-semibold text-lg drop-shadow-md">Cenas de Estilo de Vida (Pro)</h1>
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">
                {isProcessing ? (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <h3 className="text-xl font-bold mb-2">Compondo Cena...</h3>
                        <p className="text-gray-400">Ajustando iluminação, perspectiva e elementos.</p>
                    </div>
                ) : processedImage ? (
                    <img src={processedImage} alt="Resultado" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"/>
                ) : originalImage ? (
                    <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain rounded-lg"/>
                ) : (
                    <div className="text-center max-w-2xl">
                       <Armchair size={48} className="mx-auto text-purple-400 mb-4"/>
                        <h2 className="text-3xl font-bold mb-2">Crie Cenas de Estilo de Vida</h2>
                        <p className="text-gray-400 mb-6">Coloque seus produtos ou modelos em qualquer cenário realista combinando vários elementos.</p>
                        <button onClick={() => inputRef.current?.click()} className="bg-purple-600 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 hover:bg-purple-700 mx-auto transition-transform hover:scale-105">
                            <Upload size={20} /> Carregar Imagem
                        </button>
                         <p className="text-gray-500 text-sm my-6">ou experimente um destes:</p>
                         <div className="flex justify-center gap-4">
                            {sampleImages.map((img) => (
                                <div key={img.name} onClick={() => handleSampleSelect(img.url)} className="cursor-pointer group">
                                    <img src={img.url} alt={img.name} className="w-24 h-36 rounded-md object-cover transition-all group-hover:scale-105 group-hover:ring-2 ring-purple-500" loading="lazy" decoding="async" />
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
                    <div className="max-w-xl mx-auto flex flex-col gap-4 bg-black/30 backdrop-blur-sm p-4 rounded-xl border border-gray-700">
                        <div>
                            <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                <Edit size={14} /> Descreva a cena desejada
                            </label>
                            <textarea 
                                value={prompt} 
                                onChange={(e) => setPrompt(e.target.value)} 
                                placeholder="Ex: Em uma sala de estar moderna e aconchegante com luz do sol entrando pela janela, plantas ao fundo e uma xícara de café na mesa." 
                                className="w-full h-24 mt-2 bg-gray-700/50 p-3 rounded-md text-sm resize-none placeholder-gray-500 focus:ring-1 focus:ring-purple-500 outline-none" 
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleProcess} disabled={isProcessing || !prompt} className="flex-1 bg-purple-600 font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                                {isProcessing ? 'Criando...' : 'Gerar Cena'}
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
