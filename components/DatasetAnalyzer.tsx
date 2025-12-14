import React, { useState, useEffect } from 'react';
import { Upload, FileText, Play, Loader2, Download, Filter, X, RefreshCcw, Trash2, PieChart as PieChartIcon, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { analyzeBatch } from '../services/geminiService';
import { DatasetRow, SentimentType } from '../types';

interface DatasetAnalyzerProps {
  onAnalyzeComplete: (data: DatasetRow[]) => void;
  initialState?: { input: DatasetRow[], result: any };
}

const COLORS = {
  [SentimentType.POSITIVE]: '#4ade80',
  [SentimentType.NEGATIVE]: '#f87171',
  [SentimentType.NEUTRAL]: '#fbbf24',
};

export const DatasetAnalyzer: React.FC<DatasetAnalyzerProps> = ({ onAnalyzeComplete, initialState }) => {
  const [data, setData] = useState<DatasetRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<SentimentType | null>(null);

  useEffect(() => {
    if (initialState?.input) {
      setData(initialState.input);
    }
  }, [initialState]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(r => r.trim().length > 0);
      
      // Limit to 50 rows to prevent API rate limits in this demo
      const limit = 50;
      const limitedRows = rows.slice(0, limit);
      
      const parsedData: DatasetRow[] = limitedRows.map((row, idx) => ({
        id: idx,
        text: row.replace(/^"|"$/g, '').trim(), // Remove surrounding quotes if present
      }));
      setData(parsedData);
      setFilter(null);
      setProgress(0);
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    setData([]);
    setFileName(null);
    setFilter(null);
    setProgress(0);
  };

  const runAnalysis = async () => {
    if (data.length === 0) return;
    setAnalyzing(true);
    setProgress(0);
    
    const updatedData = [...data];
    const batchSize = 5; // Process in small chunks
    
    for (let i = 0; i < updatedData.length; i += batchSize) {
      const chunk = updatedData.slice(i, i + batchSize);
      // Only process items that haven't been analyzed yet
      const pendingIndices = chunk.map((_, idx) => i + idx).filter(idx => !updatedData[idx].result);
      
      if (pendingIndices.length === 0) continue;

      const textsToAnalyze = pendingIndices.map(idx => updatedData[idx].text);

      try {
        const results = await analyzeBatch(textsToAnalyze);
        
        results.forEach((res, resIdx) => {
          const globalIndex = pendingIndices[resIdx];
          if (updatedData[globalIndex]) {
            updatedData[globalIndex] = { ...updatedData[globalIndex], result: res };
          }
        });
        
        setData([...updatedData]);
        setProgress(Math.min(100, Math.round(((i + batchSize) / updatedData.length) * 100)));
        
        // Small delay to be gentle on the API
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error("Batch failed", e);
      }
    }

    setAnalyzing(false);
    setProgress(100);
    onAnalyzeComplete(updatedData);
  };

  const downloadCSV = () => {
    const headers = ['ID', 'Text', 'Sentiment', 'Confidence', 'Keywords', 'Explanation'];
    const csvRows = data.map(row => {
      const r = row.result;
      return [
        row.id + 1,
        `"${row.text.replace(/"/g, '""')}"`,
        r?.sentiment || 'Pending',
        r ? (r.score * 100).toFixed(1) + '%' : '',
        `"${r?.keywords.join(', ').replace(/"/g, '""') || ''}"`,
        `"${r?.explanation.replace(/"/g, '""') || ''}"`
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentiment_analysis_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  // Statistics
  const stats = data.reduce((acc, curr) => {
    if (curr.result) {
      acc[curr.result.sentiment] = (acc[curr.result.sentiment] || 0) + 1;
      acc.analyzed++;
    }
    return acc;
  }, { [SentimentType.POSITIVE]: 0, [SentimentType.NEGATIVE]: 0, [SentimentType.NEUTRAL]: 0, analyzed: 0 });

  const chartData = [
    { name: SentimentType.POSITIVE, value: stats[SentimentType.POSITIVE] },
    { name: SentimentType.NEGATIVE, value: stats[SentimentType.NEGATIVE] },
    { name: SentimentType.NEUTRAL, value: stats[SentimentType.NEUTRAL] },
  ].filter(d => d.value > 0);

  const filteredData = filter ? data.filter(d => d.result?.sentiment === filter) : data;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Upload & Controls */}
        <div className="space-y-6">
          {/* Upload Card */}
          <div className="bg-card p-6 rounded-2xl shadow-lg border border-white/5">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <span className="bg-secondary/20 p-2 rounded-lg text-secondary">📁</span>
              Dataset
            </h2>
            
            {!data.length ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="p-3 bg-secondary/10 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-secondary" />
                  </div>
                  <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-white">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-gray-500">CSV or Text files (Max 50 rows)</p>
                </div>
                <input type="file" className="hidden" accept=".csv,.txt" onChange={handleFileUpload} />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-400" />
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-white truncate max-w-[150px]">{fileName}</p>
                      <p className="text-xs text-gray-400">{data.length} rows detected</p>
                    </div>
                  </div>
                  <button onClick={handleClear} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {!analyzing && stats.analyzed < data.length && (
                  <button
                    onClick={runAnalysis}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white px-4 py-3 rounded-xl font-medium transition-all shadow-lg shadow-primary/20"
                  >
                    <Play className="w-4 h-4" />
                    Start Analysis
                  </button>
                )}

                {analyzing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Analyzing...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {stats.analyzed > 0 && !analyzing && (
                  <button
                    onClick={downloadCSV}
                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl font-medium transition-all border border-white/10"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats Summary Card */}
          {stats.analyzed > 0 && (
            <div className="bg-card p-6 rounded-2xl shadow-lg border border-white/5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Sentiment Distribution</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as SentimentType]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Data Table */}
        <div className="lg:col-span-2 bg-card rounded-2xl shadow-lg border border-white/5 flex flex-col h-[600px]">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="bg-blue-500/20 p-2 rounded-lg text-blue-400">📊</span>
              Analysis Results
            </h2>
            <div className="flex gap-2">
               {filter && (
                 <button 
                   onClick={() => setFilter(null)}
                   className="flex items-center gap-1 text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                 >
                   Clear Filter <X className="w-3 h-3" />
                 </button>
               )}
            </div>
          </div>

          {/* Filter Tabs */}
          {stats.analyzed > 0 && (
            <div className="flex p-2 gap-2 overflow-x-auto border-b border-white/5 bg-black/20">
              <button 
                onClick={() => setFilter(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${!filter ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                All ({data.length})
              </button>
              <button 
                onClick={() => setFilter(SentimentType.POSITIVE)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${filter === SentimentType.POSITIVE ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'text-gray-400 hover:text-green-400'}`}
              >
                Positive ({stats[SentimentType.POSITIVE]})
              </button>
              <button 
                onClick={() => setFilter(SentimentType.NEGATIVE)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${filter === SentimentType.NEGATIVE ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'text-gray-400 hover:text-red-400'}`}
              >
                Negative ({stats[SentimentType.NEGATIVE]})
              </button>
              <button 
                onClick={() => setFilter(SentimentType.NEUTRAL)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${filter === SentimentType.NEUTRAL ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 'text-gray-400 hover:text-yellow-400'}`}
              >
                Neutral ({stats[SentimentType.NEUTRAL]})
              </button>
            </div>
          )}

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {!data.length ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                <Filter className="w-12 h-12 mb-3" />
                <p>Upload a dataset to view results</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                <p>No records match this filter</p>
              </div>
            ) : (
              filteredData.map((row) => (
                <div key={row.id} className="bg-darker/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-gray-300 text-sm leading-relaxed mb-3">"{row.text}"</p>
                      
                      {row.result ? (
                        <div className="flex flex-wrap items-center gap-3">
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                             row.result.sentiment === SentimentType.POSITIVE ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                             row.result.sentiment === SentimentType.NEGATIVE ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                             'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                           }`}>
                             {row.result.sentiment === SentimentType.POSITIVE ? <CheckCircle2 className="w-3 h-3" /> :
                              row.result.sentiment === SentimentType.NEGATIVE ? <AlertCircle className="w-3 h-3" /> :
                              <HelpCircle className="w-3 h-3" />}
                             {row.result.sentiment}
                           </span>
                           <span className="text-xs text-gray-500 font-mono">Conf: {(row.result.score * 100).toFixed(0)}%</span>
                           {row.result.keywords.length > 0 && (
                             <div className="flex gap-1">
                               {row.result.keywords.slice(0, 2).map((k, i) => (
                                 <span key={i} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-400">{k}</span>
                               ))}
                             </div>
                           )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-xs text-gray-500">
                          <Loader2 className="w-3 h-3 animate-spin" /> Pending Analysis...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};