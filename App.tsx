import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { TextAnalyzer } from './components/TextAnalyzer';
import { VoiceAnalyzer } from './components/VoiceAnalyzer';
import { DatasetAnalyzer } from './components/DatasetAnalyzer';
import { AnalyzerMode, HistoryItem } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AnalyzerMode>('text');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadedItem, setLoadedItem] = useState<HistoryItem | null>(null);

  const handleModeChange = (newMode: AnalyzerMode) => {
    setMode(newMode);
    setLoadedItem(null); // Clear loaded data when manually switching modes
  };

  const addToHistory = (mode: AnalyzerMode, summary: string, input: any, result: any) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      mode,
      summary,
      data: { input, result }
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setMode(item.mode);
    setLoadedItem(item);
  };

  return (
    <Layout 
      currentMode={mode} 
      setMode={handleModeChange}
      history={history}
      onLoadHistory={loadHistoryItem}
    >
      {mode === 'text' && (
        <TextAnalyzer 
          onAnalyzeComplete={(input, result) => addToHistory('text', input.slice(0, 30) + '...', input, result)}
          initialState={loadedItem?.mode === 'text' ? loadedItem.data : undefined}
        />
      )}
      {mode === 'voice' && (
        <VoiceAnalyzer 
          onAnalyzeComplete={(audioUrl, result) => addToHistory('voice', 'Audio Recording', audioUrl, result)}
          initialState={loadedItem?.mode === 'voice' ? loadedItem.data : undefined}
        />
      )}
      {mode === 'dataset' && (
        <DatasetAnalyzer 
          onAnalyzeComplete={(data) => addToHistory('dataset', `Dataset (${data.length} rows)`, data, null)}
          initialState={loadedItem?.mode === 'dataset' ? loadedItem.data : undefined}
        />
      )}
    </Layout>
  );
};

export default App;