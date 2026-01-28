
import React, { useState } from 'react';
import { X, Star, ChevronLeft, ChevronRight } from 'lucide-react';

// Mock data for the modal
export const aiArtEffectsData = {
    Populares: [
        { name: 'Desenho animado 3D 2', imageUrl: 'https://picsum.photos/seed/cartoon3d2/150' },
        { name: 'Desenho de Linha 3', imageUrl: 'https://picsum.photos/seed/line3/150' },
        { name: 'Emoji', imageUrl: 'https://picsum.photos/seed/emoji/150' },
        { name: 'Retrato Moderno', imageUrl: 'https://picsum.photos/seed/modernp/150' },
        { name: 'Estilo Ghibli 2', imageUrl: 'https://picsum.photos/seed/ghibli2/150' },
        { name: 'Aquarela X', imageUrl: 'https://picsum.photos/seed/watercolorx/150' },
    ],
    'Desenho animado': [
        { name: 'Animes Kawaii', imageUrl: 'https://picsum.photos/seed/kawaii/150' },
        { name: 'Desenho de sobrancelha', imageUrl: 'https://picsum.photos/seed/eyebrow/150' },
        { name: 'Anime', imageUrl: 'https://picsum.photos/seed/anime/150' },
    ],
    Esboço: [
        { name: 'Esboço 3', imageUrl: 'https://picsum.photos/seed/sketch3/150' },
        { name: 'Desenho de Linha 3', imageUrl: 'https://picsum.photos/seed/linedraw3/150' },
        { name: 'Esboço Retrô', imageUrl: 'https://picsum.photos/seed/retrosketch/150' },
    ],
    Aquarela: [
         { name: 'Hora Dourada', imageUrl: 'https://picsum.photos/seed/goldenhour/150' },
         { name: 'Aquarela 3', imageUrl: 'https://picsum.photos/seed/watercolor3/150' },
         { name: 'Aquarela', imageUrl: 'https://picsum.photos/seed/watercolor/150' },
    ],
    Universal: [
        { name: 'Quadrinhos Americanos', imageUrl: 'https://picsum.photos/seed/uscomics/150' },
        { name: 'Selo de viagem plano', imageUrl: 'https://picsum.photos/seed/travelstamp/150' },
        { name: 'Pin-up', imageUrl: 'https://picsum.photos/seed/pinup/150' },
    ],
    Artista: [
        { name: 'Van Gogh', imageUrl: 'https://picsum.photos/seed/vangogh/150' },
        { name: 'Caravaggio', imageUrl: 'https://picsum.photos/seed/caravaggio/150' },
        { name: 'Monet', imageUrl: 'https://picsum.photos/seed/monet/150' },
    ]
};

const categories = ['Favorito', 'Todos', 'Populares', 'Desenho animado', 'Esboço', 'Aquarela', 'Universal', 'Artista', 'Pixel', 'Figura de ação'];

interface AiArtEffectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    favorites: string[];
    onToggleFavorite: (effectName: string) => void;
}

const AiArtThumbnail: React.FC<{
    name: string;
    imageUrl: string;
    isFavorite: boolean;
    onToggleFavorite: () => void;
}> = ({ name, imageUrl, isFavorite, onToggleFavorite }) => (
    <div className="cursor-pointer group flex flex-col items-center">
        <div className="relative aspect-square w-full rounded-md overflow-hidden bg-gray-700">
            <img src={imageUrl} alt={name} className="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy" decoding="async" />
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/40 text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
        </div>
        <p className="text-center text-[11px] mt-1.5 text-gray-300 group-hover:text-white">{name}</p>
    </div>
);


export const AiArtEffectsModal: React.FC<AiArtEffectsModalProps> = ({ isOpen, onClose, favorites, onToggleFavorite }) => {
    const [activeCategory, setActiveCategory] = useState('Todos');

    if (!isOpen) return null;
    
    const allEffects = Object.values(aiArtEffectsData).flat();
    const favoriteEffects = allEffects.filter(effect => favorites.includes(effect.name));

    const renderContent = () => {
        // Handle Favorite category
        if (activeCategory === 'Favorito') {
            return (
                <div className="grid grid-cols-3 gap-4">
                    {favoriteEffects.length > 0 ? favoriteEffects.map(effect => (
                        <AiArtThumbnail 
                            key={effect.name} {...effect} 
                            isFavorite={favorites.includes(effect.name)}
                            onToggleFavorite={() => onToggleFavorite(effect.name)}
                        />
                    )) : <p className="text-gray-400 col-span-3 text-center text-sm">Você ainda não salvou nenhum efeito.</p>}
                </div>
            );
        }

        // Handle 'Todos' category, which shows all categories with a "More" link
        if (activeCategory === 'Todos') {
             return Object.entries(aiArtEffectsData).map(([category, effects]) => (
                 <section key={category} className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-white font-semibold text-sm">{category}</h3>
                        <button onClick={() => setActiveCategory(category)} className="text-blue-400 hover:underline text-xs">Mais &gt;</button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {effects.slice(0, 6).map(effect => ( // Show a preview of up to 6 effects
                            <AiArtThumbnail 
                                key={effect.name} {...effect} 
                                isFavorite={favorites.includes(effect.name)}
                                onToggleFavorite={() => onToggleFavorite(effect.name)}
                            />
                        ))}
                    </div>
                </section>
            ));
        }

        // Handle specific categories from the data object
        const categoryEffects = aiArtEffectsData[activeCategory as keyof typeof aiArtEffectsData];
        if (categoryEffects) {
             return (
                <div className="grid grid-cols-3 gap-4">
                    {categoryEffects.map(effect => (
                        <AiArtThumbnail 
                            key={effect.name} {...effect} 
                            isFavorite={favorites.includes(effect.name)}
                            onToggleFavorite={() => onToggleFavorite(effect.name)}
                        />
                    ))}
                </div>
            );
        }

        // Fallback for categories in the list but not in the data (like Pixel, etc.)
        return <p className="text-gray-400 col-span-3 text-center text-sm">Efeitos para esta categoria estarão disponíveis em breve.</p>;
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center" onClick={onClose}>
            <div className="bg-[#2c2c2c] w-[500px] h-[90vh] rounded-lg flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
                    <h2 className="font-bold text-white text-base">Efeitos de arte de IA</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </header>
                
                <div className="flex items-center gap-2 p-2 border-b border-gray-700/50 overflow-x-auto flex-shrink-0">
                    <button className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-full"><ChevronLeft size={16}/></button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                activeCategory === cat ? 'bg-white text-black' : 'text-gray-300 hover:bg-gray-700/50'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                    <button className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-full"><ChevronRight size={16}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                   {renderContent()}
                </div>

            </div>
        </div>
    );
};
