
import React from 'react';
import { NavItem as NavItemType, NavItemId } from '../types';
import { Sparkles, Settings, Wand, Eye, Frame, Type, Shapes, Upload, MoreHorizontal } from 'lucide-react';

const navItems: NavItemType[] = [
    { id: 'ferramentas', label: 'Ferramentas', icon: Sparkles },
    { id: 'ajustar', label: 'Ajustar', icon: Settings },
    { id: 'efeitos', label: 'Efeitos', icon: Wand },
    { id: 'beleza', label: 'Beleza', icon: Eye },
    { id: 'quadros', label: 'Quadros', icon: Frame },
    { id: 'texto', label: 'Texto', icon: Type },
    { id: 'elementos', label: 'Elementos', icon: Shapes },
    { id: 'uploads', label: 'Uploads', icon: Upload },
    { id: 'mais', label: 'Mais', icon: MoreHorizontal }
];

interface SideNavProps {
    activeNav: NavItemId;
    setActiveNav: (id: NavItemId) => void;
}

export const SideNav: React.FC<SideNavProps> = ({ activeNav, setActiveNav }) => {
    return (
        <aside className="relative flex flex-col w-20 bg-[#212121] flex-shrink-0 z-30 overflow-hidden h-full">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={`relative flex flex-col items-center justify-center p-2 h-16 w-full transition-colors duration-200 ${
                        activeNav === item.id ? 'bg-[#2c2c2c]' : 'hover:bg-[#2c2c2c]/50'
                    }`}
                    aria-label={item.label}
                    aria-current={activeNav === item.id}
                >
                    {activeNav === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"></div>}
                    <item.icon size={24} className={`transition-all duration-200 ${activeNav === item.id ? 'text-blue-400 [filter:drop-shadow(0_0_3px_rgba(96,165,250,0.5))]' : 'text-gray-400'}`} />
                    <span className={`text-[10px] mt-1 ${activeNav === item.id ? 'text-white font-semibold' : 'text-gray-400'}`}>{item.label}</span>
                </button>
            ))}
        </aside>
    );
};
