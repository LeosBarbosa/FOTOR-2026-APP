import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const Accordion: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center px-2 py-3 text-white hover:bg-gray-700/50 text-left">
                <span className="font-semibold text-xs">{title}</span>
                <ChevronDown size={16} className={`transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="pb-2">{children}</div>}
        </div>
    );
}