'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { MotionConfig } from 'framer-motion';
import { ScrollManager } from '@/components/ScrollManager';
import { MLVisualizer } from '@/components/MLVisualizer';
import { NarrativePanel } from '@/components/NarrativePanel';
import { Hero } from '@/components/Hero';
import Reflections from '@/components/Reflections';
import { ClusterMap, type ClipPoint } from '@/components/ClusterMap';
import { useJourneyStore } from '@/stores/journeyStore';
import type { JourneyData, AudioClipFeatures } from '@/types';
import type { AudioClipInfo } from '@/components/AudioEngine';

// Heavy client-only modules — split out of the entry chunk.
// MapCanvas pulls in mapbox-gl (~1.5MB); AudioEngine pulls in howler.
const MapCanvas = dynamic(
  () => import('@/components/MapCanvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 w-full h-full bg-[#0a0a0f]" style={{ zIndex: 0 }} />
    ),
  },
);
const AudioEngine = dynamic(
  () => import('@/components/AudioEngine').then((m) => m.AudioEngine),
  { ssr: false },
);

// Default features for visualization (fallback)
const DEFAULT_FEATURES: AudioClipFeatures = {
  mfcc: [],
  spectralCentroid: 2500,
  spectralBandwidth: 1800,
  spectralRolloff: 4000,
  zeroCrossingRate: 0.08,
  rmsEnergy: 0.045,
  tempo: 120,
};

interface ClipData {
  id: string;
  waveform: number[];
  features: AudioClipFeatures;
  predictions: {
    agglomerative?: {
      cluster: number;
      confidence: number;
    };
  };
}

