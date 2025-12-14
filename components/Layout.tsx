import React from 'react';
import { MessageSquare, Mic, Database, BrainCircuit } from 'lucide-react';
import { AnalyzerMode } from '../types';

interface LayoutProps {
  currentMode: AnalyzerMode;
  setMode: (mode: AnalyzerMode) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentMode, setMode, children }) => {
  const navItems = [
    { id: 'text', label: 'Text Analysis', icon: MessageSquare },
    { id: 'voice', label: 'Voice Analysis', icon: Mic },
    { id: 'dataset', label: 'Dataset Batch', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-darker text-slate-200 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-white/5 flex-shrink-0">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <BrainCircuit className="text-white w-5 h-5" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            SentiMind
          </span>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id as AnalyzerMode)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
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

        <div className="absolute bottom-0 w-full md:w-64 p-6 border-t border-white/5">
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen">
        <header className="p-6 md:p-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {navItems.find(n => n.id === currentMode)?.label}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {currentMode === 'text' && "Real-time sentiment detection for single text inputs."}
              {currentMode === 'voice' && "Multimodal audio processing to detect emotional tone."}
              {currentMode === 'dataset' && "Bulk processing of CSV/Text files with visual analytics."}
            </p>
          </div>
        </header>

        <div className="px-6 md:px-8 pb-12">
          {children}
        </div>
      </main>
    </div>
  );
};