
import React, { useState } from 'react';
import { ArrowLeft, ScanFace } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

interface FaceEnhancePanelProps {
    onBack: () => void;
    image: string | null;
    onApply: (newImage: string) => void;
}

export const FaceEnhancePanel: React.FC<FaceEnhancePanelProps> = ({ onBack, image, onApply }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [intensity, setIntensity] = useState(50);

    const handleApplyEnhance = async () => {
        if (!image) return;
        setIsProcessing(true);
        setError(null);

        try {
            const { base64, mimeType } = await imageUrlToBase64(image);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let intensityDesc = "balanced and natural";
            if (intensity < 30) intensityDesc = "subtle and very soft";
            if (intensity > 70) intensityDesc = "strong, sharp, and highly defined";

            const prompt = `Enhance the facial details in this image. Intensity: ${intensityDesc}. Sharpen the eyes, eyebrows, nose, and lips to make them clearer. Improve skin texture slightly but keep it realistic. Do not alter facial structure or expression. Maintain a natural appearance.`;

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
                if (text) throw new Error(`A IA não retornou imagem: ${text}`);
                if (candidate?.finishReason) {
                    throw new Error(`Processamento interrompido: ${candidate.finishReason}`);
                }
                throw new Error("A IA não retornou uma imagem.");
            }
             onBack();

        } catch (err: any) {
            console.error("Error applying face enhance:", err);
            setError(err.message || "Falha ao aprimorar o rosto.");
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
                    <h3 className="text-white font-semibold text-lg">Aprimorando rosto...</h3>
                    <p className="text-gray-300 text-sm mt-1">A IA está definindo os detalhes.</p>
                </div>
            )}
            <header className="flex items-center gap-4 p-4 border-b border-gray-700/50 flex-shrink-0">
                <button onClick={onBack} className="p-1 hover:bg-gray-700/50 rounded-full">
                    <ArrowLeft size={20} className="text-white" />
                </button>
                <h2 className="font-semibold text-sm text-white">Aprimorar Rosto IA</h2>
            </header>
            
             <div className="flex-1 p-4 space-y-6 flex flex-col items-center justify-center">
                 <div className="text-center">
                     <div className="bg-blue-500/20 p-6 rounded-full mb-4 inline-flex">
                        <ScanFace size={48} className="text-blue-400" />
                     </div>
                     <h3 className="text-white font-semibold mb-2">Realçar Detalhes Faciais</h3>
                     <p className="text-sm text-gray-400 mb-4">
                         Use a Inteligência Artificial para tornar olhos, lábios e contornos faciais mais nítidos e definidos, mantendo a aparência natural.
                     </p>
                 </div>

                 <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs text-gray-300">
                        <span>Suave</span>
                        <span>Forte</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={intensity} 
                        onChange={(e) => setIntensity(Number(e.target.value))}
                        className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                     <div className="text-center text-white font-mono text-xs mt-1">{intensity}%</div>
                 </div>

                 {error && <p className="text-red-400 text-xs text-center bg-red-900/50 p-2 rounded w-full">{error}</p>}
            </div>

            <div className="p-4 border-t border-gray-700/50 flex-shrink-0">
                <button 
                    onClick={handleApplyEnhance}
                    disabled={isProcessing || !image}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    Aplicar com IA
                </button>
            </div>
        </div>
    );
};
