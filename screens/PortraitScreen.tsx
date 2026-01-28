
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Check, X, Upload, Download, RefreshCw, AlertCircle, Info, Save, Trash2, Plus, UserPlus, Sliders, Palette, Paintbrush, Users } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { fileToBlobUrl, imageUrlToBase64 } from '../utils/fileUtils';

// --- DATA ---
const styles = [
    { id: 'art-diary', name: 'Art Diary', category: 'Criativo', imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=200&h=200&fit=crop&q=80', isFree: true },
    { id: 'custom', name: 'Personalizado', category: 'Criativo', imageUrl: 'https://images.unsplash.com/photo-1516961642265-531546e84af2?w=200&h=200&fit=crop&q=80' },
    { id: 'prof1', name: 'Estúdio Pro', category: 'Estúdio', imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&q=80' },
    { id: 'walkingdead', name: 'Sobrevivente', category: 'Criativo', imageUrl: 'https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?w=200&h=200&fit=crop&q=80' },
    { id: 'lotr', name: 'Terra Média', category: 'Criativo', imageUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?w=200&h=200&fit=crop&q=80' },
    { id: 'astronaut', name: 'Cosmonauta', category: 'Criativo', imageUrl: 'https://images.unsplash.com/photo-1545129139-1beb780cf337?w=200&h=200&fit=crop&q=80' },
    { id: 'cyberpunk', name: 'Neo-Tokyo', category: 'Criativo', imageUrl: 'https://images.unsplash.com/photo-1535378437327-106d3110654e?w=200&h=200&fit=crop&q=80' },
];

const stylePrompts: { [key: string]: string } = {
    'art-diary': `A hyper-realistic 2k medium close-up portrait, rendered in a dynamic black and white watercolor and ink wash style, features the person from the reference image, looking off-camera to the left. Stylish dark sunglasses with thick frames, a dark ribbed turtleneck sweater, and a dark, casual hooded jacket with a visible zipper and button details. Messy hair and neatly trimmed beard (if applicable) are rendered with highly detailed texture, showcasing individual strands and stubble. The composition uses soft, cinematic lighting to create subtle highlights and shadows, emphasizing the contours of the face, particularly on the cheekbone and nose bridge, with delicate hints of reddish-brown and peach tones subtly coloring the skin on the cheek and ear. The background is an abstract white canvas, adorned with expressive black ink splatters, bold brushstrokes, and soft watercolor washes, giving the entire image an artistic, graphic novel aesthetic with a high level of detail. CRITICAL: Maintain 100% facial identity of the uploaded subject.`,
    'prof1': 'Retrato corporativo profissional de alta qualidade. Terno elegante, iluminação de estúdio, fundo desfocado. Mantenha 100% da identidade facial.',
    'walkingdead': 'Sobrevivente em cenário apocalíptico de The Walking Dead. Roupas gastas, atmosfera sombria, fumaça ao fundo. Mantenha as feições originais.',
    'lotr': 'Personagem épico do Senhor dos Anéis. Estilo cinematográfico 8K, texturas realistas.',
    'astronaut': 'Astronauta em traje espacial detalhado, reflexo de nebulosa no visor, iluminação de cabine de nave espacial.',
    'cyberpunk': 'Estilo cyberpunk futurista com luzes neon azul e rosa, pele cibernética, cenário urbano noturno.',
};

const styleCategories = ['Todos', 'Estúdio', 'Criativo'];

// --- SUB-COMPONENTS ---

const StyleCard: React.FC<{
    style: typeof styles[0];
    isSelected: boolean;
    onSelect: (id: string) => void;
}> = ({ style, isSelected, onSelect }) => (
    <div className="relative cursor-pointer group" onClick={() => onSelect(style.id)}>
        <div className={`aspect-square w-full rounded-2xl overflow-hidden ring-4 transition-all duration-500 ${isSelected ? 'ring-blue-500 scale-105 shadow-xl shadow-blue-500/20' : 'ring-transparent group-hover:ring-zinc-700'}`}>
            <img src={style.imageUrl} alt={style.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
            <p className="absolute bottom-3 left-0 right-0 text-center text-xs font-black uppercase tracking-widest text-white">{style.name}</p>
        </div>
        {isSelected && (
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-4 border-[#111317] shadow-lg">
                <Check size={16} className="text-white" />
            </div>
        )}
        {style.isFree && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter shadow-lg">
                Artist
            </div>
        )}
    </div>
);

const ImageCompare: React.FC<{ before: string; after: string }> = ({ before, after }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const handleMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        setSliderPos((x / rect.width) * 100);
    };

    return (
        <div className="relative w-full max-w-2xl mx-auto aspect-square rounded-3xl overflow-hidden select-none shadow-2xl border-4 border-zinc-800" onMouseMove={handleMove}>
            <img src={after} alt="Depois" className="absolute inset-0 w-full h-full object-contain bg-zinc-900" />
            <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={before} alt="Antes" className="absolute inset-0 w-full h-full object-contain bg-zinc-900" />
            </div>
            <div className="absolute top-0 bottom-0 bg-white w-1 cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ left: `calc(${sliderPos}% - 2px)` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-10 h-10 rounded-full bg-white shadow-xl grid place-items-center">
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const PortraitScreen: React.FC<{ onBack: () => void; initialImage?: string | null }> = ({ onBack, initialImage }) => {
    const [step, setStep] = useState(1);
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
    const [userNotes, setUserNotes] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [uploadedImage, setUploadedImage] = useState<string | null>(initialImage || null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);

    const handleStyleSelect = (id: string) => {
        setSelectedStyle(prev => (prev === id ? null : id));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const blobUrl = fileToBlobUrl(file);
            setUploadedImage(blobUrl);
        }
    };

    const handleGenerate = async () => {
        if (!uploadedImage || !selectedStyle) {
            setError('Por favor, selecione um estilo e carregue sua foto.');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let styleInstruction = stylePrompts[selectedStyle] || 'Crie um retrato profissional mantendo a identidade facial.';
            const systemBase = "SYSTEM: You are an elite digital artist. You MUST maintain the person's identity and facial structure from the input photo exactly. Focus on hyper-realistic style transfer.";
            
            const finalPrompt = `${systemBase} ${styleInstruction} ${userNotes ? `Additional specific instructions: ${userNotes}` : ''}`;
            
            const { base64, mimeType } = await imageUrlToBase64(uploadedImage);

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: base64, mimeType } },
                        { text: finalPrompt },
                    ],
                },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
            
            if (part?.inlineData) {
                setGeneratedImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                setStep(3);
            } else {
                const textResp = response.candidates?.[0]?.content?.parts[0]?.text;
                throw new Error(textResp || 'A IA não conseguiu gerar a imagem. Tente novamente.');
            }
        } catch (err: any) {
            console.error("Erro na geração:", err);
            setError(err.message || 'Ocorreu um erro técnico. Tente novamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `prompt-diary-art-${Date.now()}.jpg`;
        link.click();
    };

    const filteredStyles = activeCategory === 'Todos' ? styles : styles.filter(s => s.category === activeCategory);

    return (
        <div className="flex flex-col h-screen bg-[#0a0b0d] text-white overflow-hidden relative">
            {isGenerating && (
                 <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-center p-6 backdrop-blur-xl">
                    <div className="relative w-24 h-24 mb-8">
                        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-4 bg-blue-500/10 rounded-full animate-pulse"></div>
                    </div>
                    <h3 className="text-white font-black text-2xl mb-2 tracking-tighter uppercase italic">Prompt Diary 🌈💫</h3>
                    <p className="text-gray-400 text-sm max-w-xs font-medium">Renderizando sua obra de arte em 2K...</p>
                </div>
            )}

            <header className="flex-shrink-0 flex items-center justify-between px-6 h-18 bg-[#111317] border-b border-zinc-800/50">
                <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center flex-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black italic">Art is profession of Artists 🎨💫🌟</p>
                    <h2 className="text-blue-500 text-sm font-black tracking-tighter uppercase italic">Prompt Diary 🌈💫🎉📚💖</h2>
                </div>
                <div className="w-10" />
            </header>
            
            <div className="flex-1 overflow-y-auto">
                {step === 1 && (
                    <div className="p-8 max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h1 className="text-5xl font-black italic mb-4 tracking-tighter uppercase bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Estilos de Arte IA</h1>
                            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Selecione a alma da sua imagem</p>
                        </div>
                        <div className="flex justify-center gap-3 mb-12 overflow-x-auto no-scrollbar pb-2">
                            {styleCategories.map(cat => (
                                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-8 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {filteredStyles.map(s => (
                                <StyleCard key={s.id} style={s} isSelected={selectedStyle === s.id} onSelect={handleStyleSelect} />
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                     <div className="p-8 max-w-5xl mx-auto">
                         <div className="text-center mb-16">
                            <h1 className="text-4xl font-black italic mb-3 uppercase tracking-tighter">Sua Identidade</h1>
                            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Carregue uma foto frontal nítida</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-16 items-start">
                            <div className="space-y-8">
                                <div className="bg-[#111317] p-8 rounded-3xl border border-zinc-800 shadow-2xl">
                                    <div className="flex items-center gap-4 mb-6 text-blue-500">
                                        <Paintbrush size={24} />
                                        <h3 className="font-black text-sm uppercase tracking-widest">Ajustes Artísticos</h3>
                                    </div>
                                    <textarea
                                        value={userNotes}
                                        onChange={(e) => setUserNotes(e.target.value)}
                                        placeholder="Ex: 'adicionar óculos escuros', 'sorriso leve', 'fundo urbano futurista'..."
                                        className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-sm text-white resize-none focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-zinc-700 font-medium"
                                    />
                                </div>
                                <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center leading-relaxed">
                                    O motor Gemini 2.5 Flash garantirá fidelidade máxima aos traços originais enquanto aplica a estética selecionada.
                                </div>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="w-full aspect-square bg-[#111317] rounded-3xl flex items-center justify-center border-4 border-dashed border-zinc-800 relative group overflow-hidden shadow-2xl transition-all hover:border-blue-500/30">
                                    {uploadedImage ? (
                                        <img src={uploadedImage} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-8">
                                            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Upload size={32} className="text-zinc-700" />
                                            </div>
                                            <p className="text-zinc-600 font-black uppercase text-xs tracking-widest">Carregar Imagem</p>
                                        </div>
                                    )}
                                    <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => inputRef.current?.click()}>
                                        <Upload className="text-white" size={40} />
                                    </div>
                                </div>
                                <button onClick={() => inputRef.current?.click()} className="mt-8 w-full bg-white text-black font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl hover:bg-zinc-200 transition-all shadow-xl">
                                    {uploadedImage ? 'Trocar Imagem' : 'Selecionar Foto'}
                                </button>
                                {error && <p className="text-xs text-red-500 mt-6 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-center font-bold uppercase tracking-wider w-full">{error}</p>}
                            </div>
                        </div>
                    </div>
                )}
                
                {step === 3 && (
                    <div className="p-8 max-w-4xl mx-auto flex flex-col items-center">
                        <div className="text-center mb-12">
                            <h1 className="text-4xl font-black italic mb-3 uppercase tracking-tighter text-blue-500">Arte Finalizada</h1>
                            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Compare sua criação arrastando a barra</p>
                        </div>
                        {uploadedImage && generatedImage && <ImageCompare before={uploadedImage} after={generatedImage} />}
                        <div className="flex gap-4 mt-16 w-full max-w-md">
                            <button onClick={() => setStep(1)} className="flex-1 py-5 rounded-full font-black uppercase text-[10px] tracking-widest bg-zinc-900 text-zinc-400 hover:text-white transition-all border border-zinc-800">
                                <RefreshCw size={16} className="inline mr-2" /> Novo Estilo
                            </button>
                            <button onClick={handleDownload} className="flex-1 py-5 rounded-full font-black uppercase text-[10px] tracking-widest bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/40 hover:scale-105 transition-all">
                                <Download size={16} className="inline mr-2" /> Baixar 2K
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 p-8 bg-[#0a0b0d] border-t border-zinc-900 flex justify-center">
                {step === 1 && (
                    <button 
                        onClick={() => setStep(2)}
                        disabled={!selectedStyle}
                        className="px-20 py-4 rounded-full font-black uppercase text-sm tracking-[0.2em] bg-gradient-to-r from-blue-600 to-cyan-500 text-white disabled:from-zinc-900 disabled:to-zinc-950 disabled:text-zinc-700 shadow-2xl shadow-blue-500/20 transition-all hover:scale-105"
                    >
                        Continuar
                    </button>
                )}
                {step === 2 && (
                    <button 
                        onClick={handleGenerate}
                        disabled={!uploadedImage || isGenerating}
                        className="px-20 py-4 rounded-full font-black uppercase text-sm tracking-[0.2em] bg-gradient-to-r from-blue-600 to-cyan-500 text-white disabled:from-zinc-900 disabled:to-zinc-950 shadow-2xl shadow-blue-500/20 transition-all hover:scale-105 flex items-center justify-center min-w-[280px]"
                    >
                        {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : 'Gerar Obra'}
                    </button>
                )}
            </div>
        </div>
    );
};
