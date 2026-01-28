import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Clipboard, ScanText } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

const Header: React.FC<{ onBack: () => void; }> = ({ onBack }) => (
    <header className="bg-[#2c2c2c] text-white flex items-center justify-between px-4 h-14 flex-shrink-0 border-b border-gray-700/50 z-20">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <h1 className="font-semibold text-lg">Capturar Texto (OCR)</h1>
        </div>
    </header>
);

export const OcrScreen: React.FC<{ onBack: () => void; }> = ({ onBack }) => {
    const [image, setImage] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleProcess = async (imageUrl: string) => {
        setIsProcessing(true);
        setError(null);
        setExtractedText('');
        try {
            const { base64, mimeType } = await imageUrlToBase64(imageUrl);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { text: "Extraia todo o texto desta imagem. Forneça apenas o texto bruto, sem qualquer formatação ou explicação adicional." },
                        { inlineData: { data: base64, mimeType } }
                    ]
                },
            });

            const text = response.text;
            if (text) {
                setExtractedText(text);
            } else {
                throw new Error("Nenhum texto foi encontrado ou a IA não conseguiu processar a imagem.");
            }
        } catch (err) {
            console.error("Erro no OCR:", err);
            setError("Falha ao extrair texto da imagem.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const url = e.target?.result as string;
            setImage(url);
            handleProcess(url);
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
    };
    
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(extractedText).then(() => {
            setCopySuccess('Copiado!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Falha ao copiar');
        });
    };

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
            <Header onBack={onBack} />
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {image ? (
                    <>
                        <div className="w-full md:w-1/2 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-gray-700">
                             <div className="w-full h-full bg-zinc-800 rounded-lg flex items-center justify-center">
                                <img src={image} alt="Uploaded for OCR" className="max-w-full max-h-full object-contain" />
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 flex flex-col p-8 overflow-y-auto">
                            <h3 className="font-semibold mb-2 flex-shrink-0">Texto Extraído</h3>
                            <div className="relative flex-grow">
                                <textarea
                                    readOnly
                                    value={isProcessing ? "Extraindo texto..." : extractedText}
                                    className="w-full h-full bg-zinc-800 p-4 rounded-lg text-gray-300 resize-none"
                                    placeholder="O texto da sua imagem aparecerá aqui..."
                                />
                                {extractedText && (
                                    <button onClick={handleCopyToClipboard} className="absolute top-2 right-2 bg-gray-600 p-2 rounded-md hover:bg-gray-500">
                                        <Clipboard size={18} />
                                    </button>
                                )}
                                {copySuccess && <div className="absolute top-12 right-2 text-xs bg-green-600 px-2 py-1 rounded-md">{copySuccess}</div>}
                            </div>
                            {error && <p className="text-red-400 mt-2 flex-shrink-0">{error}</p>}
                            <button onClick={() => { setImage(null); setExtractedText(''); }} className="mt-4 w-full bg-blue-600 font-bold py-3 rounded-lg hover:bg-blue-700 flex-shrink-0">
                                Carregar outra imagem
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <ScanText size={48} className="mx-auto text-blue-400 mb-4"/>
                        <h2 className="text-3xl font-bold mb-2">Capturar Texto (OCR)</h2>
                        <p className="text-gray-400 mb-6">Extraia texto de imagens com a precisão da IA.</p>
                        <button onClick={() => inputRef.current?.click()} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 hover:bg-blue-700 mx-auto">
                            <Upload size={20} /> Carregar Imagem
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};