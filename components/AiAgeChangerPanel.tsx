
import React, { useState } from 'react';
import { ArrowLeft, Baby, User, UserCheck, UserCog, UserRound } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const ageOptions = [
    { id: 'child', label: 'Criança', icon: Baby, prompt: "Rejuvenesça a imagem da pessoa para a infância, especificamente para a idade de 7 anos. A transformação deve ser fotorrealista, com a pele macia e um sorriso gentil. Mantenha os traços faciais essenciais para preservar a identidade original. O resultado deve ter o estilo de uma fotografia de retrato de alta qualidade, com iluminação natural, resolução 4K. Não altere o fundo." },
    { id: 'teenager', label: 'Adolescente', icon: User, prompt: "Rejuvenesça a imagem para a adolescência, transformando a pessoa na foto em um adolescente de 16 anos. A textura da pele deve ser natural para essa idade. Mantenha os traços faciais realistas e a identidade original. O estilo deve ser uma fotografia casual, com iluminação natural e alta qualidade, 4K. O foco é no rosto; não altere o fundo." },
    { id: 'young-adult', label: 'Jovem Adulto', icon: UserCheck, prompt: "Ajuste a idade da pessoa na foto para 25 anos, como se fosse um jovem adulto. A pele deve parecer fresca e saudável. É crucial manter a identidade e os traços faciais realistas. O resultado deve ser uma fotografia de alta qualidade, estilo retrato profissional, resolução 4K." },
    { id: 'middle-aged', label: 'Meia-idade', icon: UserCog, prompt: "Envelheça o rosto desta pessoa para a meia-idade, com aproximadamente 50 anos. Adicione rugas naturais ao redor dos olhos e boca e uma textura de pele madura. A transformação deve ser fotorrealista, mantendo a pessoa reconhecível. O estilo deve ser de uma fotografia de retrato com iluminação natural, alta qualidade, resolução 4K." },
    { id: 'elderly', label: 'Idoso', icon: UserRound, prompt: "Envelheça a pessoa na foto anexa para parecer um idoso de 75 anos. Adicione rugas realistas, cabelos grisalhos e um leve sorriso que transmita sabedoria. Mantenha os traços faciais e a identidade original. O resultado deve ser uma fotografia de alta qualidade, resolução 4K, com iluminação natural." },
];

const AgeOptionButton: React.FC<{
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled: boolean;
}> = ({ icon: Icon, label, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-full flex flex-col items-center justify-center gap-2 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
        <Icon size={24} className="text-gray-300" />
        <span className="text-xs text-center text-white">{label}</span>
    </button>
);


interface AiAgeChangerPanelProps {
    onBack: () => void;
    image: string | null;
    onApply: (newImage: string) => void;
}

export const AiAgeChangerPanel: React.FC<AiAgeChangerPanelProps> = ({ onBack, image, onApply }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async (prompt: string) => {
        if (!image) {
            setError('Por favor, carregue uma imagem de uma pessoa primeiro.');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const { base64, mimeType } = await imageUrlToBase64(image);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                parts: [
                  { inlineData: { data: base64, mimeType } },
                  { text: prompt },
                ],
              },
              config: {
                  responseModalities: [Modality.IMAGE],
              },
            });

            const candidate = response.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            let newImageFound = false;

            for (const part of parts) {
              if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const newMimeType = part.inlineData.mimeType;
                const imageUrl = `data:${newMimeType};base64,${base64ImageBytes}`;
                onApply(imageUrl);
                newImageFound = true;
                break;
              }
            }
             if (!newImageFound) {
                const text = candidate?.content?.parts?.[0]?.text;
                if (text) throw new Error(`Falha: ${text}`);
                throw new Error("A IA não retornou uma imagem. Tente novamente.");
            }
            
        } catch (err: any) {
            console.error("Erro no Trocador de Idade IA:", err);
            setError(err.message || "Falha ao gerar a imagem. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-[calc(100vw-5rem)] sm:w-80 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl text-white flex flex-col h-full flex-shrink-0 relative">
             {isGenerating && (
                <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center text-center p-4">
                    <svg className="w-16 h-16 animate-spin text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h3 className="text-white font-semibold text-lg">Transformando o tempo...</h3>
                    <p className="text-gray-300 text-sm mt-1">A IA está trabalhando na sua foto.</p>
                </div>
            )}
            <header className="flex items-center gap-4 p-4 border-b border-gray-700/50 flex-shrink-0">
                <button onClick={onBack} className="p-1 hover:bg-gray-700/50 rounded-full">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="font-semibold text-sm">Trocador de Idade IA</h2>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className="text-xs text-gray-400">Selecione um efeito de idade para aplicar à sua foto.</p>
                <div className="grid grid-cols-3 gap-3">
                    {ageOptions.map(option => (
                        <AgeOptionButton
                            key={option.id}
                            icon={option.icon}
                            label={option.label}
                            onClick={() => handleGenerate(option.prompt)}
                            disabled={isGenerating || !image}
                        />
                    ))}
                </div>
                 {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
            </div>
            
            {!image && (
                <div className="p-4 border-t border-gray-700/50 flex-shrink-0">
                    <p className="text-yellow-400 text-xs text-center bg-yellow-900/50 p-3 rounded-lg">Carregue uma foto para usar o Trocador de Idade IA.</p>
                </div>
            )}
        </div>
    );
};
