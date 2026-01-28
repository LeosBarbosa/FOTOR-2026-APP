
import React, { useState } from 'react';
import { ArrowLeft, Triangle } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

interface StructurePanelProps {
    onBack: () => void;
    image: string | null;
    onApply: (newImage: string) => void;
}

export const StructurePanel: React.FC<StructurePanelProps> = ({ onBack, image, onApply }) => {
    const [intensity, setIntensity] = useState(50);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleApplyStructure = async () => {
        if (!image) return;
        setIsProcessing(true);
        setError(null);

        try {
            const { base64, mimeType } = await imageUrlToBase64(image);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `Apply a sharpness and structure adjustment to this image. Intensity: ${intensity}%. Accentuate edges and fine textures to make the image look crisper and more defined, but avoid over-sharpening or introducing noise. Keep the colors and composition exactly as they are.`;

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
                    onApply(imageUrl);
                    imageFound = true;
                    break;
                }
            }
            if (!imageFound) {
                const text = candidate?.content?.parts?.[0]?.text;
                if (text) throw new Error(`A IA respondeu com texto: ${text}`);
                if (candidate?.finishReason) throw new Error(`Bloqueado: ${candidate.finishReason}`);
                throw new Error("A IA não retornou uma imagem.");
            }
             onBack();

        } catch (err: any) {
            console.error("Error applying structure:", err);
            setError(err.message || "Falha ao aplicar estrutura.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="w-[calc(100vw-5rem)] sm:w-80 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl h-full flex flex-col flex-shrink-0 relative">
             {isProcessing && (
                <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center text-center p-4">
                    <svg className="w-16 h-16 animate-spin text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h3 className="text-white font-semibold text-lg">Aplicando estrutura...</h3>
                    <p className="text-gray-300 text-sm mt-1">A IA está realçando os detalhes.</p>
                </div>
            )}
            <header className="flex items-center gap-4 p-4 border-b border-gray-700/50 flex-shrink-0">
                <button onClick={onBack} className="p-1 hover:bg-gray-700/50 rounded-full">
                    <ArrowLeft size={20} className="text-white" />
                </button>
                <h2 className="font-semibold text-sm text-white">Estrutura</h2>
            </header>
            
             <div className="flex-1 p-4 space-y-6">
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
                    <div className="text-center mt-2 text-white font-mono text-sm">{intensity}%</div>
                </div>
                
                <div className="bg-gray-700/30 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <Triangle className="text-blue-400 mt-1" size={20} />
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-1">Sobre esta ferramenta</h4>
                            <p className="text-xs text-gray-400">
                                A ferramenta Estrutura usa IA para analisar e realçar micro-contrastes e bordas, trazendo mais definição para texturas como cabelo, tecido e paisagens sem exagerar no ruído.
                            </p>
                        </div>
                    </div>
                </div>
                 {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            </div>

            <div className="p-4 border-t border-gray-700/50 flex-shrink-0">
                <button 
                    onClick={handleApplyStructure}
                    disabled={isProcessing || !image}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    Aplicar com IA
                </button>
            </div>
        </div>
    );
};
