'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Howl, Howler } from 'howler';
import { useJourneyStore } from '@/stores/journeyStore';
import type { Chapter } from '@/types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ACTIVE_VOLUME = 0.7;
const CROSSFADE_MS = 600;
const MUTE_FADE_MS = 400;
const IO_THROTTLE_MS = 250;
const IO_MIN_RATIO = 0.4;
const SEEK_DEBOUNCE_MS = 100;
const SEEK_DRIFT_THRESHOLD_S = 0.5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AudioClipInfo {
  id: string;
  url: string;
  waveform: number[];
}

interface AudioEngineProps {
  clips?: AudioClipInfo[];
  chapters?: Chapter[];
}

// ---------------------------------------------------------------------------
// AudioEngine
// ---------------------------------------------------------------------------

export function AudioEngine({ clips = [], chapters = [] }: AudioEngineProps) {
  const isAudioEnabled = useJourneyStore((s) => s.isAudioEnabled);
  const currentClipId = useJourneyStore((s) => s.currentClipId);
  const setCurrentClip = useJourneyStore((s) => s.setCurrentClip);
  const scrollProgress = useJourneyStore((s) => s.scrollProgress);
  const getChapterProgress = useJourneyStore((s) => s.getChapterProgress);

  const soundsRef = useRef<Map<string, Howl>>(new Map());
  const fadeTimeoutsRef = useRef<Map<string, number>>(new Map());
  const [currentWaveform, setCurrentWaveform] = useState<number[]>([]);

  // Lazy Howl factory — construct only when a clip is about to play or
  // is the next-up prefetch target. Caches per clipId. Cleanup on unmount
  // / clips-prop change unloads everything.
  const getOrCreateSound = useCallback(
    (clipId: string): Howl | null => {
      const existing = soundsRef.current.get(clipId);
      if (existing) return existing;
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return null;
      const sound = new Howl({
        src: [clip.url],
        preload: true,
        html5: false,
        volume: 0,
        onloaderror: (_id, err) => {
          console.warn(`audio load failed: ${clipId}`, err);
        },
      });
      soundsRef.current.set(clipId, sound);
      return sound;
    },
    [clips],
  );

  // Cleanup on unmount / clips change.
  useEffect(() => {
    const sounds = soundsRef.current;
    const fades = fadeTimeoutsRef.current;
    return () => {
      fades.forEach((id) => window.clearTimeout(id));
      fades.clear();
      sounds.forEach((s) => s.unload());
      sounds.clear();
    };
  }, [clips]);

  // One-ahead prefetch: when the current clip changes, find which chapter
  // it belongs to and warm up the next chapter's first clip.
  useEffect(() => {
    if (!currentClipId || !chapters.length) return;
    const idx = chapters.findIndex((c) => c.audioClips.includes(currentClipId));
    if (idx < 0 || idx >= chapters.length - 1) return;
    const next = chapters[idx + 1];
    const nextClipId = next.audioClips[0];
    if (nextClipId) getOrCreateSound(nextClipId);
  }, [currentClipId, chapters, getOrCreateSound]);

  // -------- IntersectionObserver → setCurrentClip --------
  useEffect(() => {
    if (!chapters.length || typeof window === 'undefined') return;

    const visibility = new Map<string, number>();
    let throttleTimer: number | null = null;
    let lastRun = 0;

    const pickWinner = () => {
      let bestId: string | null = null;
      let bestRatio = 0;
      visibility.forEach((ratio, id) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      });

      if (bestId && bestRatio >= IO_MIN_RATIO) {
        const ch = chapters.find((c) => c.id === bestId);
        const nextClipId = ch?.audioClips[0] ?? null;
        if (nextClipId && nextClipId !== useJourneyStore.getState().currentClipId) {
          setCurrentClip(nextClipId);
        }
      }
    };

    const schedulePick = () => {
      const now = performance.now();
      const elapsed = now - lastRun;
      if (elapsed >= IO_THROTTLE_MS) {
        lastRun = now;
        pickWinner();
      } else if (throttleTimer == null) {
        throttleTimer = window.setTimeout(() => {
          lastRun = performance.now();
          throttleTimer = null;
          pickWinner();
        }, IO_THROTTLE_MS - elapsed);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.chapter;
          if (!id) continue;
          visibility.set(
            id,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }
        schedulePick();
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    );

    const nodes = document.querySelectorAll<HTMLElement>('[data-chapter]');
    nodes.forEach((n) => io.observe(n));

    return () => {
      if (throttleTimer != null) window.clearTimeout(throttleTimer);
      io.disconnect();
    };
  }, [chapters, setCurrentClip]);

  // -------- Crossfade on clip change / mute change --------
  useEffect(() => {
    const sounds = soundsRef.current;
    const fades = fadeTimeoutsRef.current;

    // Fade out any non-current clips that are playing
    sounds.forEach((sound, id) => {
      if (id !== currentClipId && sound.playing()) {
        const v = sound.volume();
        sound.fade(v, 0, CROSSFADE_MS);
        const prev = fades.get(id);
        if (prev) window.clearTimeout(prev);
        const t = window.setTimeout(() => {
          if (sound.playing()) sound.stop();
          fades.delete(id);
        }, CROSSFADE_MS + 50);
        fades.set(id, t);
      }
    });

    if (!currentClipId) {
      setCurrentWaveform([]);
      return;
    }

    const sound = getOrCreateSound(currentClipId);
    if (!sound) return;

    const clip = clips.find((c) => c.id === currentClipId);
    if (clip) setCurrentWaveform(clip.waveform);

    if (!isAudioEnabled) {
      // Muted — pause to preserve seek position; silent no-op if not playing yet
      if (sound.playing()) {
        const v = sound.volume();
        sound.fade(v, 0, MUTE_FADE_MS);
        const prev = fades.get(currentClipId);
        if (prev) window.clearTimeout(prev);
        const t = window.setTimeout(() => {
          sound.pause();
          fades.delete(currentClipId);
        }, MUTE_FADE_MS + 50);
        fades.set(currentClipId, t);
      }
      return;
    }

    // Audio enabled: start or resume with a fade-in
    const pendingFade = fades.get(currentClipId);
    if (pendingFade) {
      window.clearTimeout(pendingFade);
      fades.delete(currentClipId);
    }
    if (!sound.playing()) {
      sound.volume(0);
      sound.play();
    }
    sound.fade(sound.volume(), ACTIVE_VOLUME, CROSSFADE_MS);
  }, [currentClipId, isAudioEnabled, clips, getOrCreateSound]);

  // -------- Debounced seek tied to chapter progress --------
  useEffect(() => {
    if (!currentClipId || !isAudioEnabled) return;
    const sound = soundsRef.current.get(currentClipId);
    if (!sound) return;

    const handle = window.setTimeout(() => {
      if (!sound.playing()) return;
      const duration = sound.duration();
      if (!duration || !isFinite(duration)) return;

      const progress = Math.max(0, Math.min(1, getChapterProgress()));
      const target = progress * duration;
      const current = Number(sound.seek() ?? 0);
      if (Math.abs(target - current) > SEEK_DRIFT_THRESHOLD_S) {
        sound.seek(target);
      }
    }, SEEK_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [scrollProgress, currentClipId, isAudioEnabled, getChapterProgress]);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-14 sm:h-16 bg-black/60 backdrop-blur-md z-50 border-t border-white/10">
      <div className="flex items-center h-full px-4 sm:px-8">
        <div className="sm:hidden flex items-center gap-2 flex-1">
          <div
            className={`w-2 h-2 rounded-full ${
              isAudioEnabled ? 'bg-green-400 animate-pulse' : 'bg-white/30'
            }`}
          />
          <span className="text-xs text-white/50 font-mono">
            {isAudioEnabled ? 'Audio on' : 'Audio off'}
          </span>
        </div>

        <div className="hidden sm:flex flex-1 items-center justify-center">
          <WaveformVisualizer
            waveform={currentWaveform}
            isPlaying={!!currentClipId && isAudioEnabled}
          />
        </div>

        <AudioToggle />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero tap-to-enable gate
// ---------------------------------------------------------------------------

export function AudioEnablePrompt() {
  const isAudioEnabled = useJourneyStore((s) => s.isAudioEnabled);
  const toggleAudio = useJourneyStore((s) => s.toggleAudio);

  if (isAudioEnabled) return null;

  const handleEnable = () => {
    // Unlock the Web Audio context in the same user-gesture tick
    // (iOS Safari requires this; Howler.autoUnlock covers most cases
    // but we're explicit to be safe).
    try {
      const ctx = (Howler as unknown as { ctx?: AudioContext }).ctx;
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume();
      }
    } catch {
      // ignore; Howler.autoUnlock will still handle it
    }
    toggleAudio();
  };

  return (
    <button
      onClick={handleEnable}
      className="group inline-flex items-center gap-2 mt-6 sm:mt-8 px-4 py-2 rounded-full
                 bg-white/10 hover:bg-white/20 active:bg-white/30
                 border border-white/20 transition-colors
                 text-xs sm:text-sm text-white/80 font-mono animate-fade-in"
      style={{ animationDelay: '0.4s' }}
      aria-label="Enable audio for the journey"
    >
      <span className="relative flex w-2 h-2">
        <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
        <span className="relative rounded-full w-2 h-2 bg-green-400" />
      </span>
      Tap to hear the journey
    </button>
  );
}

// ---------------------------------------------------------------------------
// Internal UI
// ---------------------------------------------------------------------------

function WaveformVisualizer({
  waveform,
  isPlaying,
}: {
  waveform: number[];
  isPlaying: boolean;
}) {
  const displayWaveform =
    waveform.length > 0
      ? waveform
      : Array.from({ length: 50 }, () => Math.random() * 0.5 + 0.2);

  const maxBars = 50;
  const step = Math.ceil(displayWaveform.length / maxBars);
  const sampledWaveform = displayWaveform
    .filter((_, i) => i % step === 0)
    .slice(0, maxBars);

  return (
    <div className="flex items-center justify-center gap-[2px]">
      {sampledWaveform.map((value, i) => (
        <div
          key={i}
          className="w-0.5 sm:w-1 bg-white/60 rounded-full transition-all duration-150"
          style={{
            height: `${Math.max(value * 32, 4)}px`,
            opacity: isPlaying ? 0.8 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

function AudioToggle() {
  const isAudioEnabled = useJourneyStore((s) => s.isAudioEnabled);
  const toggleAudio = useJourneyStore((s) => s.toggleAudio);

  const handleClick = () => {
    try {
      const ctx = (Howler as unknown as { ctx?: AudioContext }).ctx;
      if (ctx && ctx.state === 'suspended') void ctx.resume();
    } catch {
      // ignore
    }
    toggleAudio();
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
      aria-label={isAudioEnabled ? 'Mute audio' : 'Enable audio'}
    >
      {isAudioEnabled ? (
        <SpeakerOnIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      ) : (
        <SpeakerOffIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" />
      )}
    </button>
  );
}

function SpeakerOnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function SpeakerOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
  );
}
