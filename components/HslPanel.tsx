
import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const colors = [
    { name: 'Vermelhos', color: '#ef4444' },
    { name: 'Laranjas', color: '#f97316' },
    { name: 'Amarelos', color: '#eab308' },
    { name: 'Verdes', color: '#22c55e' },
    { name: 'Aqua', color: '#2dd4bf' },
    { name: 'Azuis', color: '#3b82f6' },
    { name: 'Roxos', color: '#8b5cf6' },
    { name: 'Magentas', color: '#d946ef' },
];

type ColorName = 'Vermelhos' | 'Laranjas' | 'Amarelos' | 'Verdes' | 'Aqua' | 'Azuis' | 'Roxos' | 'Magentas';

type HSL = { h: number; s: number; l: number };
type HslState = Record<ColorName, HSL>;

const initialHslState: HslState = {
    'Vermelhos': { h: 0, s: 0, l: 0 },
    'Laranjas': { h: 0, s: 0, l: 0 },
    'Amarelos': { h: 0, s: 0, l: 0 },
    'Verdes': { h: 0, s: 0, l: 0 },
    'Aqua': { h: 0, s: 0, l: 0 },
    'Azuis': { h: 0, s: 0, l: 0 },
    'Roxos': { h: 0, s: 0, l: 0 },
    'Magentas': { h: 0, s: 0, l: 0 },
};

const HslSlider: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, value, onChange }) => (
    <div>
        <div className="flex justify-between items-center text-xs mb-1">
            <label className="text-gray-300">{label}</label>
            <span className="text-white font-mono">{value}</span>
        </div>
        <input type="range" min="-100" max="100" value={value} onChange={onChange} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
    </div>
);

interface HslPanelProps {
    onBack: () => void;
    image: string | null;
    onApply: (newImage: string) => void;
}

export const HslPanel: React.FC<HslPanelProps> = ({ onBack, image, onApply }) => {
    const [selectedColor, setSelectedColor] = useState<ColorName>('Vermelhos');
    const [hslValues, setHslValues] = useState<HslState>(initialHslState);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSliderChange = (slider: 'h' | 's' | 'l', value: number) => {
        setHslValues(prev => ({
            ...prev,
            [selectedColor]: { ...prev[selectedColor], [slider]: value }
        }));
    };

    const handleResetColor = () => {
        setHslValues(prev => ({
            ...prev,
            [selectedColor]: { h: 0, s: 0, l: 0 }
        }));
    };

    const handleGenerate = async () => {
        if (!image) {
            setError('Nenhuma imagem carregada.');
            return;
        }

        const changes = Object.entries(hslValues)
            .filter(([, values]: [string, HSL]) => values.h !== 0 || values.s !== 0 || values.l !== 0)
            .map(([colorName, values]: [string, HSL]) => {
                const changesArr = [];
                if (values.h !== 0) changesArr.push(`deslocamento de matiz de ${values.h}`);
                if (values.s !== 0) changesArr.push(`alteração de saturação de ${values.s}`);
                if (values.l !== 0) changesArr.push(`alteração de luminosidade de ${values.l}`);
                return `Para as cores na faixa de ${colorName.toLowerCase()}, aplique estas alterações: ${changesArr.join(', ')}.`;
            });

        if (changes.length === 0) {
            setError('Nenhum ajuste foi feito.');
            return;
        }

        const prompt = `Realize um ajuste de cor seletivo nesta imagem. ${changes.join(' ')} Não altere nenhuma outra faixa de cor. O resultado final deve ser uma edição fotorrealista do original. Não altere a composição da imagem.`;

        setIsGenerating(true);
        setError(null);

        try {
            const { base64, mimeType } = await imageUrlToBase64(image);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
                    onBack(); // Go back to the main adjust panel after applying
                    break;
                }
            }
            if (!imageFound) {
                const text = candidate?.content?.parts?.[0]?.text;
                if (text) throw new Error(`Falha: ${text}`);
                throw new Error("A IA não retornou uma imagem. Tente novamente.");
            }

        } catch (err: any) {
            console.error("Erro no ajuste HSL:", err);
            setError(err.message || "Falha ao gerar a imagem. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    const currentColorValues = hslValues[selectedColor];

    return (
        <div className="w-[calc(100vw-5rem)] sm:w-80 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl h-full flex flex-col relative text-white">
            {isGenerating && (
                <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center text-center p-4">
                    <svg className="w-16 h-16 animate-spin text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h3 className="text-white font-semibold text-lg">Aplicando ajustes HSL...</h3>
                    <p className="text-gray-300 text-sm mt-1">A IA está processando as cores.</p>
                </div>
            )}
            <header className="flex items-center gap-4 p-4 border-b border-gray-700/50 flex-shrink-0">
                <button onClick={onBack} className="p-1 hover:bg-gray-700/50 rounded-full"><ArrowLeft size={20} /></button>
                <h2 className="font-semibold text-sm">HSL</h2>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-4 gap-2">
                    {colors.map(c => (
                        <div key={c.name} className="flex flex-col items-center gap-1.5" onClick={() => setSelectedColor(c.name as ColorName)}>
                            <button
                                style={{ backgroundColor: c.color }}
                                className={`w-10 h-10 rounded-full transition-all ring-offset-2 ring-offset-[#2c2c2c] ${selectedColor === c.name ? 'ring-2 ring-white' : ''}`}
                            />
                            <span className={`text-[10px] ${selectedColor === c.name ? 'text-white' : 'text-gray-400'}`}>{c.name}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-gray-700/30 p-4 rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                         <h3 className="font-semibold text-sm text-white">{selectedColor}</h3>
                         <button onClick={handleResetColor} className="text-xs text-blue-400 hover:underline">Redefinir</button>
                    </div>
                    <HslSlider label="Matiz" value={currentColorValues.h} onChange={e => handleSliderChange('h', Number(e.target.value))} />
                    <HslSlider label="Saturação" value={currentColorValues.s} onChange={e => handleSliderChange('s', Number(e.target.value))} />
                    <HslSlider label="Luminosidade" value={currentColorValues.l} onChange={e => handleSliderChange('l', Number(e.target.value))} />
                </div>
            </div>

            <div className="p-4 border-t border-gray-700/50 flex-shrink-0">
                {error && <p className="text-red-400 text-xs text-center mb-2">{error}</p>}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !image}
                    className="w-full bg-blue-600 font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed h-11 flex items-center justify-center"
                >
                    Aplicar com IA
                </button>
            </div>
        </div>
    );
};
