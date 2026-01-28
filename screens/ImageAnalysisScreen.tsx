
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Loader, Wand2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';

export const ImageAnalysisScreen: React.FC<{
  onBack: () => void;
  initialImage: string | null;
}> = ({ onBack, initialImage }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!initialImage) return;
    setIsProcessing(true);
    setError(null);
    setAnalysis('');
    setSuggestions([]);

    try {
      const { base64, mimeType } = await imageUrlToBase64(initialImage);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Step 1: Get detailed image analysis with specific structure
      const analysisResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: "Analyze this image. Provide a structured summary covering:\n1. Key Elements (Main subject, objects)\n2. Style & Atmosphere (Lighting, colors, mood)\n3. Composition (Angle, framing)\nKeep it concise and professional." }, { inlineData: { data: base64, mimeType } }] },
      });
      const analysisText = analysisResponse.text;
      setAnalysis(analysisText);

      // Step 2: Get creative editing suggestions
      const suggestionsResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on this analysis: "${analysisText}", generate 3 creative and transformative AI editing prompts to improve or radically change this image. Examples: "Turn this into a cyberpunk scene", "Apply a watercolor effect". Format as a simple list starting with dashes.`,
      });
      
      const suggestionsText = suggestionsResponse.text;
      const parsedSuggestions = suggestionsText.split('\n').filter(s => s.trim().startsWith('-')).map(s => s.trim().substring(1).trim());
      setSuggestions(parsedSuggestions);

    } catch (err) {
      console.error("Error analyzing image:", err);
      setError("Failed to analyze the image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (initialImage) {
        handleAnalyze();
    }
  }, [initialImage]);

  return (
    <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
      <header className="flex-shrink-0 z-10 p-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-lg drop-shadow-md">Análise de Imagem com IA</h1>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex flex-col md:flex-row p-4 gap-4">
        <div className="md:w-1/2 lg:w-2/3 h-1/2 md:h-full flex items-center justify-center bg-zinc-800/50 rounded-lg p-4">
            {initialImage ? (
                <img src={initialImage} alt="Para análise" className="max-w-full max-h-full object-contain rounded-md" />
            ) : (
                <p>Nenhuma imagem carregada.</p>
            )}
        </div>
        <div className="md:w-1/2 lg:w-1/3 h-1/2 md:h-full flex flex-col bg-[#2c2c2c] rounded-lg p-4">
            <div className="flex-1 overflow-y-auto">
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <Sparkles size={20} className="text-blue-400" />
                    Insights da IA
                </h2>
                <div className="bg-zinc-800/50 rounded-md p-3 text-sm text-gray-300 whitespace-pre-wrap mb-4 max-h-60 overflow-y-auto">
                    {isProcessing && !analysis ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader className="animate-spin" size={32} />
                        </div>
                    ) : error ? (
                        <p className="text-red-400">{error}</p>
                    ) : (
                        analysis || "A análise da imagem aparecerá aqui."
                    )}
                </div>
                
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <Wand2 size={20} className="text-purple-400" />
                    Ideias de Edição
                </h2>
                 <div className="bg-zinc-800/50 rounded-md p-3 text-sm text-gray-300 space-y-2">
                     {isProcessing && !suggestions.length ? (
                        <div className="flex items-center justify-center h-full">
                           <p>Gerando ideias...</p>
                        </div>
                    ) : suggestions.length > 0 ? (
                        suggestions.map((s, i) => (
                            <div key={i} className="p-2 bg-zinc-700/50 rounded-md border-l-2 border-purple-500">
                                "{s}"
                            </div>
                        ))
                    ) : !isProcessing ? (
                        <p>As sugestões de edição aparecerão aqui.</p>
                    ) : null}
                 </div>
            </div>
             <button onClick={handleAnalyze} disabled={isProcessing || !initialImage} className="mt-4 flex-shrink-0 w-full bg-blue-600 font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">
                Analisar Novamente
            </button>
        </div>
      </main>
    </div>
  );
};
