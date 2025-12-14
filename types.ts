export enum SentimentType {
  POSITIVE = 'Positive',
  NEGATIVE = 'Negative',
  NEUTRAL = 'Neutral',
}

export interface AnalysisResult {
  sentiment: SentimentType;
  score: number; // 0 to 1 confidence
  keywords: string[];
  explanation: string;
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