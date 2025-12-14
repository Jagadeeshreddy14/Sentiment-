import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Loader2, Volume2, Scissors, Play, Pause, RotateCcw, StopCircle } from 'lucide-react';
import { analyzeAudio } from '../services/geminiService';
import { AnalysisResult, SentimentType } from '../types';
import { EmergencyPanel } from './EmergencyPanel';

// Helper to encode AudioBuffer to WAV Blob
const audioBufferToWav = (buffer: AudioBuffer, start: number, end: number): Blob => {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.floor(start * sampleRate);
  const endSample = Math.floor(end * sampleRate);
  // Ensure we don't go out of bounds
  const actualEndSample = Math.min(endSample, buffer.length);
  const frameCount = actualEndSample - startSample;
  
  if (frameCount <= 0) return new Blob([], {type: 'audio/wav'});

  const numChannels = buffer.numberOfChannels;
  const length = frameCount * numChannels * 2 + 44;
  
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numChannels);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numChannels); // avg. bytes/sec
  setUint16(numChannels * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // Get channel data
  for(i = 0; i < numChannels; i++)
    channels.push(buffer.getChannelData(i));

  // Write interleaved data
  let currentSample = startSample;
  while(currentSample < actualEndSample) {
    for(i = 0; i < numChannels; i++) {
      // Clamp and scale to 16-bit
      sample = Math.max(-1, Math.min(1, channels[i][currentSample])); 
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0; 
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    currentSample++;
  }

  return new Blob([bufferArr], {type: "audio/wav"});
};

interface VoiceAnalyzerProps {
  onAnalyzeComplete: (audioUrl: string, result: AnalysisResult) => void;
  initialState?: { input: string, result: AnalysisResult };
}

export const VoiceAnalyzer: React.FC<VoiceAnalyzerProps> = ({ onAnalyzeComplete, initialState }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [trimRange, setTrimRange] = useState<{start: number, end: number}>({ start: 0, end: 0 });
  
  // Playback state management
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused' | 'stopped'>('stopped');
  const [playbackOffset, setPlaybackOffset] = useState(0); // Offset in seconds relative to trimRange.start
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0); // Context time when playback started

  useEffect(() => {
    // Initialize AudioContext on mount (or lazily)
    if (!audioContextRef.current) {
      // Fix: Handle webkitAudioContext for Safari by casting window to any
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
      } else {
          console.error("AudioContext is not supported in this browser.");
      }
    }
    return () => {
      stopPlayback(); // Ensure cleanup
      audioContextRef.current?.close();
    };
  }, []);

  // Restore state from history
  useEffect(() => {
    if (initialState) {
      setAudioUrl(initialState.input);
      setResult(initialState.result);
    }
  }, [initialState]);

  // Decode audio when URL changes
  useEffect(() => {
    if (!audioUrl || !audioContextRef.current) return;

    const loadAudio = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        setAudioBuffer(decoded);
        setTrimRange({ start: 0, end: decoded.duration });
        resetPlaybackState();
      } catch (e) {
        console.error("Error decoding audio", e);
      }
    };
    loadAudio();
  }, [audioUrl]);

  // Reset playback if trim range changes significantly (dragging slider)
  useEffect(() => {
    if (playbackState !== 'stopped') {
       handleStop();
    }
  }, [trimRange.start, trimRange.end]);

  const resetPlaybackState = () => {
    setPlaybackState('stopped');
    setPlaybackOffset(0);
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.onended = null;
        previewSourceRef.current.stop();
      } catch(e) {}
      previewSourceRef.current = null;
    }
  };

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
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setResult(null);
    }
  };

  const handleReset = () => {
    setAudioUrl(null);
    setAudioBuffer(null);
    setResult(null);
    setTrimRange({ start: 0, end: 0 });
    chunksRef.current = [];
    resetPlaybackState();
  };

  // --- Advanced Playback Controls ---

  const stopPlayback = () => {
    if (previewSourceRef.current) {
      // Remove onended to prevent double state update if called manually
      previewSourceRef.current.onended = null; 
      try {
        previewSourceRef.current.stop();
      } catch (e) {
        // ignore errors if already stopped
      }
      previewSourceRef.current = null;
    }
  };

  const handlePlay = () => {
    if (!audioContextRef.current || !audioBuffer) return;
    
    // Resume context if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    stopPlayback();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;

    const segmentDuration = trimRange.end - trimRange.start;
    const currentOffset = playbackOffset;
    
    // If we are at the end, restart from beginning of segment
    const startOffset = currentOffset >= segmentDuration ? 0 : currentOffset;
    const playDuration = segmentDuration - startOffset;

    if (playDuration <= 0) {
       setPlaybackOffset(0);
       return;
    }

    source.connect(audioContextRef.current.destination);
    // start(when, offset_in_buffer, duration)
    source.start(0, trimRange.start + startOffset, playDuration);

    previewSourceRef.current = source;
    startTimeRef.current = audioContextRef.current.currentTime;
    
    // Update state to playing with correct offset
    setPlaybackOffset(startOffset);
    setPlaybackState('playing');

    source.onended = () => {
      // Natural end of playback
      setPlaybackState('stopped');
      setPlaybackOffset(0);
    };
  };

  const handlePause = () => {
    if (playbackState !== 'playing' || !audioContextRef.current) return;
    
    stopPlayback();
    
    // Calculate new offset based on how long we played
    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    setPlaybackOffset(prev => prev + elapsed);
    setPlaybackState('paused');
  };

  const handleStop = () => {
    stopPlayback();
    setPlaybackOffset(0);
    setPlaybackState('stopped');
  };

  // --- Analysis ---

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
    if (!audioBuffer) return;
    setLoading(true);
    // Ensure playback is stopped before analyzing
    handleStop();

    try {
      // 1. Slice and Encode
      const wavBlob = audioBufferToWav(audioBuffer, trimRange.start, trimRange.end);
      
      // 2. Convert to Base64
      const base64 = await blobToBase64(wavBlob);
      
      // 3. Analyze
      const data = await analyzeAudio(base64, 'audio/wav');
      setResult(data);
      if (audioUrl) {
          onAnalyzeComplete(audioUrl, data);
      }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
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
             <div className="w-full max-w-lg space-y-6">
               {/* Original Player (Reference) */}
               <div className="bg-darker p-4 rounded-xl flex items-center gap-4 border border-white/10">
                 <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    <Volume2 className="w-5 h-5" />
                 </div>
                 <audio controls src={audioUrl} className="w-full h-8" />
               </div>

               {/* Trimming Controls */}
               {audioBuffer && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-secondary">
                      <Scissors className="w-4 h-4" />
                      <span className="text-sm font-semibold">Trim Audio</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      Segment Duration: {formatTime(trimRange.end - trimRange.start)}
                    </span>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="relative h-12 bg-black/40 rounded-lg overflow-hidden flex items-center px-2">
                      {/* Simple Timeline Visual */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                         <div className="w-full h-0.5 bg-gray-500"></div>
                      </div>
                      {/* Selected Region Visual */}
                      <div 
                        className="absolute top-0 bottom-0 bg-secondary/20 border-x border-secondary/50 pointer-events-none"
                        style={{
                          left: `${(trimRange.start / audioBuffer.duration) * 100}%`,
                          right: `${100 - (trimRange.end / audioBuffer.duration) * 100}%`
                        }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Start: {formatTime(trimRange.start)}</label>
                        <input 
                          type="range" 
                          min={0} 
                          max={audioBuffer.duration} 
                          step={0.1}
                          value={trimRange.start}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setTrimRange(prev => ({ ...prev, start: Math.min(val, prev.end - 0.5) }));
                          }}
                          className="w-full accent-secondary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">End: {formatTime(trimRange.end)}</label>
                        <input 
                          type="range" 
                          min={0} 
                          max={audioBuffer.duration} 
                          step={0.1}
                          value={trimRange.end}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setTrimRange(prev => ({ ...prev, end: Math.max(val, prev.start + 0.5) }));
                          }}
                          className="w-full accent-secondary"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Playback Controls */}
                  <div className="flex justify-center gap-4 pt-2 border-t border-white/5 mt-4">
                    <button 
                      onClick={handlePlay}
                      disabled={playbackState === 'playing'}
                      className={`p-3 rounded-full transition-all ${playbackState === 'playing' ? 'bg-green-500/20 text-green-500 opacity-50 cursor-not-allowed' : 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/20'}`}
                      title="Play Segment"
                    >
                      <Play className="w-5 h-5 fill-current" />
                    </button>
                    
                    <button 
                      onClick={handlePause}
                      disabled={playbackState !== 'playing'}
                      className={`p-3 rounded-full transition-all ${playbackState !== 'playing' ? 'bg-white/5 text-gray-500 opacity-50 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-white shadow-lg shadow-yellow-500/20'}`}
                      title="Pause"
                    >
                      <Pause className="w-5 h-5 fill-current" />
                    </button>

                    <button 
                      onClick={handleStop}
                      disabled={playbackState === 'stopped'}
                      className={`p-3 rounded-full transition-all ${playbackState === 'stopped' ? 'bg-white/5 text-gray-500 opacity-50 cursor-not-allowed' : 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20'}`}
                      title="Stop"
                    >
                      <Square className="w-5 h-5 fill-current" />
                    </button>
                  </div>
                </div>
               )}

               {/* Action Buttons */}
               <div className="flex justify-center gap-3 pt-2">
                 <button 
                   onClick={handleReset}
                   className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/10 rounded-lg"
                 >
                   <RotateCcw className="w-4 h-4" />
                   New Recording
                 </button>
                 <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-secondary/25"
                  >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                    {loading ? 'Processing...' : 'Analyze Segment'}
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
              <span className="text-xs uppercase tracking-wider opacity-60">Engine</span>
              <div className="font-mono text-sm">Python (Speech/BERT)</div>
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