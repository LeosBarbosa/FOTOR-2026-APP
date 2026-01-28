
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Download, Layers, Edit, ZoomIn, ZoomOut } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const sampleImages = [
    { name: 'Pessoa', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop' },
    { name: 'Objeto', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=300&fit=crop' },
    { name: 'Animal', url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200&h=300&fit=crop' },
    { name: 'Produto', url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=200&h=300&fit=crop' },
];

const subjectTypes = ['Geral', 'Pessoa', 'Produto', 'Animal', 'Gráfico'];

const ResultViewer: React.FC<{ original: string; result: string }> = ({ original, result }) => {
    const [view, setView] = useState<'result' | 'original'>('result');
    const [zoomLevel, setZoomLevel] = useState(1);
    const zoomPercentage = Math.round(zoomLevel * 100);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-shrink-0 flex justify-center p-2">
                <div className="bg-black/20 rounded-lg p-1 flex gap-1 backdrop-blur-sm">
                    <button 
                        onClick={() => setView('original')}
                        className={`px-4 py-1.5 rounded-md text-sm transition-colors ${view === 'original' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700/80'}`}
                    >
                        Original
                    </button>
                    <button 
                        onClick={() => setView('result')}
                        className={`px-4 py-1.5 rounded-md text-sm transition-colors ${view === 'result' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700/80'}`}
                    >
                        Resultado
                    </button>
                </div>
            </div>
            <div className={`flex-1 relative rounded-lg flex items-center justify-center p-2 min-h-0 overflow-auto ${view === 'result' ? 'bg-checkered/80' : 'bg-[#1f1f1f]/50'}`}>
                <img 
                    src={view === 'result' ? result : original} 
                    alt={view === 'result' ? "Resultado" : "Original"}
                    className="block shadow-lg transition-transform"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                />
            </div>
            <div className="flex-shrink-0 flex justify-center p-2">
                 <div className="flex items-center gap-2 sm:gap-4 bg-black/20 backdrop-blur-sm p-2 rounded-lg">
                    <button
                        onClick={() => setZoomLevel(z => Math.max(0.1, z - 0.1))}
                        className="p-2 text-gray-300 hover:text-white rounded-full transition-colors"
                        aria-label="Diminuir zoom"
                    >
                        <ZoomOut size={20} />
                    </button>
                    <div
                        onClick={() => setZoomLevel(1)}
                        className="text-sm font-bold text-white w-16 text-center cursor-pointer"
                        aria-label="Resetar zoom"
                    >
                        {zoomPercentage}%
                    </div>
                    <button
                        onClick={() => setZoomLevel(z => Math.min(3, z + 0.1))}
                        className="p-2 text-gray-300 hover:text-white rounded-full transition-colors"
                        aria-label="Aumentar zoom"
                    >
                        <ZoomIn size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const BackgroundRemoverScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage?: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(initialImage || null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [subjectType, setSubjectType] = useState('Geral');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleProcess = async (imageUrl: string, subject: string) => {
        if (!imageUrl) return;
        setIsProcessing(true);
        setError(null);

        try {
            const { base64, mimeType } = await imageUrlToBase64(imageUrl);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let prompt = `Remova o fundo desta imagem. Torne o novo fundo transparente. Mantenha o assunto principal com bordas limpas e precisas. A saída deve ser um PNG com um canal alfa.`;
            if (subject !== 'Geral') {
                prompt = `Remova o fundo desta imagem, focando em isolar perfeitamente o assunto principal, que é um(a) ${subject.toLowerCase()}. Torne o fundo transparente. As bordas do assunto devem ser extremamente limpas e precisas. A saída deve ser um PNG com um canal alfa.`
            }

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
              config: { responseModalities: [Modality.IMAGE] },
            });

            const candidate = response.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            let newImageFound = false;

            for (const part of parts) {
              if (part.inlineData && part.inlineData.mimeType.includes('image')) {
                const base64ImageBytes: string = part.inlineData.data;
                const newMimeType = part.inlineData.mimeType;
                const resultUrl = `data:${newMimeType};base64,${base64ImageBytes}`;
                setProcessedImage(resultUrl);
                newImageFound = true;
                break;
              }
            }
            if (!newImageFound) {
                const text = candidate?.content?.parts?.[0]?.text;
                if (text) throw new Error(`Falha: ${text}`);
                throw new Error("A IA não retornou uma imagem. Tente novamente.");
            }
            
        } catch (err: any) {
            console.error("Erro ao remover fundo:", err);
            setError(err.message || "Falha ao processar a imagem. Tente novamente.");
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        if (initialImage) {
            handleProcess(initialImage, 'Geral');
        }
    }, [initialImage]);

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target?.result as string;
            setOriginalImage(imageUrl);
            setProcessedImage(null);
            setError(null);
        };
        reader.readAsDataURL(file);
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
          handleImageUpload(file);
        }
    };

    const handleSampleSelect = (url: string) => {
        setOriginalImage(url);
        setProcessedImage(null);
        setError(null);
    };

    const handleDownload = () => {
        if (!processedImage) return;
        const link = document.createElement('a');
        link.href = processedImage;
        link.download = `fundo-removido-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleApplyClick = () => {
        if (originalImage) {
            handleProcess(originalImage, subjectType);
        }
    }

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
             <style>{`.bg-checkered { background-color: #444; background-image: linear-gradient(45deg, #555 25%, transparent 25%), linear-gradient(-45deg, #555 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #555 75%), linear-gradient(-45deg, transparent 75%, #555 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; }`}</style>
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            
            <header className="flex-shrink-0 z-10 p-4">
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-semibold text-lg drop-shadow-md">Removedor de Fundo IA</h1>
                    </div>
                    {processedImage && (
                         <button onClick={handleDownload} className="px-4 py-2 font-bold bg-blue-600/80 backdrop-blur-sm rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
                            <Download size={16} />
                            Baixar PNG
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 relative">
                {isProcessing && (
                    <div className="absolute inset-0 bg-zinc-900/80 z-10 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm">
                        <svg className="w-16 h-16 animate-spin text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <h3 className="text-white font-semibold text-lg drop-shadow-md">Removendo Fundo...</h3>
                        <p className="text-gray-300 text-sm mt-1 drop-shadow-md">A IA está isolando o assunto principal.</p>
                    </div>
                )}
                
                {processedImage && originalImage ? (
                    <ResultViewer original={originalImage} result={processedImage} />
                ) : originalImage ? (
                    <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain rounded-lg"/>
                ) : (
                    <div className="w-full max-w-2xl text-center">
                        <div className="flex justify-center items-center">
                            <div className="w-20 h-20 bg-zinc-700 text-blue-400 rounded-full flex items-center justify-center mb-4 ring-8 ring-zinc-800">
                                <Layers size={40} />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Removedor de Fundo com IA</h2>
                        <p className="text-gray-400 mb-6">Remova instantaneamente o fundo de qualquer imagem gratuitamente.</p>
                        <div className="flex justify-center my-4">
                            <button onClick={() => inputRef.current?.click()} className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 flex items-center gap-2">
                                <Upload size={20} /> Carregar Imagem
                            </button>
                        </div>
                        <p className="text-gray-500 text-sm my-6">ou experimente um destes:</p>
                        <div className="flex justify-center gap-4">
                            {sampleImages.map((img) => (
                                <div key={img.name} onClick={() => handleSampleSelect(img.url)} className="cursor-pointer group">
                                    <img src={img.url} alt={img.name} className="w-24 h-36 rounded-md object-cover transition-all group-hover:scale-105 group-hover:ring-2 ring-blue-500" loading="lazy" decoding="async" />
                                    <p className="text-sm text-gray-400 mt-2 group-hover:text-white">{img.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
            
            <footer className="flex-shrink-0 z-10 p-4">
                {error && <div className="max-w-xl mx-auto mb-2 p-2 bg-red-900/80 rounded-lg text-center text-sm text-red-300 backdrop-blur-sm">{error}</div>}
                {originalImage && (
                    <div className="max-w-xl mx-auto flex flex-col gap-4 bg-black/30 backdrop-blur-sm p-4 rounded-xl">
                        <div>
                            <h4 className="font-semibold text-sm mb-3 text-gray-300">Tipo de Assunto</h4>
                            <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
                                {subjectTypes.map(type => (
                                    <button 
                                        key={type} 
                                        onClick={() => setSubjectType(type)}
                                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${subjectType === type ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleApplyClick} disabled={isProcessing} className="flex-1 bg-blue-600 font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
                                {isProcessing ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                ) : (processedImage ? "Aplicar Novamente" : "Remover Fundo")}
                            </button>

                            {processedImage && (
                                 <button onClick={() => onEdit(processedImage)} className="bg-gray-600 font-bold p-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                                    <Edit size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
};
