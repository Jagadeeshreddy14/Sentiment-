export enum SentimentType {
  POSITIVE = 'Positive',
  NEGATIVE = 'Negative',
  NEUTRAL = 'Neutral',
}

export type EmergencyCategory = 'Health' | 'Safety' | 'General' | 'None';

export interface AnalysisResult {
  sentiment: SentimentType;
  score: number; // 0 to 1 confidence
  keywords: string[];
  explanation: string;
  transcript?: string;
  emergencyCategory: EmergencyCategory;
}

export interface DatasetRow {
  id: number;
  text: string;
  result?: AnalysisResult;
}

export type AnalyzerMode = 'text' | 'voice' | 'dataset';

export interface ChartDataPoint {
  name: string;
  value: number;
  fill: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  mode: AnalyzerMode;
  summary: string;
  data: {
    input: any;
    result: any;
  };
}