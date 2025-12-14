import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { TextAnalyzer } from './components/TextAnalyzer';
import { VoiceAnalyzer } from './components/VoiceAnalyzer';
import { DatasetAnalyzer } from './components/DatasetAnalyzer';
import { AnalyzerMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AnalyzerMode>('text');

  return (
    <Layout currentMode={mode} setMode={setMode}>
      {mode === 'text' && <TextAnalyzer />}
      {mode === 'voice' && <VoiceAnalyzer />}
      {mode === 'dataset' && <DatasetAnalyzer />}
    </Layout>
  );
};

export default App;