export default function HomePage() {
  const setChapters = useJourneyStore((s) => s.setChapters);
  const [journeyData, setJourneyData] = useState<JourneyData | null>(null);
  const [clipDataMap, setClipDataMap] = useState<Map<string, ClipData>>(new Map());
  const [audioClips, setAudioClips] = useState<AudioClipInfo[]>([]);
  const [expandedML, setExpandedML] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load journey data
  useEffect(() => {
    let cancelled = false;
    fetch('/data/journey.json')
      .then((res) => {
        if (!res.ok) throw new Error(`journey.json: HTTP ${res.status}`);
        return res.json();
      })
      .then((data: JourneyData) => {
        if (cancelled) return;
        setJourneyData(data);
        setChapters(data.chapters);

        // Load clip data for all chapters
        const allClipIds = data.chapters.flatMap((ch) => ch.audioClips);
        Promise.all(
          allClipIds.map((clipId) =>
            fetch(`/data/clips/${clipId}.json`)
              .then((res) => res.json())
              .then((clipData: ClipData) => [clipId, clipData] as const)
              .catch(() => null)
          )
        ).then((results) => {
          if (cancelled) return;
          const map = new Map<string, ClipData>();
          const clips: AudioClipInfo[] = [];

          results.forEach((result) => {
            if (result) {
              const [clipId, clipData] = result;
              map.set(clipId, clipData);
              clips.push({
                id: clipId,
                url: `/audio/${clipId}.wav`,
                waveform: clipData.waveform,
              });
            }
          });

          setClipDataMap(map);
          setAudioClips(clips);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load journey data:', err);
        setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [setChapters]);

  // Build the PCA scatter input: one ClipPoint per loaded clip with MFCC.
  const clusterPoints = useMemo<ClipPoint[]>(() => {
    if (!journeyData) return [];
    return journeyData.chapters.flatMap((ch) =>
      ch.audioClips
        .map((clipId) => {
          const clip = clipDataMap.get(clipId);
          if (!clip || !clip.features.mfcc?.length) return null;
          return {
            id: clipId,
            mfcc: clip.features.mfcc,
            cluster: ch.emotionCluster.id,
            city: ch.city,
          } satisfies ClipPoint;
        })
        .filter((p): p is ClipPoint => p !== null),
    );
  }, [journeyData, clipDataMap]);

  // Get clip features for current chapter
  const getChapterFeatures = (clipId: string): AudioClipFeatures => {
    const clipData = clipDataMap.get(clipId);
    return clipData?.features || DEFAULT_FEATURES;
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-white/80 mb-2 font-serif">Couldn&apos;t load the journey.</p>
          <p className="text-white/40 font-mono text-xs mb-6">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 text-sm text-white/80 font-mono transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!journeyData) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Loading journey...</div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <main className="text-white min-h-screen">
      {/* Fixed background map */}
      <MapCanvas />

      {/* Mobile gradient overlay */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-[40vh] z-[1] pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#0a0a0f]" />

      {/* Scrollable content */}
      <ScrollManager>
        <Hero metadata={journeyData.metadata} />

        {/* Chapter Sections */}
        {journeyData.chapters.map((chapter) => {
          const hasClips = chapter.audioClips.length > 0;
          const primaryClipId = chapter.audioClips[0];
          const clipFeatures = hasClips ? getChapterFeatures(primaryClipId) : null;
          const isMLExpanded = expandedML === chapter.id;

          return (
            <section
              key={chapter.id}
              className="min-h-screen relative z-10 pt-[20vh] md:pt-0"
              data-chapter={chapter.id}
            >
              {/* Desktop/Tablet layout */}
              <div className="container mx-auto min-h-screen px-4
                             flex flex-col md:grid md:grid-cols-1 lg:grid-cols-[1fr_500px]
                             gap-4 md:gap-8 items-start md:items-center py-8 md:py-0">
                {/* Left side: Map shows through (transparent) - desktop only */}
                <div className="hidden lg:block" />

                {/* Right side: Narrative + ML Viz */}
                <div className="glass rounded-2xl overflow-hidden w-full
                               min-h-[60vh] md:min-h-[70vh] lg:min-h-[80vh]
                               flex flex-col">
                  <NarrativePanel
                    headline={chapter.narrative.headline}
                    subtitle={chapter.narrative.subtitle}
                    body={chapter.narrative.body}
                    technicalNote={chapter.narrative.technicalNote}
                    color={chapter.color}
                  />

                  {/* ML Visualizer — only when chapter has clips */}
                  {hasClips && clipFeatures && (
                    <div className="border-t border-white/10">
                      {/* Mobile: Collapsible header */}
                      <button
                        className="md:hidden w-full p-4 flex items-center justify-between text-left"
                        onClick={() => setExpandedML(isMLExpanded ? null : chapter.id)}
                      >
                        <span className="text-xs uppercase tracking-widest text-white/50 font-mono">
                          ML Analysis
                        </span>
                        <span className="text-white/50 text-xl">
                          {isMLExpanded ? '−' : '+'}
                        </span>
                      </button>

                      {/* ML Content - always visible on tablet+, collapsible on mobile */}
                      <div
                        className={`p-4 sm:p-6 ${
                          isMLExpanded ? 'block' : 'hidden'
                        } md:block`}
                      >
                        <MLVisualizer
                          spectrogramUrl={`/spectrograms/${primaryClipId}.png`}
                          features={clipFeatures}
                          cluster={chapter.emotionCluster}
                          scrollStart={chapter.scrollStart}
                          scrollEnd={chapter.scrollEnd}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}

        {/* Findings from the CS156 paper */}
        <Reflections />

        {/* The structure, plotted — PCA scatter of all clips by cluster */}
        <ClusterMap points={clusterPoints} />

        {/* Conclusion Section */}
        <section className="min-h-screen flex items-center justify-center relative z-10 py-16 md:py-0">
          <div className="text-center max-w-3xl px-4 sm:px-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif mb-6 sm:mb-8">
              What I Learned
            </h2>
            <blockquote className="text-lg sm:text-xl lg:text-2xl font-serif italic text-white/90 border-l-4 border-purple-500 pl-4 sm:pl-6 text-left">
              &quot;The useful axes of variation in a voice may not be the ones
              humans have words for.&quot;
            </blockquote>

            {/* Metrics summary */}
            <div className="mt-12 sm:mt-16 grid grid-cols-3 gap-4 sm:gap-8 text-center">
              <div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-mono text-purple-400">
                  {journeyData.metadata.totalClips}
                </div>
                <div className="text-xs sm:text-sm text-white/50 mt-1">Audio Clips</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-mono text-cyan-400">
                  {journeyData.metadata.countries}
                </div>
                <div className="text-xs sm:text-sm text-white/50 mt-1">Countries</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-mono text-amber-400">
                  {journeyData.metadata.totalDuration}
                </div>
                <div className="text-xs sm:text-sm text-white/50 mt-1">Duration</div>
              </div>
            </div>
          </div>
        </section>

        {/* Receipts — TODO(rach): replace placeholder URLs */}
        <footer className="relative z-10 pb-24 sm:pb-20 pt-4 px-4 sm:px-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono text-white/40">
            <a
              href="#"
              className="hover:text-white/70 transition-colors underline-offset-4 hover:underline"
            >
              Read the paper →
            </a>
            <a
              href="#"
              className="hover:text-white/70 transition-colors underline-offset-4 hover:underline"
            >
              Source on GitHub →
            </a>
            <span className="text-white/30">© Rach Chew</span>
          </div>
        </footer>
      </ScrollManager>

      {/* Audio controls - fixed at bottom */}
      <AudioEngine clips={audioClips} chapters={journeyData.chapters} />
    </main>
    </MotionConfig>
  );
}
