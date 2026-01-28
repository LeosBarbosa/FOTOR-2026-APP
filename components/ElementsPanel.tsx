
import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronsUp, ChevronsDown, ChevronUp, ChevronDown } from 'lucide-react';
import type { CanvasElementData } from '../types';

// --- Sub-components for Panel Content ---

const ElementCard: React.FC<{
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}> = ({ children, className, style, onClick }) => (
    <div 
        onClick={onClick}
        className={`aspect-square bg-gray-700/50 rounded-md flex items-center justify-center text-2xl cursor-pointer hover:bg-gray-600/50 transition-colors ${className}`}
        style={style}
    >
        {children}
    </div>
);

const ElementSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
        <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="text-gray-300 font-semibold text-sm">{title}</h3>
            <button className="text-blue-400 hover:underline text-xs">Ver tudo</button>
        </div>
        <div className="grid grid-cols-4 gap-3">
            {children}
        </div>
    </section>
);

const AddElementsView: React.FC<{ onElementSelect: (element: { type: 'emoji' | 'shape'; content: string }) => void; }> = ({ onElementSelect }) => (
    <>
        <ElementSection title="Formas Básicas">
            <ElementCard className="!bg-[#5a9bd5] rounded-lg" onClick={() => onElementSelect({ type: 'shape', content: 'w-full h-full bg-[#5a9bd5] rounded-lg' })} />
            <ElementCard className="!bg-[#ed7d31] rounded-full" onClick={() => onElementSelect({ type: 'shape', content: 'w-full h-full bg-[#ed7d31] rounded-full' })}/>
            <ElementCard className="!bg-[#a5a5a5]" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} onClick={() => onElementSelect({ type: 'shape', content: 'w-full h-full bg-[#a5a5a5] [clip-path:polygon(50%_0%,_0%_100%,_100%_100%)]' })}/>
            <ElementCard className="!bg-[#ffc000]" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} onClick={() => onElementSelect({ type: 'shape', content: 'w-full h-full bg-[#ffc000] [clip-path:polygon(50%_0%,_61%_35%,_98%_35%,_68%_57%,_79%_91%,_50%_70%,_21%_91%,_32%_57%,_2%_35%,_39%_35%)]' })}/>
        </ElementSection>
        <ElementSection title="Adesivos de Emoji">
            <ElementCard onClick={() => onElementSelect({ type: 'emoji', content: '😀' })}>😀</ElementCard>
            <ElementCard onClick={() => onElementSelect({ type: 'emoji', content: '😂' })}>😂</ElementCard>
            <ElementCard onClick={() => onElementSelect({ type: 'emoji', content: '😍' })}>😍</ElementCard>
            <ElementCard onClick={() => onElementSelect({ type: 'emoji', content: '😎' })}>😎</ElementCard>
        </ElementSection>
         <ElementSection title="Ilustrações Abstratas">
            <ElementCard />
            <ElementCard />
            <ElementCard />
            <ElementCard />
        </ElementSection>
         <ElementSection title="Linhas e Setas">
            <ElementCard />
            <ElementCard />
            <ElementCard />
            <ElementCard />
        </ElementSection>
    </>
);

