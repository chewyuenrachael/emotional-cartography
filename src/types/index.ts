// ============================================================
// EMOTIONAL CARTOGRAPHY - Type Definitions
// ============================================================

export interface EmotionCluster {
  id: number;
  label: string;
  confidence: number;
  centroid?: [number, number, number]; // PCA-reduced coordinates
}

export interface ChapterNarrative {
  headline: string;
  subtitle: string;
  body: string;
  technicalNote: string;
}

export interface Chapter {
  id: string;
  country: string;
  city: string;
  coordinates: [number, number]; // [longitude, latitude]
  dateRange: string;
  scrollStart: number; // 0-1
  scrollEnd: number; // 0-1
  color: string;
  emotionCluster: EmotionCluster;
  narrative: ChapterNarrative;
  audioClips: string[];
}

export interface AudioClipFeatures {
  mfcc: number[];
  spectralCentroid: number;
  spectralBandwidth: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  rmsEnergy: number;
  tempo: number;
}

export interface ClusterPrediction {
  cluster: number;
  confidence: number;
}

export interface AudioClip {
  id: string;
  filename: string;
  duration: number;
  recordedAt?: string;
  waveform: number[]; // Downsampled to ~100 points
  features: AudioClipFeatures;
  predictions: {
    kmeans?: ClusterPrediction;
    agglomerative?: ClusterPrediction;
    spectral?: ClusterPrediction;
  };
  spectrogramUrl: string;
}

export interface JourneyMetadata {
  totalDuration: string;
  totalClips: number;
  countries: number;
  dateRange: [string, string];
}

export interface JourneyData {
  metadata: JourneyMetadata;
  chapters: Chapter[];
}

export type MLStage = 'idle' | 'extracting' | 'clustering' | 'complete';
