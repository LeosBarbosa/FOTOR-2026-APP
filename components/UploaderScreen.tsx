
import React, { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomUploadIcon = () => (
    <div className="relative w-16 h-16 mb-4">
      <svg className="absolute top-0 left-0" width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.5 19H19.5C20.3284 19 21 18.3284 21 17.5V7.5C21 6.67157 20.3284 6 19.5 6H9.5C8.67157 6 8 6.67157 8 7.5V10.5" stroke="#a0aec0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.5 14.5H15.5C16.3284 14.5 17 13.8284 17 13V4.5C17 3.67157 16.3284 3 15.5 3H3.5C2.67157 3 2 3.67157 2 4.5V13C2 13.8284 2.67157 14.5 3.5 14.5Z" stroke="#718096" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-4 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
      </div>
    </div>
);

const CarregarImagemIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.25 15.75V3.75" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.25 11.75L12.25 15.75L8.25 11.75" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.75 14.75V18.25C3.75 19.3546 4.64543 20.25 5.75 20.25H18.75C19.8546 20.25 20.75 19.3546 20.75 18.25V14.75" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

interface UploaderScreenProps {
  onImageSelect: (url: string) => void;
}

export const UploaderScreen: React.FC<UploaderScreenProps> = ({ onImageSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(URL.createObjectURL(file));
    }
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(URL.createObjectURL(file));
    }
  };
  
  const sampleImages = [
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=128&h=128&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&h=128&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&q=80'
  ];

  return (
    <main className="flex-1 flex items-center justify-center p-8 bg-[#f0f2f5] overflow-auto">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <div className="w-full max-w-4xl text-center p-4">
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl py-20 px-10 transition-all duration-300 ${
            isDragging 
              ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-xl' 
              : 'border-gray-300 bg-white shadow-md'
          }`}
        >
          <div className="flex justify-center items-center">
            <CustomUploadIcon />
          </div>
          <h2 className="text-3xl font-bold mb-2 text-gray-800">
            {isDragging ? 'Solte para carregar' : 'Arraste ou carregue suas imagens'}
          </h2>
          <p className="text-gray-500 mb-8">Formatos suportados: JPG, PNG, WEBP</p>
          
          <div className="flex justify-center my-4">
            <div className="inline-flex rounded-full shadow-lg group">
              <button 
                onClick={handleUploadClick} 
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3.5 px-10 rounded-l-full transition-transform hover:brightness-110 active:scale-95 flex items-center gap-3"
              >
                <CarregarImagemIcon />
                Carregar imagem
              </button>
              <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3.5 px-5 rounded-r-full transition-transform hover:brightness-110 active:scale-95 flex items-center border-l border-white/20">
                <ChevronDown size={20} />
              </button>
            </div>
          </div>
          
          <div className="mt-12">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">Ou comece com um exemplo</p>
            <div className="flex justify-center gap-4">
              {sampleImages.map((src, i) => (
                <div key={i} className="group relative overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all">
                  <img
                    src={src}
                    alt={`Exemplo ${i + 1}`}
                    onClick={() => onImageSelect(src)}
                    className="w-20 h-20 object-cover cursor-pointer transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                  <div 
                    onClick={() => onImageSelect(src)}
                    className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                  >
                    <div className="bg-white/90 p-1.5 rounded-full shadow-sm">
                      <ChevronDown size={14} className="-rotate-90 text-blue-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
