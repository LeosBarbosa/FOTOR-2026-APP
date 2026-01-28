
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight, Command, Sparkles, Wrench, Palette, Sliders, Type, Image as ImageIcon } from 'lucide-react';

interface SearchItem {
    id: string;
    title: string;
    description: string;
    category: string;
    type: 'tool' | 'nav';
    keywords?: string;
}

const searchIndex: SearchItem[] = [
    // Ferramentas de IA (ToolsPanel)
    { id: 'ai-magic-edit', title: 'Edição Mágica', description: 'Edite partes da imagem com comandos de texto', category: 'IA', type: 'tool' },
    { id: 'magic-eraser', title: 'Borracha Mágica', description: 'Remova objetos indesejados', category: 'IA', type: 'tool' },
    { id: 'image-analysis', title: 'Analisar Imagem', description: 'Obtenha insights e prompts sobre a imagem', category: 'IA', type: 'tool' },
    { id: 'one-tap-enhance', title: 'Melhorar Foto', description: 'Aprimoramento automático de luz e cor', category: 'IA', type: 'tool' },
    { id: 'ai-upscaler', title: 'Upscaler 4K', description: 'Aumente a resolução da imagem', category: 'IA', type: 'tool' },
    { id: 'ai-noise-remover', title: 'Remover Ruído', description: 'Limpe granulação e ruído digital', category: 'IA', type: 'tool' },
    { id: 'old-photo-restorer', title: 'Restaurar Antiga', description: 'Restaure fotos antigas e danificadas', category: 'IA', type: 'tool' },
    { id: 'watermark-remover', title: 'Tirar Marca D\'água', description: 'Remova logos e marcas d\'água', category: 'IA', type: 'tool' },
    
    // Criação (ToolsPanel)
    { id: 'ai-image-generator', title: 'Gerar Imagem', description: 'Crie imagens do zero com texto', category: 'Criar', type: 'tool' },
    { id: 'ai-portrait', title: 'Retrato IA', description: 'Transforme fotos em retratos artísticos', category: 'Criar', type: 'tool' },
    { id: 'lifestyle-scene', title: 'Cena Lifestyle', description: 'Crie cenários de produto ou estilo de vida', category: 'Criar', type: 'tool' },
    { id: 'ai-headshot', title: 'Headshot Pro', description: 'Fotos corporativas profissionais', category: 'Criar', type: 'tool' },
    { id: 'cinematic-portrait', title: 'Retrato Cinema', description: 'Estilo cinematográfico', category: 'Criar', type: 'tool' },
    { id: 'upcoming-2026', title: 'Upcoming 2026', description: 'Visual futurista de ano novo', category: 'Criar', type: 'tool' },
    { id: 'coloring-book', title: 'Livro de Colorir', description: 'Crie desenhos para colorir', category: 'Criar', type: 'tool' },
    { id: 'future-family', title: 'Família Futura', description: 'Preveja o rosto de futuros filhos', category: 'Criar', type: 'tool' },

    // Transformação (ToolsPanel)
    { id: 'progressive-salience', title: 'Saliência Progressiva', description: 'Empurrar pixels, inflar e expandir', category: 'Editar', type: 'tool' },
    { id: 'bg-remover', title: 'Remover Fundo', description: 'Deixe o fundo transparente', category: 'Editar', type: 'tool' },
    { id: 'liquify', title: 'Liquefazer / Inflar', description: 'Distorcer, inflar ou encolher áreas', category: 'Editar', type: 'tool' },
    { id: 'change-bg', title: 'Trocar Fundo', description: 'Substitua o fundo por outro', category: 'Editar', type: 'tool' },
    { id: 'bg-blur', title: 'Desfocar Fundo', description: 'Efeito Bokeh de profundidade', category: 'Editar', type: 'tool' },
    { id: 'ai-expand', title: 'Expandir Imagem', description: 'Outpainting para aumentar a imagem', category: 'Editar', type: 'tool' },
    { id: 'ai-replace', title: 'Substituição IA', description: 'Troque objetos na imagem', category: 'Editar', type: 'tool' },
    { id: 'ai-bg', title: 'Gerar Fundo', description: 'Crie fundos com IA para produtos', category: 'Editar', type: 'tool' },

    // Pessoas (ToolsPanel & BeautyPanel)
    { id: 'ai-skin-retouch', title: 'Pele Perfeita', description: 'Retoque de pele automático', category: 'Beleza', type: 'tool' },
    { id: 'face-blur', title: 'Desfocar Rosto', description: 'Censure rostos para privacidade', category: 'Beleza', type: 'tool' },
    { id: 'virtual-tattoo', title: 'Tatuagem Virtual', description: 'Teste tatuagens no corpo', category: 'Beleza', type: 'tool' },
    { id: 'colorize', title: 'Colorir P&B', description: 'Colorir fotos preto e branco', category: 'Beleza', type: 'tool' },
    { id: 'virtual-try-on', title: 'Provador Virtual', description: 'Experimente roupas com IA', category: 'Beleza', type: 'tool' },
    { id: 'ai-age-changer', title: 'Trocador de Idade', description: 'Envelhecer ou rejuvenescer', category: 'Beleza', type: 'tool' },
    { id: 'ai-face-enhance', title: 'Aprimorar Rosto', description: 'Melhorar detalhes faciais', category: 'Beleza', type: 'tool' },

    // Navegação / Painéis
    { id: 'ajustar', title: 'Ajustes Básicos', description: 'Brilho, Contraste, Saturação', category: 'Navegação', type: 'nav' },
    { id: 'efeitos', title: 'Filtros e Efeitos', description: 'Filtros de cor, vintage, artísticos', category: 'Navegação', type: 'nav' },
    { id: 'texto', title: 'Adicionar Texto', description: 'Inserir legendas e títulos', category: 'Navegação', type: 'nav' },
    { id: 'quadros', title: 'Molduras', description: 'Adicionar bordas e quadros', category: 'Navegação', type: 'nav' },
    { id: 'elementos', title: 'Elementos e Formas', description: 'Emojis, formas geométricas', category: 'Navegação', type: 'nav' },
    { id: 'ocr', title: 'Texto para Imagem (OCR)', description: 'Extrair texto de imagens', category: 'Utilidades', type: 'tool' },
];

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: { id: string; type: 'tool' | 'nav' }) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, onSelect }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filteredItems = searchIndex.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8); // Limit to 8 results

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredItems[selectedIndex]) {
                onSelect({ id: filteredItems[selectedIndex].id, type: filteredItems[selectedIndex].type });
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    const getIcon = (category: string) => {
        switch(category) {
            case 'IA': return <Sparkles size={16} className="text-purple-400" />;
            case 'Criar': return <Palette size={16} className="text-pink-400" />;
            case 'Editar': return <Wrench size={16} className="text-blue-400" />;
            case 'Beleza': return <Sparkles size={16} className="text-yellow-400" />;
            case 'Navegação': return <Sliders size={16} className="text-green-400" />;
            default: return <Command size={16} className="text-gray-400" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="w-full max-w-xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center px-4 py-3 border-b border-gray-700">
                    <Search size={20} className="text-gray-400 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Buscar ferramentas, efeitos, funções..."
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-lg"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-md text-gray-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto p-2" ref={listRef}>
                    {filteredItems.length > 0 ? (
                        filteredItems.map((item, index) => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    onSelect({ id: item.id, type: item.type });
                                    onClose();
                                }}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                                    index === selectedIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                                }`}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className={`p-2 rounded-md ${index === selectedIndex ? 'bg-white/20' : 'bg-gray-700/50'}`}>
                                    {getIcon(item.category)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                                        <span className={`text-[10px] uppercase tracking-wider font-bold ${index === selectedIndex ? 'text-blue-200' : 'text-gray-500'}`}>
                                            {item.category}
                                        </span>
                                    </div>
                                    <p className={`text-xs truncate ${index === selectedIndex ? 'text-blue-100' : 'text-gray-500'}`}>
                                        {item.description}
                                    </p>
                                </div>
                                {index === selectedIndex && <ChevronRight size={16} className="text-white/70" />}
                            </div>
                        ))
                    ) : (
                        <div className="py-8 text-center text-gray-500">
                            <p>Nenhum resultado encontrado para "{query}"</p>
                        </div>
                    )}
                </div>
                
                <div className="px-4 py-2 bg-[#151515] border-t border-gray-700 flex justify-between items-center text-[10px] text-gray-500">
                    <div className="flex gap-4">
                        <span>↑↓ para navegar</span>
                        <span>↵ para selecionar</span>
                        <span>esc para fechar</span>
                    </div>
                    <div>
                        Fotor AI Editor
                    </div>
                </div>
            </div>
        </div>
    );
};
