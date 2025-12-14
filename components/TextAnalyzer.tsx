import React, { useState, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { analyzeText } from '../services/geminiService';
import { AnalysisResult, SentimentType } from '../types';
import { EmergencyPanel } from './EmergencyPanel';

interface TextAnalyzerProps {
  onAnalyzeComplete: (input: string, result: AnalysisResult) => void;
  initialState?: { input: string, result: AnalysisResult };
}

export const TextAnalyzer: React.FC<TextAnalyzerProps> = ({ onAnalyzeComplete, initialState }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Load initial state if provided (from history)
  useEffect(() => {
    if (initialState) {
      setInput(initialState.input);
      setResult(initialState.result);
    }
  }, [initialState]);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const data = await analyzeText(input);
      setResult(data);
      onAnalyzeComplete(input, data);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze text. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: SentimentType) => {
    switch (sentiment) {
      case SentimentType.POSITIVE: return 'text-green-400 border-green-500/50 bg-green-500/10';
      case SentimentType.NEGATIVE: return 'text-red-400 border-red-500/50 bg-red-500/10';
      default: return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-card p-6 rounded-2xl shadow-lg border border-white/5">
        <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
          <span className="bg-primary/20 p-2 rounded-lg text-primary">📝</span>
          Text Analysis
        </h2>
        
        <div className="relative">
          <textarea
            className="w-full bg-darker text-gray-200 rounded-xl p-4 min-h-[150px] border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
            placeholder="Enter text to analyze sentiment (e.g., 'I absolutely loved the service today, it was fantastic!')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="absolute bottom-4 right-4 text-xs text-gray-500">
            {input.length} chars
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-primary/25"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
            {loading ? 'Processing...' : 'Analyze Sentiment'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`p-6 rounded-2xl border animate-fade-in ${getSentimentColor(result.sentiment)}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {result.sentiment === SentimentType.POSITIVE ? <CheckCircle2 className="w-8 h-8" /> : 
               result.sentiment === SentimentType.NEGATIVE ? <AlertCircle className="w-8 h-8" /> : 
               <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-bold">?</div>}
              <div>
                <h3 className="text-2xl font-bold uppercase tracking-wide">{result.sentiment}</h3>
                <p className="text-sm opacity-80">Confidence Score: {(result.score * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase tracking-wider opacity-60">Engine</span>
              <div className="font-mono text-sm">Python (BERT)</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-black/20 rounded-xl p-4">
              <h4 className="text-sm font-semibold mb-2 opacity-90">Analysis</h4>
              <p className="opacity-80 leading-relaxed">{result.explanation}</p>
            </div>

            {result.keywords.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 opacity-90">Key Drivers</h4>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map((k, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white/10 text-sm backdrop-blur-sm">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Emergency Panel for Negative Sentiment */}
          {result.sentiment === SentimentType.NEGATIVE && (
            <EmergencyPanel contextText={input} category={result.emergencyCategory} />
          )}
        </div>
      )}
    </div>
  );
};