const LayersView: React.FC<{
    elements: CanvasElementData[];
    selectedElementId: number | null;
    onLayerSelect: (id: number) => void;
    onReorder: (id: number, direction: 'front' | 'back' | 'forward' | 'backward') => void;
}> = ({ elements, selectedElementId, onLayerSelect, onReorder }) => {
    const selectedIndex = elements.findIndex(e => e.id === selectedElementId);
    
    const canMoveForward = selectedIndex !== -1 && selectedIndex < elements.length - 1;
    const canMoveBackward = selectedIndex !== -1 && selectedIndex > 0;

    const ReorderButton: React.FC<{ title: string; disabled: boolean; onClick: () => void; children: React.ReactNode }> = ({ title, disabled, onClick, children }) => (
        <button
            title={title}
            disabled={disabled}
            onClick={onClick}
            className="p-1.5 rounded-md text-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed hover:bg-gray-700/50 hover:text-white transition-colors"
        >
            {children}
        </button>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3 px-1 flex-shrink-0">
                <h3 className="text-gray-300 font-semibold text-sm">Camadas</h3>
                <div className="flex items-center gap-1">
                    <ReorderButton title="Trazer para frente" disabled={!canMoveForward} onClick={() => onReorder(selectedElementId!, 'forward')}><ChevronUp size={20}/></ReorderButton>
                    <ReorderButton title="Enviar para trás" disabled={!canMoveBackward} onClick={() => onReorder(selectedElementId!, 'backward')}><ChevronDown size={20}/></ReorderButton>
                    <ReorderButton title="Trazer ao topo" disabled={!canMoveForward} onClick={() => onReorder(selectedElementId!, 'front')}><ChevronsUp size={20}/></ReorderButton>
                    <ReorderButton title="Enviar para o fundo" disabled={!canMoveBackward} onClick={() => onReorder(selectedElementId!, 'back')}><ChevronsDown size={20}/></ReorderButton>
                </div>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1">
                {[...elements].reverse().map(el => (
                    <div 
                        key={el.id} 
                        onClick={() => onLayerSelect(el.id)} 
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer border ${selectedElementId === el.id ? 'bg-blue-900/50 border-blue-500' : 'border-transparent hover:bg-gray-700/50'}`}
                    >
                        <div className="w-8 h-8 flex-shrink-0 bg-gray-700 rounded-md flex items-center justify-center text-lg">
                            {el.type === 'emoji' ? el.content : <div className={`w-5 h-5 ${el.content}`}></div>}
                        </div>
                        <span className="text-sm capitalize text-white truncate">{el.type === 'shape' ? 'Forma' : 'Emoji'}</span>
                    </div>
                ))}
                {elements.length === 0 && <p className="text-gray-500 text-center text-sm py-8">Nenhum elemento na tela. Adicione alguns da aba 'Adicionar'.</p>}
            </div>
        </div>
    )
};

// --- Main Panel Component ---

interface ElementsPanelProps {
    onElementSelect: (element: { type: 'emoji' | 'shape'; content: string }) => void;
    elements: CanvasElementData[];
    selectedElementId: number | null;
    onLayerSelect: (id: number) => void;
    onReorder: (id: number, direction: 'front' | 'back' | 'forward' | 'backward') => void;
}

export const ElementsPanel: React.FC<ElementsPanelProps> = ({ onElementSelect, elements, selectedElementId, onLayerSelect, onReorder }) => {
    const [activeTab, setActiveTab] = useState('Adicionar');
    const prevElementsLength = useRef(elements.length);

    useEffect(() => {
        // If elements are added for the first time, switch to Layers tab
        if (elements.length > 0 && prevElementsLength.current === 0) {
            setActiveTab('Camadas');
        }
        // If all elements are removed, switch back to Add tab
        if (elements.length === 0 && prevElementsLength.current > 0) {
            setActiveTab('Adicionar');
        }
        prevElementsLength.current = elements.length;
    }, [elements.length]);

    return (
        <div className="w-[calc(100vw-5rem)] sm:w-80 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl flex flex-col h-full flex-shrink-0">
            {/* Search Bar */}
            <div className="p-4 flex-shrink-0 border-b border-gray-700/50">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar elementos..." 
                        className="w-full bg-gray-700/50 border-none rounded-md pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-md mx-4 mt-4 flex-shrink-0">
                <button onClick={() => setActiveTab('Adicionar')} className={`flex-1 text-sm py-1.5 rounded-md ${activeTab === 'Adicionar' ? 'bg-gray-600' : 'text-gray-300 hover:bg-gray-700/50'}`}>Adicionar</button>
                <button onClick={() => setActiveTab('Camadas')} className={`flex-1 text-sm py-1.5 rounded-md ${activeTab === 'Camadas' ? 'bg-gray-600' : 'text-gray-300 hover:bg-gray-700/50'}`}>Camadas</button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'Adicionar' && <AddElementsView onElementSelect={onElementSelect} />}
                {activeTab === 'Camadas' && (
                    <LayersView 
                        elements={elements} 
                        selectedElementId={selectedElementId}
                        onLayerSelect={onLayerSelect}
                        onReorder={onReorder}
                    />
                )}
            </div>
        </div>
    );
};
