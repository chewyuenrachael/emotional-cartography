'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJourneyStore } from '@/stores/journeyStore';
import type { AudioClipFeatures, EmotionCluster } from '@/types';

interface MLVisualizerProps {
  spectrogramUrl: string;
  features: AudioClipFeatures;
  cluster: EmotionCluster;
}

export function MLVisualizer({
  spectrogramUrl,
  features,
  cluster,
}: MLVisualizerProps) {
  const { mlStage, setMlStage } = useJourneyStore();

  // Animate through ML pipeline stages
  useEffect(() => {
    setMlStage('idle');

    const timer1 = setTimeout(() => setMlStage('extracting'), 500);
    const timer2 = setTimeout(() => setMlStage('clustering'), 2000);
    const timer3 = setTimeout(() => setMlStage('complete'), 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [spectrogramUrl, setMlStage]);

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-xl p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Spectrogram */}
      <div className="relative">
        <h3 className="text-[10px] sm:text-xs uppercase tracking-widest text-white/50 mb-2 font-mono">
          Mel Spectrogram
        </h3>
        <motion.div
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          animate={{
            clipPath: mlStage !== 'idle' ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
          }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-lg"
        >
          {spectrogramUrl ? (
            <img
              src={spectrogramUrl}
              alt="Mel Spectrogram"
              className="w-full h-24 sm:h-28 md:h-32 object-cover"
            />
          ) : (
            <SpectrogramPlaceholder />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-purple-500/20 rounded-lg" />
        </motion.div>
      </div>

      {/* Extracted Features */}
      <AnimatePresence>
        {(mlStage === 'clustering' || mlStage === 'complete') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-[10px] sm:text-xs uppercase tracking-widest text-white/50 mb-2 sm:mb-3 font-mono">
              Extracted Features
            </h3>
            {/* Mobile: 2x2 grid, Tablet+: 2x2 grid with larger bars */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <FeatureBar
                label="Spectral Centroid"
                shortLabel="Centroid"
                value={features.spectralCentroid}
                max={5000}
              />
              <FeatureBar
                label="Zero Crossing"
                shortLabel="Zero Cross"
                value={features.zeroCrossingRate}
                max={0.2}
              />
              <FeatureBar 
                label="RMS Energy" 
                shortLabel="RMS"
                value={features.rmsEnergy} 
                max={0.1} 
              />
              <FeatureBar 
                label="Tempo" 
                shortLabel="Tempo"
                value={features.tempo} 
                max={200} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cluster Result */}
      <AnimatePresence>
        {mlStage === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center pt-3 sm:pt-4 border-t border-white/10"
          >
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-white/50 mb-1 font-mono">
              Emotional Signature
            </div>
            <div className="text-lg sm:text-xl md:text-2xl font-serif text-white">
              {cluster.label}
            </div>
            <div className="text-xs sm:text-sm text-white/60 font-mono">
              {(cluster.confidence * 100).toFixed(1)}% confidence
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureBar({
  label,
  shortLabel,
  value,
  max,
}: {
  label: string;
  shortLabel?: string;
  value: number;
  max: number;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div>
      <div className="flex justify-between text-[10px] sm:text-xs text-white/60 mb-1">
        {/* Show short label on mobile, full label on tablet+ */}
        <span className="sm:hidden">{shortLabel || label}</span>
        <span className="hidden sm:inline">{label}</span>
        <span className="font-mono">{value.toFixed(2)}</span>
      </div>
      <div className="h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
        />
      </div>
    </div>
  );
}

function SpectrogramPlaceholder() {
  return (
    <div className="w-full h-24 sm:h-28 md:h-32 bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-cyan-900/30 flex items-center justify-center">
      <div className="flex gap-0.5 sm:gap-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="w-0.5 sm:w-1 bg-purple-500/40 rounded-full"
            style={{
              height: `${Math.sin(i * 0.3) * 15 + 30}px`,
              opacity: 0.3 + Math.sin(i * 0.5) * 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}
