
import React, { useState, useEffect, useRef } from 'react';
import { Accordion } from './ActionPanel';
import { Star, X, MoveVertical } from 'lucide-react';
import { AiArtEffectsModal, aiArtEffectsData } from './AiArtEffectsModal';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const EffectThumbnail: React.FC<{
    name: string;
    imageUrl: string;
    isSelected: boolean;
    isFavorite: boolean;
    onToggleFavorite: () => void;
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}> = ({ name, imageUrl, isSelected, onClick, onMouseEnter, onMouseLeave, isFavorite, onToggleFavorite }) => (
    <div 
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="cursor-pointer group flex flex-col items-center"
    >
        <div className={`relative aspect-square w-full rounded-md overflow-hidden ring-2 transition-all ${isSelected ? 'ring-blue-500 scale-105 ring-offset-2 ring-offset-[#2c2c2c] shadow-lg shadow-blue-500/40' : 'ring-transparent group-hover:ring-gray-600'}`}>
            <img src={imageUrl} alt={name} className="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy" decoding="async" />
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/40 text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
                <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
        </div>
        <p className={`text-center text-[11px] mt-1.5 transition-colors ${isSelected ? 'text-blue-400 font-bold' : 'text-gray-300'}`}>{name}</p>
    </div>
);

// This data now only contains the regular filters, not the AI art ones.
const filterData = {
    'Cenas': [
        { name: 'Vívido', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=150&h=150&fit=crop&q=80' },
        { name: 'Saturação', imageUrl: 'https://images.unsplash.com/photo-1475113548554-5a36f1f523d6?w=150&h=150&fit=crop&q=80' },
        { name: 'Brilhante', imageUrl: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=150&h=150&fit=crop&q=80' },
    ],
    'Clássico': [
        { name: 'Escuro', imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=150&h=150&fit=crop&q=80' },
        { name: 'Frio', imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=150&h=150&fit=crop&q=80' },
        { name: 'Quente', imageUrl: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=150&h=150&fit=crop&q=80' },
    ],
    'Retrô': [
        { name: 'Anos 70', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=150&h=150&fit=crop&q=80' },
        { name: 'Vintage', imageUrl: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=150&h=150&fit=crop&q=80' },
        { name: 'Sépia', imageUrl: 'https://images.unsplash.com/photo-1562778627-a0f1fa4033e4?w=150&h=150&fit=crop&q=80' },
    ],
    'Filme': [
        { name: 'Cinematográfico', imageUrl: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=150&h=150&fit=crop&q=80' },
        { name: 'Kodachrome', imageUrl: 'https://images.unsplash.com/photo-1510522889103-0453b7453026?w=150&h=150&fit=crop&q=80' },
        { name: 'Technicolor', imageUrl: 'https://images.unsplash.com/photo-1542680453-c9a585f54399?w=150&h=150&fit=crop&q=80' },
    ],
    'Preto e Branco': [
        { name: 'Contraste Alto', imageUrl: 'https://images.unsplash.com/photo-1531826038897-542713a105b3?w=150&h=150&fit=crop&q=80' },
        { name: 'Noir', imageUrl: 'https://images.unsplash.com/photo-1508412846088-72b223403a25?w=150&h=150&fit=crop&q=80' },
        { name: 'Névoa', imageUrl: 'https://images.unsplash.com/photo-1485233157297-3c581692286c?w=150&h=150&fit=crop&q=80' },
    ],
};

const aiArtPreview = [
    { name: 'Desenho animado 3D 2', imageUrl: 'https://images.unsplash.com/photo-1635805737458-26a4501a3597?w=150&h=150&fit=crop&q=80' },
    { name: 'Esboço a Lápis', imageUrl: 'https://images.unsplash.com/photo-1596645939522-990d52b12224?w=150&h=150&fit=crop&q=80' },
    { name: 'Esboço a Tinta', imageUrl: 'https://images.unsplash.com/photo-1614759281297-6a4e695b1e54?w=150&h=150&fit=crop&q=80' },
    { name: 'Princesa de Conto de Fadas', imageUrl: 'https://storage.googleapis.com/aistudio-project-files/89c17245-0925-4632-a550-985c7d2429a3/c101e4a3-7640-41ff-801e-0a563a651fbb' },
    { name: 'Desenho de Linha 2', imageUrl: 'https://images.unsplash.com/photo-1589150307813-f54cff8c3132?w=150&h=150&fit=crop&q=80' },
    { name: 'Emoji', imageUrl: 'https://images.unsplash.com/photo-1611944212129-29959ab84893?w=150&h=150&fit=crop&q=80' },
];

const visualEffects = [
    { name: 'Silhueta', imageUrl: 'https://images.unsplash.com/photo-1484244233201-29892afe6a2c?w=150&h=150&fit=crop&q=80' },
    { name: 'Festivo', imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=150&h=150&fit=crop&q=80' },
    { name: 'Reflexo de Lente', imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=150&h=150&fit=crop&q=80' },
    { name: 'Descolado', imageUrl: 'https://images.unsplash.com/photo-1583344469424-5040f5302f78?w=150&h=150&fit=crop&q=80' },
    { name: 'Pincel Mágico', imageUrl: 'https://images.unsplash.com/photo-1531214159280-079b95d26139?w=150&h=150&fit=crop&q=80' },
    { name: 'Respingo de Cor', imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=150&h=150&fit=crop&q=80' },
];

const cssFilterMap: { [key: string]: string } = {
    'Vívido': 'saturate(1.4) contrast(1.1)',
    'Saturação': 'saturate(2)',
    'Brilhante': 'brightness(1.2) contrast(1.1)',
    'Escuro': 'brightness(0.8) contrast(1.2)',
    'Frio': 'sepia(0.2) contrast(1.1) brightness(1.05)',
    'Quente': 'sepia(0.4) saturate(1.2)',
    'Anos 70': 'sepia(0.5) contrast(0.9) brightness(1.1)',
    'Vintage': 'sepia(0.6) brightness(0.9) contrast(1.1)',
    'Sépia': 'sepia(0.8)',
    'Cinematográfico': 'contrast(1.2) saturate(1.1)',
    'Kodachrome': 'sepia(0.3) saturate(1.5) contrast(1.1)',
    'Technicolor': 'sepia(0.1) saturate(1.8) contrast(1.2)',
    'Contraste Alto': 'contrast(1.5) grayscale(1)',
    'Noir': 'grayscale(1) contrast(1.3) brightness(0.9)',
    'Névoa': 'grayscale(1) contrast(0.9) brightness(1.1)',
    'Silhueta': 'contrast(2) brightness(0.5)',
    'Festivo': 'hue-rotate(20deg) saturate(1.5)',
    'Reflexo de Lente': 'none', // Difícil de simular com CSS
    'Descolado': 'hue-rotate(-30deg) saturate(1.3)',
    'Pincel Mágico': 'contrast(1.2) saturate(1.2)',
    'Respingo de Cor': 'saturate(1.8)',
};

const generateFilterString = (effectName: string | null, intensityValue: number): string => {
    if (!effectName) return 'none';
    const baseFilter = cssFilterMap[effectName];
    if (!baseFilter || baseFilter === 'none') return 'none';

    const intensity = intensityValue / 100;

    const filterRegex = /(\w+)\(([\d\.]+\w*)\)/g;
    
    const newFilter = baseFilter.replace(filterRegex, (match, funcName, value) => {
        const numericValue = parseFloat(value);
        const unit = value.replace(String(numericValue), '');

        let defaultValue = 1;
        if (['sepia', 'grayscale', 'hue-rotate', 'invert', 'opacity', 'blur'].includes(funcName)) {
            defaultValue = 0;
        }

        const newValue = defaultValue + (numericValue - defaultValue) * intensity;

        return `${funcName}(${newValue.toFixed(2)}${unit})`;
    });

    return newFilter;
};

interface AppliedEffect {
  id: number;
  name: string;
  intensity: number;
}

interface CustomPreset {
    name: string;
    layers: Omit<AppliedEffect, 'id'>[];
}

interface EffectsPanelProps {
    image: string | null;
    setImage: (image: string | null) => void;
    setTempFilter: (filter: string | null) => void;
    setAppliedCssFilter: (filter: string | null) => void;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({ image, setImage, setTempFilter, setAppliedCssFilter }) => {
    const [activeTab, setActiveTab] = useState('Filtros');
    const [effectLayers, setEffectLayers] = useState<AppliedEffect[]>([]);
    const [selectedAiEffect, setSelectedAiEffect] = useState<{ name: string; imageUrl: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [favorites, setFavorites] = useState<string[]>(['Emoji']);
    const [isProcessing, setIsProcessing] = useState(false);
    const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
    const [draggedLayerId, setDraggedLayerId] = useState<number | null>(null);
    const nextId = useRef(0);

    // Combine all available effects for easy lookup and filtering
    const allEffectsRaw = [
        ...aiArtPreview,
        ...Object.values(filterData).flat(),
        ...visualEffects,
        ...Object.values(aiArtEffectsData).flat()
    ];

    // Deduplicate based on name to avoid key collisions
    const allEffects = Array.from(new Map(allEffectsRaw.map(item => [item.name, item])).values());

    // Create a Set of AI effect names for efficient checking
    const aiEffectNames = new Set([
        ...aiArtPreview.map(e => e.name),
        ...Object.values(aiArtEffectsData).flat().map(e => e.name)
    ]);

    const favoriteEffects = allEffects.filter(effect => favorites.includes(effect.name));

    // Update parent component with the combined filter string whenever layers change
    useEffect(() => {
        const combinedFilter = effectLayers
            .map(layer => generateFilterString(layer.name, layer.intensity))
            .join(' ');
        setAppliedCssFilter(combinedFilter || null);
    }, [effectLayers, setAppliedCssFilter]);

    // Reset all effects when the base image changes
    useEffect(() => {
        setEffectLayers([]);
        setSelectedAiEffect(null);
        setAppliedCssFilter(null);
    }, [image, setAppliedCssFilter]);

    const handleToggleFavorite = (effectName: string) => {
        setFavorites(prev => 
            prev.includes(effectName) 
                ? prev.filter(name => name !== effectName) 
                : [...prev, effectName]
        );
    };

    const handleApplyEffect = async (effectNameToApply: string) => {
        if (!image) return;
        setIsProcessing(true);
        try {
            const { base64, mimeType } = await imageUrlToBase64(image);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let prompt = '';
            switch(effectNameToApply) {
                case 'Desenho animado 3D 2':
                    prompt = `Uma foto de perfil no estilo de um personagem de desenho animado 3D. O personagem deve ter características exageradas, olhos grandes e expressivos e uma aparência geral amigável e acessível. A iluminação deve ser suave e difusa, e o fundo deve ser uma cor sólida e vibrante que complemente o personagem. A textura da pele deve ser suave e plástica, e o cabelo deve ser estilizado em mechas grossas. Mantenha as características faciais da pessoa.`;
                    break;
                case 'Esboço a Lápis':
                    prompt = "Um retrato de esboço a lápis hiper-realista, desenhado com detalhes de grafite ultrafinos e sombreamento realista. Cada textura - pele, cabelo, tecido e fundo - é renderizada em traços de lápis precisos com profundidade de luz e sombra realistas. A obra de arte parece desenhada à mão em papel de esboço marfim liso, mostrando delicadas variações de pressão e borrões suaves para realismo. Tom monocromático, iluminação de alto contraste, ilustração a lápis cinematográfica, estilo de arte premiado. Detalhe de lápis 8K, profundidade de carvão, fundo gradiente suave.";
                    break;
                case 'Esboço a Tinta':
                    prompt = `Crie uma imagem de um esboço/desenho a tinta no estilo de uma foto de um rosto idêntico à imagem de referência enviada — mantenha todas as características faciais, proporções e expressões exatamente iguais. Use tinta de cor preta com detalhes de linha intrincados e finos, desenhado sobre um fundo no estilo de página de caderno. Mostre uma mão direita segurando uma caneta e uma borracha perto do esboço, como se o artista ainda estivesse trabalhando. Inclua uma assinatura esboçada conectada por uma linha de lápis, dizendo 'por: Artista' em um estilo de escrita artística à mão. Estilo: desenho fotorrealista, textura de tinta detalhada, sombreamento suave, fibra de papel suave, resolução 8K, formato 1:1.`;
                    break;
                case 'Princesa de Conto de Fadas':
                    prompt = `Uma fotografia fantástica com uma estética de conto de fadas e mágica, capturando uma criança (uma menina) vestida de princesa. A pessoa está de pé, de frente para a câmera, com um sorriso largo e adorável, transmitindo alegria e inocência. **Crucialmente, ela segura uma cúpula de vidro com as duas mãos, centralizada e na altura do peito. Dentro da cúpula há uma única rosa vermelha encantada, com as pétalas ligeiramente caídas como a rosa de A Bela e a Fera da Disney.**

Ela usa um deslumbrante vestido de princesa **de ombros caídos** em um tom vibrante de amarelo dourado, com um corpete justo e uma saia volumosa e fluida, adornada com brilhos e **apliques florais dourados**. Em sua cabeça, uma pequena e brilhante coroa dourada **com uma joia rosa central**.

Seu cabelo é escuro e longo, penteado em um rabo de cavalo alto, com uma franja reta emoldurando seu rosto.

O fundo é um grande salão de castelo iluminado, com janelas em arco revelando uma luz suave e dourada, criando uma atmosfera mágica e acolhedora. A iluminação é de qualidade de estúdio, suave e direcional, destacando os detalhes do vestido e o brilho da coroa, além de dar uma ênfase mágica à rosa encantada.

Configurações da câmera: Capturada com uma lente de retrato prime (por exemplo, 85mm ou 50mm) em uma câmera full-frame para uma perspectiva lisonjeira e um bokeh suave. Abertura definida entre f/2.0 e f/2.8 para isolar a criança do fundo do castelo. ISO 100-200 para máxima qualidade de imagem de estúdio. Velocidade do obturador de 1/160s a 1/250s. Iluminação de estúdio com um grande softbox ou octabox como luz principal para uma luz suave e envolvente, e luzes de fundo para iluminar o castelo e criar profundidade.

Instruções para o "nano banana":

"**PRIORIDADE 1: NÃO ALTERE O ROSTO. Use os traços faciais originais da imagem enviada.**"`;
                    break;
                default:
                    // Fallback generic prompt for any other AI effect (from favorites or modal)
                    if (aiEffectNames.has(effectNameToApply)) {
                        prompt = `Transforme esta imagem no estilo artístico "${effectNameToApply}". Mantenha a composição original, o assunto principal e as características faciais, mas aplique o estilo visual, as texturas, as cores e a técnica artística associados a "${effectNameToApply}". O resultado deve ser uma interpretação artística de alta qualidade da imagem original neste estilo específico.`;
                    }
                    break;
            }
             if (!prompt) return;

            // Using Gemini 2.5 Flash Image for artistic style transfer
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
                setImage(imageUrl); // This will trigger the useEffect to clear layers
                setSelectedAiEffect(null);
                imageFound = true;
                break;
              }
            }
            
            if (!imageFound) {
                const textResponse = parts.find(p => p.text)?.text;
                if (textResponse) {
                     throw new Error(`A IA não gerou a imagem. Resposta: ${textResponse}`);
                }
                if (candidate?.finishReason) {
                     throw new Error(`Geração bloqueada. Motivo: ${candidate.finishReason}`);
                }
                throw new Error("A IA não retornou uma imagem.");
            }
        } catch (error: any) {
            console.error("Erro ao aplicar efeito de IA:", error);
            alert(error.message || "Falha ao aplicar efeito. Tente novamente.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSelectEffect = (effect: { name: string; imageUrl: string }) => {
        const isAiEffect = aiEffectNames.has(effect.name);
        
        if (isAiEffect) {
            setSelectedAiEffect(prev => (prev?.name === effect.name ? null : effect));
        } else {
            const layerIndex = effectLayers.findIndex(layer => layer.name === effect.name);
            if (layerIndex > -1) {
                // If it exists, remove it
                setEffectLayers(prev => prev.filter((_, index) => index !== layerIndex));
            } else {
                // If it doesn't exist, add it
                setEffectLayers(prev => [...prev, { id: nextId.current++, name: effect.name, intensity: 100 }]);
            }
            setSelectedAiEffect(null);
        }
    };

    const handleMouseEnter = (effectName: string) => {
        const isApplied = effectLayers.some(l => l.name === effectName);
        if (!isApplied) {
            setTempFilter(generateFilterString(effectName, 100));
        }
    };
    
    const handleIntensityChange = (id: number, newIntensity: number) => {
        setEffectLayers(prevLayers =>
            prevLayers.map((layer) => (layer.id === id ? { ...layer, intensity: newIntensity } : layer))
        );
    };

    const handleRemoveLayer = (idToRemove: number) => {
        setEffectLayers(prevLayers => prevLayers.filter(layer => layer.id !== idToRemove));
    };

    const handleSavePreset = () => {
        const name = window.prompt("Digite um nome para o seu efeito:");
        if (name && name.trim()) {
            const layersToSave = effectLayers.map(({ id, ...rest }) => rest);
            setCustomPresets(prev => [...prev, { name: name.trim(), layers: layersToSave }]);
        }
    };

    const handleApplyPreset = (preset: CustomPreset) => {
        const newLayersWithIds = preset.layers.map(layer => ({
            ...layer,
            id: nextId.current++,
        }));
        setEffectLayers(newLayersWithIds);
    };

    const handleDeletePreset = (indexToDelete: number) => {
        setCustomPresets(prev => prev.filter((_, index) => index !== indexToDelete));
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, layer: AppliedEffect) => {
        setDraggedLayerId(layer.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetLayerId: number) => {
        e.preventDefault();
        if (draggedLayerId === null || draggedLayerId === targetLayerId) return;

        const draggedIndex = effectLayers.findIndex(l => l.id === draggedLayerId);
        const targetIndex = effectLayers.findIndex(l => l.id === targetLayerId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newLayers = [...effectLayers];
        const [draggedItem] = newLayers.splice(draggedIndex, 1);
        newLayers.splice(targetIndex, 0, draggedItem);

        setEffectLayers(newLayers);
        setDraggedLayerId(null);
    };

    return (
        <div className="w-[calc(100vw-5rem)] sm:w-80 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl flex flex-col h-full flex-shrink-0">
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                
                <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-md mx-2 mb-2">
                    <button onClick={() => setActiveTab('Filtros')} className={`flex-1 text-xs py-1.5 rounded-md ${activeTab === 'Filtros' ? 'bg-gray-600' : 'text-gray-300 hover:bg-gray-700/50'}`}>Filtros</button>
                    <button onClick={() => setActiveTab('Efeitos IA')} className={`flex-1 text-xs py-1.5 rounded-md ${activeTab === 'Efeitos IA' ? 'bg-gray-600' : 'text-gray-300 hover:bg-gray-700/50'}`}>Efeitos IA</button>
                    <button onClick={() => setActiveTab('Camadas')} className={`flex-1 text-xs py-1.5 rounded-md ${activeTab === 'Camadas' ? 'bg-gray-600' : 'text-gray-300 hover:bg-gray-700/50'}`}>Camadas</button>
                </div>

                {activeTab === 'Filtros' && (
                    <div className="space-y-1">
                        <Accordion title="Favoritos">
                            <div className="grid grid-cols-3 gap-2 px-2">
                                {favoriteEffects.map(effect => (
                                    <EffectThumbnail 
                                        key={effect.name} 
                                        {...effect} 
                                        isSelected={effectLayers.some(l => l.name === effect.name) || selectedAiEffect?.name === effect.name}
                                        isFavorite={true}
                                        onToggleFavorite={() => handleToggleFavorite(effect.name)}
                                        onClick={() => handleApplyEffect(effect.name)}
                                        onMouseEnter={() => handleMouseEnter(effect.name)}
                                        onMouseLeave={() => setTempFilter(null)}
                                    />
                                ))}
                                {favoriteEffects.length === 0 && <p className="col-span-3 text-center text-xs text-gray-500 py-2">Nenhum favorito.</p>}
                            </div>
                        </Accordion>
                        {Object.entries(filterData).map(([category, filters]) => (
                            <Accordion key={category} title={category}>
                                <div className="grid grid-cols-3 gap-2 px-2">
                                    {filters.map(filter => (
                                        <EffectThumbnail 
                                            key={filter.name} 
                                            {...filter} 
                                            isSelected={effectLayers.some(l => l.name === filter.name)}
                                            isFavorite={favorites.includes(filter.name)}
                                            onToggleFavorite={() => handleToggleFavorite(filter.name)}
                                            onClick={() => handleSelectEffect(filter)}
                                            onMouseEnter={() => handleMouseEnter(filter.name)}
                                            onMouseLeave={() => setTempFilter(null)}
                                        />
                                    ))}
                                </div>
                            </Accordion>
                        ))}
                         <Accordion title="Efeitos Visuais">
                            <div className="grid grid-cols-3 gap-2 px-2">
                                {visualEffects.map(effect => (
                                    <EffectThumbnail 
                                        key={effect.name} 
                                        {...effect} 
                                        isSelected={effectLayers.some(l => l.name === effect.name)}
                                        isFavorite={favorites.includes(effect.name)}
                                        onToggleFavorite={() => handleToggleFavorite(effect.name)}
                                        onClick={() => handleSelectEffect(effect)}
                                        onMouseEnter={() => handleMouseEnter(effect.name)}
                                        onMouseLeave={() => setTempFilter(null)}
                                    />
                                ))}
                            </div>
                        </Accordion>
                    </div>
                )}

                {activeTab === 'Efeitos IA' && (
                    <div className="space-y-1 px-2">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-md text-xs font-bold text-white mb-4 hover:brightness-110 transition-all"
                        >
                            Explorar Biblioteca de Arte IA
                        </button>
                        <div className="grid grid-cols-3 gap-2">
                            {aiArtPreview.map(effect => (
                                <EffectThumbnail 
                                    key={effect.name} 
                                    {...effect} 
                                    isSelected={selectedAiEffect?.name === effect.name}
                                    isFavorite={favorites.includes(effect.name)}
                                    onToggleFavorite={() => handleToggleFavorite(effect.name)}
                                    onClick={() => handleApplyEffect(effect.name)}
                                    onMouseEnter={() => {}}
                                    onMouseLeave={() => {}}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'Camadas' && (
                    <div className="space-y-2 px-2">
                        {effectLayers.length === 0 ? (
                            <p className="text-gray-500 text-xs text-center py-8">Nenhuma camada de efeito aplicada.</p>
                        ) : (
                            effectLayers.map((layer) => (
                                <div 
                                    key={layer.id} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, layer)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, layer.id)}
                                    className="bg-gray-700/50 p-3 rounded-md group hover:bg-gray-600/50 transition-colors border border-transparent hover:border-gray-500"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <MoveVertical size={14} className="text-gray-500 cursor-grab" />
                                            <span className="text-xs font-medium text-white">{layer.name}</span>
                                        </div>
                                        <button onClick={() => handleRemoveLayer(layer.id)} className="text-gray-500 hover:text-red-400"><X size={14}/></button>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={layer.intensity} 
                                        onChange={(e) => handleIntensityChange(layer.id, Number(e.target.value))}
                                        className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            ))
                        )}
                        {effectLayers.length > 0 && (
                             <div className="pt-4 border-t border-gray-700/50 mt-4">
                                <button onClick={handleSavePreset} className="w-full py-2 bg-gray-700 rounded-md text-xs text-gray-300 hover:text-white hover:bg-gray-600">
                                    Salvar como Predefinição
                                </button>
                            </div>
                        )}
                        
                        {customPresets.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-xs font-bold text-gray-400 mb-2">MEUS PRESETS</h3>
                                {customPresets.map((preset, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-800/50 p-2 rounded mb-1">
                                        <button onClick={() => handleApplyPreset(preset)} className="text-xs text-blue-400 hover:underline">{preset.name}</button>
                                        <button onClick={() => handleDeletePreset(idx)} className="text-gray-600 hover:text-red-400"><X size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* AI Processing Overlay */}
            {isProcessing && (
                <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                    <p className="text-white text-xs">Aplicando Arte IA...</p>
                </div>
            )}

            <AiArtEffectsModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
            />
        </div>
    );
};
