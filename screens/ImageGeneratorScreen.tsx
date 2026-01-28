
import React, { useState, useRef } from 'react';
import { ArrowLeft, Download, Sparkles, Wand2, Edit, Lightbulb, AlertCircle } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';

const AspectRatioButton: React.FC<{ label: string; value: string; active: boolean; onClick: (value: string) => void }> = ({ label, value, active, onClick }) => (
    <button onClick={() => onClick(value)} className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>
        {label}
    </button>
);

const StyleSuggestion: React.FC<{ name: string; imageUrl: string; onClick: () => void }> = ({ name, imageUrl, onClick }) => (
    <div className="text-center cursor-pointer group" onClick={onClick}>
        <div className="w-full aspect-square rounded-2xl overflow-hidden relative mb-3 bg-zinc-900 border border-zinc-800 group-hover:border-blue-500/50 transition-all">
            <img src={imageUrl} alt={name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors"></div>
        </div>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest group-hover:text-white transition-colors">{name}</p>
    </div>
);

const categorizedStyles = {
    'Populares': [
        { name: 'Fotorrealista', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop', prompt: 'Photorealistic, 8k, highly detailed, professional lighting, cinematic composition.' },
        { name: 'Desenho 3D', imageUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=200&h=200&fit=crop', prompt: '3D animated style, Pixar vibes, cute, vibrant colors, soft lighting.' },
        { name: 'Anime', imageUrl: 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=200&h=200&fit=crop', prompt: 'Classic anime style, hand-drawn look, expressive eyes, vibrant cel shading.' },
    ]
};

export const ImageGeneratorScreen: React.FC<{ onBack: () => void; onImageGenerated: (imageUrl: string) => void }> = ({ onBack, onImageGenerated }) => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Por favor, descreva a imagem que deseja criar.');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const finalPrompt = `Create a high-quality artistic image based on: "${prompt}". Aspect ratio: ${aspectRatio}. Style: Professional digital art, masterpiece, high resolution.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: finalPrompt,
                config: {
                    responseModalities: [Modality.IMAGE],
                    imageConfig: {
                        aspectRatio: aspectRatio as any,
                    }
                }
            });

            const candidate = response.candidates?.[0];
            const part = candidate?.content?.parts.find(p => p.inlineData);
            
            if (part?.inlineData) {
                const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                setGeneratedImage(imageUrl);
            } else {
                throw new Error('Não foi possível gerar a imagem. Tente um prompt diferente.');
            }
        } catch (err: any) {
            setError(err.message || 'Erro na geração de imagem.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#0a0b0d] text-white overflow-hidden">
            <header className="flex-shrink-0 flex items-center justify-between px-6 h-18 bg-[#111317] border-b border-zinc-800/50">
                <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center flex-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black italic">Generative Art AI 🎨</p>
                    <h2 className="text-purple-500 text-sm font-black tracking-tighter uppercase italic">Imagine & Create 🌈💫</h2>
                </div>
                <div className="w-10" />
            </header>

            <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Lateral de Controles */}
                <div className="w-full md:w-96 bg-[#111317] border-r border-zinc-800/50 p-8 flex flex-col gap-10 overflow-y-auto">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-3">
                            <Lightbulb size={16} className="text-yellow-500" /> Inspiração
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            {categorizedStyles.Populares.map(style => (
                                <StyleSuggestion 
                                    key={style.name} 
                                    {...style} 
                                    onClick={() => setPrompt(style.prompt)} 
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Proporção</h3>
                        <div className="flex flex-wrap gap-2">
                            {['1:1', '16:9', '9:16', '4:3'].map(ratio => (
                                <AspectRatioButton 
                                    key={ratio} 
                                    label={ratio} 
                                    value={ratio} 
                                    active={aspectRatio === ratio} 
                                    onClick={setAspectRatio} 
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Descreva sua visão</h3>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Um castelo flutuante sobre um oceano de nuvens ao pôr do sol..."
                            className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-sm text-white resize-none focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder:text-zinc-800 font-medium"
                        />
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-purple-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-700"
                    >
                        {isGenerating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Wand2 size={18} />}
                        {isGenerating ? 'Criando...' : 'Gerar Imagem'}
                    </button>
                </div>

                {/* Área de Visualização */}
                <div className="flex-1 bg-[#0a0b0d] p-8 flex items-center justify-center relative overflow-hidden">
                    {generatedImage ? (
                        <div className="relative group max-w-full max-h-full">
                            <img 
                                src={generatedImage} 
                                alt="Gerada" 
                                className="max-w-full max-h-full rounded-3xl shadow-2xl border-4 border-zinc-800 object-contain"
                            />
                            <div className="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onImageGenerated(generatedImage)} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl hover:bg-white/20 transition-colors">
                                    <Edit size={20} className="text-white" />
                                </button>
                                <a href={generatedImage} download="ai-art.jpg" className="bg-blue-600 p-4 rounded-2xl hover:bg-blue-500 transition-colors">
                                    <Download size={20} className="text-white" />
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-32 h-32 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-8 border border-zinc-800/50">
                                <Sparkles size={48} className="text-zinc-800 animate-pulse" />
                            </div>
                            <h2 className="text-zinc-800 font-black text-4xl uppercase italic tracking-tighter">Sua arte aqui</h2>
                            <p className="text-zinc-800 font-bold text-xs uppercase tracking-widest mt-2">Dê vida à sua imaginação com IA</p>
                        </div>
                    )}

                    {error && (
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-900/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-red-500/20 flex items-center gap-3">
                            <AlertCircle size={20} className="text-red-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-red-200">{error}</span>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
