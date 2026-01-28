
import React from 'react';
import { Accordion } from './ActionPanel';

interface ToolCardProps {
    title: string;
    imageUrl: string;
    onClick?: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, imageUrl, onClick }) => (
    <button onClick={onClick} className="flex flex-col text-center cursor-pointer group disabled:cursor-not-allowed w-full" disabled={!onClick}>
        <div className="aspect-square w-full bg-gray-700 rounded-lg overflow-hidden transition-transform group-hover:scale-105 relative border border-gray-700 group-hover:border-gray-500">
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        </div>
        <span className="text-[11px] font-medium text-gray-300 mt-2 group-hover:text-white transition-colors line-clamp-1">{title}</span>
    </button>
);

const toolsData = [
    {
        category: 'Edição com IA',
        tools: [
            { id: 'ai-magic-edit', title: 'Edição Mágica', imageUrl: 'https://images.unsplash.com/photo-1615212814364-88c9e4c33113?w=150&h=150&fit=crop&q=80' },
            { id: 'magic-eraser', title: 'Borracha Mágica', imageUrl: 'https://images.unsplash.com/photo-1516961642265-531546e84af2?w=150&h=150&fit=crop&q=80' },
            { id: 'image-analysis', title: 'Analisar Imagem', imageUrl: 'https://images.unsplash.com/photo-1581093582121-a385a03f48a4?w=150&h=150&fit=crop&q=80' },
            { id: 'one-tap-enhance', title: 'Melhorar Foto', imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=150&h=150&fit=crop&q=80' },
            { id: 'ai-upscaler', title: 'Upscaler 4K', imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80' },
            { id: 'ai-noise-remover', title: 'Remover Ruído', imageUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=150&h=150&fit=crop&q=80' },
            { id: 'old-photo-restorer', title: 'Restaurar Antiga', imageUrl: 'https://images.unsplash.com/photo-1548502633-d38059599a93?w=150&h=150&fit=crop&q=80' },
             { id: 'watermark-remover', title: 'Tirar Marca D\'água', imageUrl: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=150&h=150&fit=crop&q=80' },
        ]
    },
    {
        category: 'Criar com IA',
        tools: [
            { id: 'ai-image-generator', title: 'Gerar Imagem', imageUrl: 'https://images.unsplash.com/photo-1617791160505-6f00504e35d9?w=150&h=150&fit=crop&q=80' },
            { id: 'ai-portrait', title: 'Retrato IA', imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&q=80' },
            { id: 'lifestyle-scene', title: 'Cena Lifestyle', imageUrl: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=150&h=150&fit=crop&q=80' },
            { id: 'ai-headshot', title: 'Headshot Pro', imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&q=80' },
            { id: 'cinematic-portrait', title: 'Retrato Cinema', imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=150&h=150&fit=crop&q=80' },
             { id: 'upcoming-2026', title: 'Upcoming 2026', imageUrl: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=150&h=150&fit=crop&q=80' },
            { id: 'coloring-book', title: 'Livro de Colorir', imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=150&h=150&fit=crop&q=80' },
             { id: 'future-family', title: 'Família Futura', imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=150&h=150&fit=crop&q=80' },
        ]
    },
     {
        category: 'Transformação',
        tools: [
            { id: 'face-swap', title: 'Troca de Rostos', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80' },
            { id: 'progressive-salience', title: 'Saliência Progressiva', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop&q=80' },
            { id: 'bg-remover', title: 'Remover Fundo', imageUrl: 'https://images.unsplash.com/photo-1515461896364-9d858230363e?w=150&h=150&fit=crop&q=80' },
            { id: 'liquify', title: 'Liquefazer (Inflar)', imageUrl: 'https://images.unsplash.com/photo-1519757077083-d92295fa90e6?w=150&h=150&fit=crop&q=80' },
            { id: 'change-bg', title: 'Trocar Fundo', imageUrl: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=150&h=150&fit=crop&q=80' },
            { id: 'bg-blur', title: 'Desfocar Fundo', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80' },
            { id: 'ai-expand', title: 'Expandir Imagem', imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=150&h=150&fit=crop&q=80' },
             { id: 'ai-replace', title: 'Substituição IA', imageUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=150&h=150&fit=crop&q=80' },
              { id: 'ai-bg', title: 'Gerar Fundo', imageUrl: 'https://images.unsplash.com/photo-1508615070457-7baeba4003ab?w=150&h=150&fit=crop&q=80' },
        ]
    },
    {
        category: 'Pessoas',
        tools: [
            { id: 'ai-skin-retouch', title: 'Pele Perfeita', imageUrl: 'https://images.unsplash.com/photo-1515942630500-afb6d6296396?w=150&h=150&fit=crop&q=80' },
            { id: 'face-blur', title: 'Desfocar Rosto', imageUrl: 'https://images.unsplash.com/photo-1485206412256-701b70e3ed44?w=150&h=150&fit=crop&q=80' },
            { id: 'virtual-tattoo', title: 'Tatuagem Virtual', imageUrl: 'https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=150&h=150&fit=crop&q=80' },
             { id: 'colorize', title: 'Colorir P&B', imageUrl: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=150&h=150&fit=crop&q=80' },
        ]
    },
     {
        category: 'Utilidades',
        tools: [
            { id: 'ocr', title: 'Texto para Imagem', imageUrl: 'https://images.unsplash.com/photo-1523474438810-b04a2480563d?w=150&h=150&fit=crop&q=80' },
        ]
    }
];

interface ToolsPanelProps {
    onToolSelect: (toolId: string) => void;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ onToolSelect }) => {
    return (
        <div className="w-[calc(100vw-5rem)] sm:w-96 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl h-full flex flex-col flex-shrink-0 text-white">
            <div className="flex-shrink-0 p-4 border-b border-gray-700/50">
                <h2 className="text-lg font-bold">Todas as Ferramentas</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {toolsData.map((section) => (
                    <Accordion key={section.category} title={section.category}>
                        <div className="grid grid-cols-3 gap-3 p-2">
                            {section.tools.map((tool) => (
                                <ToolCard 
                                    key={tool.id} 
                                    title={tool.title} 
                                    imageUrl={tool.imageUrl} 
                                    onClick={() => onToolSelect(tool.id)} 
                                />
                            ))}
                        </div>
                    </Accordion>
                ))}
            </div>
        </div>
    );
};
