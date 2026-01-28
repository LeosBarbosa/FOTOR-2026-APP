
import React from 'react';
import { Plus, ChevronDown, Cloud, Search, Download, Gem, CircleUserRound, Menu, LayoutPanelLeft } from 'lucide-react';

export const Header: React.FC<{
  onMenuToggle?: () => void;
  onUploadClick?: () => void;
  onDownloadClick?: () => void;
  layoutMode?: string;
  onLayoutToggle?: () => void;
  onSearchClick?: () => void;
}> = ({ onMenuToggle, onUploadClick, onDownloadClick, layoutMode, onLayoutToggle, onSearchClick }) => {
  return (
    <header className="bg-[#2c2c2c] text-white flex items-center justify-between px-2 sm:px-4 h-16 flex-shrink-0 border-b border-gray-700/50 z-20">
      <div className="flex items-center gap-2 sm:gap-6">
        {onMenuToggle && (
            <button onClick={onMenuToggle} className="p-2 rounded-full md:hidden hover:bg-gray-700/50">
                <Menu size={24} />
            </button>
        )}
        <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="48" fill="#FFF"/>
                <path d="M50,2 A48,48 0 0,1 98,50 L50,50 Z" fill="#FF5733"/>
                <path d="M98,50 A48,48 0 0,1 50,98 L50,50 Z" fill="#C70039"/>
                <path d="M50,98 A48,48 0 0,1 2,50 L50,50 Z" fill="#900C3F"/>
                <path d="M2,50 A48,48 0 0,1 50,2 L50,50 Z" fill="#581845"/>
                <circle cx="50" cy="50" r="20" fill="#2C2C2C"/>
            </svg>
            <span className="text-xl font-bold">Fotor</span>
        </div>
        <div className="relative hidden md:block">
          <button className="flex items-center gap-2 px-3 py-2 bg-[#3a3a3a] rounded-md hover:bg-gray-600/50 transition-colors">
            <span className="font-semibold text-sm">Editor de fotos AI</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-start ml-2 sm:ml-8 gap-2 sm:gap-4">
        <button onClick={onUploadClick} className="hidden sm:flex items-center gap-2 px-3 py-2 bg-[#3a3a3a] rounded-md hover:bg-gray-600/50 transition-colors">
          <Plus size={16} />
          <span className="font-semibold text-sm">Carregar imagem</span>
        </button>
        <div className="flex items-center gap-2 p-1 bg-[#1f1f1f] rounded-md">
            <button className="p-1.5 rounded-md text-gray-400 hover:text-white transition-colors"><Cloud size={20} /></button>
            <div className="w-px h-5 bg-gray-600"></div>
            <button 
                onClick={onSearchClick}
                className="p-1.5 rounded-md text-gray-400 hover:text-white transition-colors"
                title="Buscar ferramentas (Cmd+K)"
            >
                <Search size={20} />
            </button>
             {onLayoutToggle && (
              <>
                <div className="w-px h-5 bg-gray-600"></div>
                <button
                    onClick={onLayoutToggle}
                    title="Alterar Layout"
                    className={`p-1.5 rounded-md transition-colors ${layoutMode === 'split' ? 'text-blue-400' : 'text-gray-400'} hover:text-white`}
                >
                    <LayoutPanelLeft size={20} />
                </button>
              </>
            )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <button onClick={onDownloadClick} className="px-3 sm:px-4 py-2 font-bold bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
            <Download size={16} />
            <span className="hidden sm:inline">Baixar</span>
        </button>
        <div className="flex items-center gap-2 text-gray-400">
            <div className="hidden sm:flex items-center gap-1.5">
                <div className="w-6 h-6 bg-green-500/80 rounded-full flex items-center justify-center">
                    <Gem size={14} className="text-white"/>
                </div>
                <span className="font-bold text-white text-sm">4</span>
            </div>
            <button className="p-1 rounded-md hover:text-white transition-colors"><CircleUserRound size={24} /></button>
        </div>
      </div>
    </header>
  );
};
