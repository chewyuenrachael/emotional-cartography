'use client';

import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ScrollManager } from '@/components/ScrollManager';
import { MapCanvas } from '@/components/MapCanvas';
import { AudioEngine, AudioEnablePrompt } from '@/components/AudioEngine';
import { MLVisualizer } from '@/components/MLVisualizer';
import { NarrativePanel } from '@/components/NarrativePanel';
import Reflections from '@/components/Reflections';
import { useJourneyStore } from '@/stores/journeyStore';
import type { JourneyData, AudioClipFeatures } from '@/types';
import type { AudioClipInfo } from '@/components/AudioEngine';

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
  const { setChapters, getCurrentChapter } = useJourneyStore();
  const [journeyData, setJourneyData] = useState<JourneyData | null>(null);
  const [clipDataMap, setClipDataMap] = useState<Map<string, ClipData>>(new Map());
  const [audioClips, setAudioClips] = useState<AudioClipInfo[]>([]);
  const [expandedML, setExpandedML] = useState<string | null>(null);
  const currentChapter = getCurrentChapter();

  // Load journey data
  useEffect(() => {
    fetch('/data/journey.json')
      .then((res) => res.json())
      .then((data: JourneyData) => {
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
      .catch((err) => console.error('Failed to load journey data:', err));
  }, [setChapters]);

  // Get clip features for current chapter
  const getChapterFeatures = (clipId: string): AudioClipFeatures => {
    const clipData = clipDataMap.get(clipId);
    return clipData?.features || DEFAULT_FEATURES;
  };

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
        {/* Hero Section */}
        <section className="h-screen flex items-center justify-center relative z-10 pt-[15vh] md:pt-0">
          <div className="text-center max-w-2xl px-4 sm:px-8">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif mb-4 sm:mb-6 animate-fade-in">
              Emotional Cartography
            </h1>
            <p
              className="text-base sm:text-lg lg:text-xl text-white/60 mb-6 sm:mb-8 animate-fade-in leading-relaxed"
              style={{ animationDelay: '0.2s' }}
            >
              I recorded vlogs across {journeyData.metadata.countries} countries over{' '}
              {journeyData.metadata.totalDuration}.
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              Then I asked:{' '}
              <em className="text-white/80">can a machine understand how I felt?</em>
            </p>
            <AudioEnablePrompt />
            <div className="animate-bounce text-white/40 mt-8 sm:mt-12 text-sm sm:text-base">
              ↓ Scroll to explore
            </div>
          </div>
        </section>

        {/* Chapter Sections */}
        {journeyData.chapters.map((chapter) => {
          const primaryClipId = chapter.audioClips[0];
          const clipFeatures = getChapterFeatures(primaryClipId);
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

                  {/* ML Visualizer - collapsible on mobile */}
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
                </div>
              </div>
            </section>
          );
        })}

        {/* Findings from the CS156 paper */}
        <Reflections />

        {/* Conclusion Section */}
        <section className="min-h-screen flex items-center justify-center relative z-10 py-16 md:py-0">
          <div className="text-center max-w-3xl px-4 sm:px-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif mb-6 sm:mb-8">
              What I Learned
            </h2>
            <blockquote className="text-lg sm:text-xl lg:text-2xl font-serif italic text-white/90 border-l-4 border-purple-500 pl-4 sm:pl-6 text-left">
              &quot;The process of systematizing something as messy as emotion taught me
              that even the most human problems can benefit from structure—if you
              approach them with humility.&quot;
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

            {/* Mobile prompt */}
            <p className="mt-12 text-sm text-white/30 md:hidden">
              View on desktop for full map experience
            </p>
          </div>
        </section>

        {/* Footer spacer for audio bar */}
        <div className="h-24 sm:h-20" />
      </ScrollManager>

      {/* Audio controls - fixed at bottom */}
      <AudioEngine clips={audioClips} chapters={journeyData.chapters} />
    </main>
    </MotionConfig>
  );
}
