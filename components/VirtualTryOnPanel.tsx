
import React, { useState, useRef } from 'react';
import { ArrowLeft, ChevronDown, Upload, Shirt, Scissors, X } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const presets = [
    { name: 'Conjunto de biquíni', imageUrl: 'https://images.unsplash.com/photo-1574312526341-a185b85e0586?w=200&h=200&fit=crop' },
    { name: 'Conjunto de jeans', imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&h=200&fit=crop' },
    { name: 'Terno', imageUrl: 'https://images.unsplash.com/photo-1594938382928-e87a2a1a45a3?w=200&h=200&fit=crop' },
    { name: 'Jaqueta de moto', imageUrl: 'https://images.unsplash.com/photo-1603563920979-fe33358ab4a6?w=200&h=200&fit=crop' },
];

const clothingTypes = [
    { id: 'full', label: 'Conjuntos completos', icon: Shirt },
    { id: 'top', label: 'Topo', icon: Shirt },
    { id: 'bottom', label: 'Partes de baixo', icon: Scissors },
];

interface UploadBoxProps {
    image: string | null;
    onClick: () => void;
    onRemove: () => void;
    placeholderText: string;
}

const UploadBox: React.FC<UploadBoxProps> = ({ image, onClick, onRemove, placeholderText }) => (
    <div className="relative bg-gray-700/50 p-4 rounded-md text-center flex-1 aspect-square flex flex-col items-center justify-center cursor-pointer" onClick={onClick}>
        {image ? (
            <>
                <img src={image} alt="Roupa carregada" className="w-full h-full object-contain rounded-md" />
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:bg-black/70"
                >
                    <X size={12} />
                </button>
            </>
        ) : (
            <>
                <div className="w-16 h-16 bg-gray-900/50 rounded-lg mx-auto flex items-center justify-center">
                    <Upload size={28} className="text-gray-500" />
                </div>
                <p className="text-xs mt-2 text-gray-400">{placeholderText}</p>
                <p className="text-[10px] text-gray-500 mt-1">Guia de upload</p>
            </>
        )}
    </div>
);

interface VirtualTryOnPanelProps {
    onBack: () => void;
    image: string | null;
    onApply: (newImage: string) => void;
}

export const VirtualTryOnPanel: React.FC<VirtualTryOnPanelProps> = ({ onBack, image, onApply }) => {
    const [prompt, setPrompt] = useState('');
    const [activeTab, setActiveTab] = useState('Carregar');
    const [clothingType, setClothingType] = useState(clothingTypes[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clothingImages, setClothingImages] = useState<(string | null)[]>([null, null]);

    const clothingInputRef1 = useRef<HTMLInputElement>(null);
    const clothingInputRef2 = useRef<HTMLInputElement>(null);

    const handleClothingFileChange = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newImages = [...clothingImages];
                newImages[index] = e.target?.result as string;
                setClothingImages(newImages);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeClothingImage = (index: number) => {
        const newImages = [...clothingImages];
        newImages[index] = null;
        setClothingImages(newImages);
    };

    const handleGenerate = async () => {
        if (!image) {
            setError('Por favor, carregue uma imagem de uma pessoa primeiro.');
            return;
        }
        const hasClothingImage = clothingImages.some(img => img !== null);
        if (!prompt.trim() && !hasClothingImage) {
            setError('Por favor, descreva uma roupa ou carregue uma imagem de referência.');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const { base64: personBase64, mimeType: personMimeType } = await imageUrlToBase64(image);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const parts: any[] = [
                { inlineData: { data: personBase64, mimeType: personMimeType } }
            ];
    
            let fullPrompt = `Task: Virtual Try-on. Replace the clothing of the person in the first image.
            
            Guidelines:
            1. ONLY change the clothing. DO NOT alter the face, hair, body shape, or background.
            2. Match the lighting, shadows, and fabric wrinkles to the person's pose and environment.
            3. Use the provided description or reference images for the new outfit style.
            4. Clothing Type: ${clothingType.label}.`;
    
            if (prompt.trim()) {
                fullPrompt += `\nStyle Description: "${prompt}".`;
            }
    
            const validClothingImages = clothingImages.filter(img => img !== null) as string[];
            if (validClothingImages.length > 0) {
                fullPrompt += `\nVisual Reference: Use the attached clothing images as the primary design source.`;
                for (const clothingImg of validClothingImages) {
                    const { base64: cB64, mimeType: cMime } = await imageUrlToBase64(clothingImg);
                    parts.push({ inlineData: { data: cB64, mimeType: cMime } });
                }
            }
            
            parts.push({ text: fullPrompt });

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts },
              config: { responseModalities: [Modality.IMAGE] },
            });

            const candidate = response.candidates?.[0];
            const partsRes = candidate?.content?.parts || [];
            let imageFound = false;

            for (const part of partsRes) {
              if (part.inlineData) {
                const resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                onApply(resultUrl);
                imageFound = true;
                break;
              }
            }

            if (!imageFound) {
                if (candidate?.finishReason === 'SAFETY') {
                    throw new Error("A geração foi bloqueada pelos filtros de segurança. Tente uma descrição diferente.");
                }
                const text = partsRes.find(p => p.text)?.text;
                throw new Error(text || "A IA não conseguiu gerar a imagem. Tente novamente.");
            }
            
        } catch (err: any) {
            console.error("Erro no provador virtual:", err);
            setError(err.message || "Falha ao gerar o visual.");
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
                    <h3 className="text-white font-semibold text-lg">Processando Visual Pro...</h3>
                    <p className="text-gray-300 text-sm mt-1">O Gemini 2.5 Flash está vestindo seu modelo.</p>
                </div>
            )}
            <input type="file" ref={clothingInputRef1} onChange={(e) => handleClothingFileChange(e, 0)} className="hidden" accept="image/*" />
            <input type="file" ref={clothingInputRef2} onChange={(e) => handleClothingFileChange(e, 1)} className="hidden" accept="image/*" />

            <header className="flex items-center gap-4 p-4 border-b border-gray-700/50 flex-shrink-0">
                <button onClick={onBack} className="p-1 hover:bg-gray-700/50 rounded-full">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="font-semibold text-sm">Provador de roupas (Pro)</h2>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between bg-gray-700/50 px-3 py-2 rounded-md text-sm"
                    >
                        <div className="flex items-center gap-2">
                            <clothingType.icon size={16} />
                            <span>{clothingType.label}</span>
                        </div>
                        <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#3a3a3a] rounded-md shadow-lg z-10">
                            {clothingTypes.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => {
                                        setClothingType(type);
                                        setIsDropdownOpen(false);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-600/50 text-sm"
                                >
                                    <type.icon size={16} />
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-md">
                    <button onClick={() => setActiveTab('Carregar')} className={`flex-1 text-xs py-1.5 rounded-md ${activeTab === 'Carregar' ? 'bg-gray-600' : ''}`}>Carregar</button>
                    <button onClick={() => setActiveTab('Predefinições')} className={`flex-1 text-xs py-1.5 rounded-md ${activeTab === 'Predefinições' ? 'bg-gray-600' : ''}`}>Predefinições</button>
                </div>

                {activeTab === 'Carregar' && (
                    <div className="flex gap-2">
                        <UploadBox 
                            image={clothingImages[0]}
                            onClick={() => clothingInputRef1.current?.click()}
                            onRemove={() => removeClothingImage(0)}
                            placeholderText={clothingType.id === 'full' ? 'Carregar Topo' : 'Carregar Imagem'}
                        />
                        {clothingType.id === 'full' && (
                            <UploadBox 
                                image={clothingImages[1]}
                                onClick={() => clothingInputRef2.current?.click()}
                                onRemove={() => removeClothingImage(1)}
                                placeholderText="Carregar Base"
                            />
                        )}
                    </div>
                )}
                
                {activeTab === 'Predefinições' && (
                     <div className="grid grid-cols-2 gap-2">
                        {presets.map(preset => (
                            <div key={preset.name} className="cursor-pointer group" onClick={() => setPrompt(preset.name)}>
                                <img src={preset.imageUrl} alt={preset.name} className="w-full h-24 object-cover rounded-md group-hover:opacity-80" loading="lazy" decoding="async" />
                                <p className="text-[11px] text-center mt-1 text-gray-400 group-hover:text-white">{preset.name}</p>
                            </div>
                        ))}
                    </div>
                )}

                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Descreva o estilo, tecido ou cor desejada..."
                    className="w-full h-24 bg-gray-700/50 p-2 rounded-md text-sm resize-none placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
            
            <div className="p-4 border-t border-gray-700/50 flex-shrink-0">
                {error && <p className="text-red-400 text-[11px] text-center mb-2 leading-tight">{error}</p>}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !image}
                    className="w-full bg-blue-600 font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed h-11 flex items-center justify-center gap-2"
                >
                    {isGenerating ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Aplicar Provador Pro'}
                </button>
            </div>
        </div>
    );
};
