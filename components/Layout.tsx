import React, { useState } from 'react';
import { MessageSquare, Mic, Database, BrainCircuit, History, X, Clock, ChevronRight } from 'lucide-react';
import { AnalyzerMode, HistoryItem } from '../types';

interface LayoutProps {
  currentMode: AnalyzerMode;
  setMode: (mode: AnalyzerMode) => void;
  history: HistoryItem[];
  onLoadHistory: (item: HistoryItem) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentMode, setMode, history, onLoadHistory, children }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const navItems = [
    { id: 'text', label: 'Text Analysis', icon: MessageSquare },
    { id: 'voice', label: 'Voice Analysis', icon: Mic },
    { id: 'dataset', label: 'Dataset Batch', icon: Database },
  ];

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-darker text-slate-200 flex flex-col md:flex-row overflow-hidden">
      {/* Main Navigation Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-white/5 flex-shrink-0 flex flex-col h-auto md:h-screen z-20">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <BrainCircuit className="text-white w-5 h-5" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            SentiMind
          </span>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id as AnalyzerMode)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentMode === item.id 
                  ? 'bg-primary/10 text-primary shadow-lg shadow-primary/5 border border-primary/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-4 rounded-xl border border-white/10">
            <h4 className="text-xs font-semibold uppercase text-indigo-300 mb-1">Architecture</h4>
            <div className="flex items-center gap-2">
               <span className="text-sm font-bold text-white">Python + BERT</span>
            </div>
            <p className="text-[10px] text-indigo-200/60 mt-2 leading-relaxed">
              Powered by Python backend algorithms using BERT Transformers for advanced NLU.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300">
        {/* Header */}
        <header className="p-6 md:p-8 flex items-center justify-between bg-darker/80 backdrop-blur-sm border-b border-white/5 z-10">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {navItems.find(n => n.id === currentMode)?.label}
            </h1>
            <p className="text-gray-400 text-sm mt-1 hidden md:block">
              {currentMode === 'text' && "Real-time sentiment detection for single text inputs."}
              {currentMode === 'voice' && "Multimodal audio processing to detect emotional tone."}
              {currentMode === 'dataset' && "Bulk processing of CSV/Text files with visual analytics."}
            </p>
          </div>

          <button 
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${isHistoryOpen ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <History className="w-4 h-4" />
            <span className="text-sm font-medium">History</span>
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 pb-12">
          {children}
        </div>
      </main>

      {/* History Sidebar */}
      <div 
        className={`fixed inset-y-0 right-0 w-80 bg-card border-l border-white/5 shadow-2xl transform transition-transform duration-300 ease-in-out z-30 flex flex-col ${
          isHistoryOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-darker/50">
          <h2 className="font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Recent Analysis
          </h2>
          <button 
            onClick={() => setIsHistoryOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No recent history</p>
            </div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onLoadHistory(item);
                  if (window.innerWidth < 768) setIsHistoryOpen(false);
                }}
                className="w-full text-left bg-darker/50 hover:bg-white/5 border border-white/5 hover:border-primary/30 rounded-xl p-3 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                      {item.mode === 'text' && <MessageSquare className="w-3 h-3 text-blue-400" />}
                      {item.mode === 'voice' && <Mic className="w-3 h-3 text-purple-400" />}
                      {item.mode === 'dataset' && <Database className="w-3 h-3 text-green-400" />}
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">{item.mode}</span>
                   </div>
                   <span className="text-[10px] text-gray-600 font-mono">{formatTime(item.timestamp)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                   <p className="text-sm text-gray-300 truncate font-medium flex-1">{item.summary}</p>
                   <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                </div>
                {item.mode !== 'dataset' && item.data.result && (
                   <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                         item.data.result.sentiment === 'Positive' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                         item.data.result.sentiment === 'Negative' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                         'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                      }`}>
                        {item.data.result.sentiment}
                      </span>
                   </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isHistoryOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsHistoryOpen(false)}
        />
      )}
    </div>
  );
};