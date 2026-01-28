
import React, { useState } from 'react';
import { ArrowLeft, Sun, Moon, CloudSun, Sunrise, Zap, Flashlight, CloudMoon } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

interface LightingPanelProps {
    onBack: () => void;
    image: string | null;
    onApply: (newImage: string) => void;
}

const lightingPresets = [
    { id: 'balanced', label: 'Equilíbrio', icon: Zap, prompt: 'Balance the lighting perfectly. Recover details in shadows and suppress blown-out highlights evenly.' },
    { id: 'shadows', label: 'Recuperar Sombras', icon: Moon, prompt: 'Focus primarily on recovering details in dark/shadow areas. Brighten the underexposed regions while keeping highlights intact.' },
    { id: 'highlights', label: 'Reduzir Brilho', icon: Sun, prompt: 'Focus primarily on suppressing excessive brightness and blown-out highlights. Restore details in overexposed areas.' },
    { id: 'golden', label: 'Hora Dourada', icon: Sunrise, prompt: 'Apply a soft, warm lighting adjustment simulating the golden hour. Enhance warm tones and create a cozy atmosphere while balancing exposure.' },
    { id: 'studio', label: 'Estúdio', icon: CloudSun, prompt: 'Simulate professional studio lighting. Create soft, even illumination with minimal harsh shadows, enhancing facial features if present.' },
    { id: 'daytonight', label: 'Dia para Noite', icon: CloudMoon, prompt: 'Transforme esta cena em noturna. Adjust the ambient light to simulate moonlight, darken the sky, and turn on artificial lights (windows, streetlamps) if present. Create a cinematic night atmosphere.' },
    { id: 'chiaroscuro', label: 'Claro-Escuro', icon: Flashlight, prompt: 'crie uma imagem com um intenso efeito de claro-escuro. O homem deve manter suas feições e expressão originais. Introduza uma luz forte e direcional, aparentemente vinda de cima e ligeiramente da esquerda, projetando sombras profundas e definidas no rosto. Apenas feixes de luz iluminam seus olhos e maçãs do rosto; o restante do rosto permanece em profunda sombra.' },
];

export const LightingPanel: React.FC<LightingPanelProps> = ({ onBack, image, onApply }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [intensity, setIntensity] = useState(50);
    const [selectedPreset, setSelectedPreset] = useState(lightingPresets[0].id);

    const handleApplyLighting = async () => {
        if (!image) return;
        setIsProcessing(true);
        setError(null);

        try {
            const { base64, mimeType } = await imageUrlToBase64(image);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let intensityDesc = "balanced";
            if (intensity < 35) intensityDesc = "subtle";
            if (intensity > 65) intensityDesc = "strong and dramatic";
            
            const presetPrompt = lightingPresets.find(p => p.id === selectedPreset)?.prompt || lightingPresets[0].prompt;

            const prompt = `Analyze this image and apply the following lighting transformation using Gemini 2.5 Flash capabilities: ${presetPrompt} Intensity/Strength of effect: ${intensityDesc}. Goal: A professional, natural, and high-quality result. Maintain the original composition and subject identity.`;

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
                if (candidate?.finishReason) {
                     throw new Error(`Processamento bloqueado. Motivo: ${candidate.finishReason}`);
                }
                throw new Error("A IA não retornou uma imagem.");
            }
             onBack();

        } catch (err: any) {
            console.error("Error applying lighting adjustment:", err);
            setError(err.message || "Falha ao ajustar a iluminação.");
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
                    <h3 className="text-white font-semibold text-lg">Transformando a luz...</h3>
                    <p className="text-gray-300 text-sm mt-1">Motor: Gemini 2.5 Flash</p>
                </div>
            )}
            <header className="flex items-center gap-4 p-4 border-b border-gray-700/50 flex-shrink-0">
                <button onClick={onBack} className="p-1 hover:bg-gray-700/50 rounded-full">
                    <ArrowLeft size={20} className="text-white" />
                </button>
                <h2 className="font-semibold text-sm text-white">Iluminação Pro</h2>
            </header>
            
             <div className="flex-1 p-4 space-y-6 flex flex-col overflow-y-auto">
                 
                 {/* Header Info */}
                 <div className="text-center mb-2">
                     <div className="bg-yellow-500/20 p-4 rounded-full mb-3 inline-flex ring-1 ring-yellow-500/50">
                        <Sun size={32} className="text-yellow-400" />
                     </div>
                     <h3 className="text-white font-semibold mb-1">Controle de Luz & Atmosfera</h3>
                     <p className="text-xs text-gray-400">
                         Transforme dia em noite ou crie efeitos dramáticos.
                     </p>
                 </div>

                 {/* Presets Grid */}
                 <div>
                    <label className="text-xs font-semibold text-gray-300 mb-2 block uppercase tracking-wider">Modo de Cena</label>
                    <div className="grid grid-cols-2 gap-2">
                        {lightingPresets.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => setSelectedPreset(preset.id)}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center h-20 ${
                                    selectedPreset === preset.id
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                }`}
                            >
                                <preset.icon size={20} className="mb-1" />
                                <span className="text-[10px] font-medium leading-tight">{preset.label}</span>
                            </button>
                        ))}
                    </div>
                 </div>

                 {/* Intensity Slider */}
                 <div className="w-full space-y-2 pt-2">
                    <div className="flex justify-between text-xs text-gray-300">
                        <span>Suave</span>
                        <span>Dramático</span>
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

                 {error && <p className="text-red-400 text-xs text-center bg-red-900/50 p-2 rounded w-full animate-pulse">{error}</p>}
            </div>

            <div className="p-4 border-t border-gray-700/50 flex-shrink-0">
                <button 
                    onClick={handleApplyLighting}
                    disabled={isProcessing || !image}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3 rounded-md hover:brightness-110 transition-all disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                >
                    Aplicar Iluminação
                </button>
            </div>
        </div>
    );
};
