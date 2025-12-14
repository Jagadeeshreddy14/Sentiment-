import React, { useState, useRef } from 'react';
import { Mic, Square, Upload, Loader2, Volume2 } from 'lucide-react';
import { analyzeAudio } from '../services/geminiService';
import { AnalysisResult, SentimentType } from '../types';
import { EmergencyPanel } from './EmergencyPanel';

export const VoiceAnalyzer: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setResult(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setResult(null);
      // We need to fetch the blob to analyze it later, simple hack for consistency
      fetch(url).then(r => r.blob()).then(blob => {
         chunksRef.current = [blob]; // Store as single chunk
      });
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleAnalyze = async () => {
    if (!chunksRef.current.length && !audioUrl) return;
    setLoading(true);

    try {
      // Reconstruct blob if needed (for file upload scenario we might need to handle differently in prod, but this works for demo)
      let blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
      
      // Convert to Base64
      const base64 = await blobToBase64(blob);
      const mimeType = blob.type || 'audio/webm'; // Fallback
      
      const data = await analyzeAudio(base64, mimeType);
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze audio.");
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
        <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
          <span className="bg-secondary/20 p-2 rounded-lg text-secondary">🎙️</span>
          Voice Analysis
        </h2>

        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-2xl bg-darker/50 gap-6">
          
          {!audioUrl ? (
            <div className="text-center space-y-4">
               <div className={`w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse ring-4 ring-red-500/10' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                    onClick={isRecording ? stopRecording : startRecording}>
                 {isRecording ? <Square className="w-10 h-10 fill-current" /> : <Mic className="w-10 h-10" />}
               </div>
               <p className="text-gray-400 font-medium">
                 {isRecording ? 'Recording... Tap to stop' : 'Tap microphone to record'}
               </p>
               <div className="flex items-center gap-2 text-sm text-gray-500 my-2">
                 <span className="h-px bg-white/10 flex-1"></span>
                 <span>OR</span>
                 <span className="h-px bg-white/10 flex-1"></span>
               </div>
               <label className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors text-sm text-gray-300">
                 <Upload className="w-4 h-4" />
                 Upload Audio File
                 <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
               </label>
            </div>
          ) : (
             <div className="w-full max-w-md space-y-4">
               <div className="bg-darker p-4 rounded-xl flex items-center gap-4 border border-white/10">
                 <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Volume2 className="w-5 h-5" />
                 </div>
                 <audio controls src={audioUrl} className="w-full h-8" />
               </div>
               <div className="flex justify-center gap-3">
                 <button 
                   onClick={() => { setAudioUrl(null); setResult(null); chunksRef.current = []; }}
                   className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                 >
                   Record New
                 </button>
                 <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-secondary/25"
                  >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                    {loading ? 'Analyzing Voice...' : 'Analyze Voice'}
                  </button>
               </div>
             </div>
          )}
        </div>
      </div>

      {result && (
        <div className={`p-6 rounded-2xl border animate-fade-in ${getSentimentColor(result.sentiment)}`}>
          <div className="flex items-start justify-between mb-4">
             <div>
                <h3 className="text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
                    {result.sentiment}
                </h3>
                <p className="text-sm opacity-80 mt-1">Tone Confidence: {(result.score * 100).toFixed(1)}%</p>
             </div>
             <div className="text-right">
              <span className="text-xs uppercase tracking-wider opacity-60">Model</span>
              <div className="font-mono text-sm">Gemini 2.5 Flash</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-black/20 rounded-xl p-4">
              <h4 className="text-sm font-semibold mb-2 opacity-90">Audio Profile</h4>
              <p className="opacity-80 leading-relaxed">{result.explanation}</p>
            </div>
             {result.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                  {result.keywords.map((k, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white/10 text-sm border border-white/5">
                      {k}
                    </span>
                  ))}
              </div>
            )}
          </div>
          
           {/* Emergency Panel for Negative Sentiment */}
          {result.sentiment === SentimentType.NEGATIVE && (
            <EmergencyPanel contextText={result.explanation} />
          )}
        </div>
      )}
    </div>
  );
};