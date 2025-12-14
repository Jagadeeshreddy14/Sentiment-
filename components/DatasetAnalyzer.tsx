import React, { useState, useEffect } from 'react';
import { Upload, FileText, Play, Loader2, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { analyzeBatch } from '../services/geminiService';
import { DatasetRow, SentimentType, ChartDataPoint } from '../types';

interface DatasetAnalyzerProps {
  onAnalyzeComplete: (data: DatasetRow[]) => void;
  initialState?: { input: DatasetRow[], result: any };
}

export const DatasetAnalyzer: React.FC<DatasetAnalyzerProps> = ({ onAnalyzeComplete, initialState }) => {
  const [data, setData] = useState<DatasetRow[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Load from history
  useEffect(() => {
    if (initialState) {
      setData(initialState.input);
    }
  }, [initialState]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Simple CSV parser: assumes one column of text or comma separated where first col is text
      // For robust parsing in prod, use 'papaparse' library.
      const rows = text.split('\n').filter(r => r.trim()).slice(0, 20); // Limit to 20 for demo to save quota
      const parsedData: DatasetRow[] = rows.map((row, idx) => ({
        id: idx,
        text: row.replace(/"/g, ''), // Basic cleanup
      }));
      setData(parsedData);
    };
    reader.readAsText(file);
  };

  const handleDownloadCSV = () => {
    if (data.length === 0) return;

    // Headers
    const headers = ['ID', 'Text', 'Sentiment', 'Confidence', 'Keywords', 'Explanation'];
    
    // Rows
    const rows = data.map(row => {
      const result = row.result;
      return [
        row.id + 1,
        `"${row.text.replace(/"/g, '""')}"`, // Escape quotes and wrap in quotes
        result ? result.sentiment : 'Pending',
        result ? (result.score * 100).toFixed(1) + '%' : '',
        result ? `"${result.keywords.join(', ').replace(/"/g, '""')}"` : '',
        result ? `"${result.explanation.replace(/"/g, '""')}"` : ''
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sentiment_analysis_results_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runBatchAnalysis = async () => {
    if (data.length === 0) return;
    setAnalyzing(true);
    setProgress(0);

    // Process in chunks of 5 to show progress
    const chunkSize = 5;
    const newData = [...data];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const texts = chunk.map(r => r.text);
      
      try {
        const results = await analyzeBatch(texts);
        
        results.forEach((res, idx) => {
          if (newData[i + idx]) {
            newData[i + idx].result = res;
          }
        });
        
        setData([...newData]); // Update state to trigger render
        setProgress(Math.min(100, Math.round(((i + chunkSize) / data.length) * 100)));
      } catch (err) {
        console.error(err);
      }
    }

    setAnalyzing(false);
    onAnalyzeComplete(newData);
  };

  const getChartData = (): ChartDataPoint[] => {
    const counts = {
      [SentimentType.POSITIVE]: 0,
      [SentimentType.NEGATIVE]: 0,
      [SentimentType.NEUTRAL]: 0,
    };
    
    let totalAnalyzed = 0;
    data.forEach(row => {
      if (row.result) {
        counts[row.result.sentiment]++;
        totalAnalyzed++;
      }
    });

    if (totalAnalyzed === 0) return [];

    return [
      { name: 'Positive', value: counts[SentimentType.POSITIVE], fill: '#4ade80' },
      { name: 'Neutral', value: counts[SentimentType.NEUTRAL], fill: '#facc15' },
      { name: 'Negative', value: counts[SentimentType.NEGATIVE], fill: '#f87171' },
    ];
  };

  const chartData = getChartData();
  const hasResults = data.some(d => d.result);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card p-6 rounded-2xl shadow-lg border border-white/5 h-full">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <span className="bg-blue-500/20 p-2 rounded-lg text-blue-400">📂</span>
              Dataset
            </h2>
            
            {!data.length ? (
              <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                <div className="p-4 bg-darker rounded-full mb-4 group-hover:scale-110 transition-transform">
                   <Upload className="w-8 h-8 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-gray-300">Upload CSV / TXT</span>
                <span className="text-xs text-gray-500 mt-2">Max 20 rows for demo</span>
                <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-darker p-4 rounded-xl border border-white/5">
                   <div className="flex items-center gap-3">
                     <FileText className="w-8 h-8 text-blue-400" />
                     <div>
                       <div className="text-sm font-medium text-white">Dataset Loaded</div>
                       <div className="text-xs text-gray-500">{data.length} rows</div>
                     </div>
                   </div>
                   <button onClick={() => setData([])} className="text-xs text-red-400 hover:text-red-300">Clear</button>
                </div>
                
                <button
                  onClick={runBatchAnalysis}
                  disabled={analyzing || hasResults}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-all"
                >
                  {analyzing ? <Loader2 className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {analyzing ? `Processing ${progress}%` : hasResults ? 'Analysis Complete' : 'Run Batch Analysis'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Visualization Section */}
        <div className="md:col-span-2">
           <div className="bg-card p-6 rounded-2xl shadow-lg border border-white/5 h-full flex flex-col">
             <h2 className="text-xl font-semibold mb-4 text-white">Sentiment Distribution</h2>
             {hasResults ? (
               <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="h-64">
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
                       >
                         {chartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(0,0,0,0)" />
                         ))}
                       </Pie>
                       <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                          itemStyle={{ color: '#f8fafc' }}
                       />
                       <Legend verticalAlign="bottom" height={36}/>
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
                 <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <RechartsTooltip 
                           cursor={{fill: 'rgba(255,255,255,0.05)'}}
                           contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
               </div>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/5 rounded-xl bg-darker/30">
                 <div className="p-4 bg-white/5 rounded-full mb-3">
                    <PieChart className="w-8 h-8 opacity-50" />
                 </div>
                 <p>Upload data and run analysis to view insights</p>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Data Table */}
      {data.length > 0 && (
        <div className="bg-card rounded-2xl shadow-lg border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-semibold text-white">Raw Data Results</h3>
            {hasResults && (
              <button 
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-darker/50 text-xs uppercase text-gray-400">
                  <th className="p-4 font-medium border-b border-white/5">ID</th>
                  <th className="p-4 font-medium border-b border-white/5 w-1/2">Text Content</th>
                  <th className="p-4 font-medium border-b border-white/5">Sentiment</th>
                  <th className="p-4 font-medium border-b border-white/5">Confidence</th>
                  <th className="p-4 font-medium border-b border-white/5">Keywords</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-gray-500 font-mono text-xs">{row.id + 1}</td>
                    <td className="p-4 text-gray-300 text-sm truncate max-w-xs" title={row.text}>{row.text}</td>
                    <td className="p-4">
                      {row.result ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${
                          row.result.sentiment === SentimentType.POSITIVE ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          row.result.sentiment === SentimentType.NEGATIVE ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {row.result.sentiment}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs italic">Pending...</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-400 text-sm">
                      {row.result ? `${(row.result.score * 100).toFixed(0)}%` : '-'}
                    </td>
                    <td className="p-4">
                      {row.result?.keywords ? (
                        <div className="flex gap-1">
                          {row.result.keywords.slice(0, 2).map((k, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-gray-400">{k}</span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};