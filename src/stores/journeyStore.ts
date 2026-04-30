'use client';

import { create } from 'zustand';
import type { Chapter } from '@/types';

interface JourneyState {
  // Scroll state
  scrollProgress: number;
  setScrollProgress: (progress: number) => void;

  // Chapter data
  chapters: Chapter[];
  setChapters: (chapters: Chapter[]) => void;

  // Audio state
  isAudioEnabled: boolean;
  toggleAudio: () => void;
  currentClipId: string | null;
  setCurrentClip: (clipId: string | null) => void;

  // Computed - returns current chapter based on scroll progress
  getCurrentChapter: () => Chapter | null;
  getChapterProgress: () => number;
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  // Scroll state
  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),

  // Chapter data
  chapters: [],
  setChapters: (chapters) => set({ chapters }),

  // Audio state
  isAudioEnabled: false,
  toggleAudio: () => set((state) => ({ isAudioEnabled: !state.isAudioEnabled })),
  currentClipId: null,
  setCurrentClip: (clipId) => set({ currentClipId: clipId }),

  // Get current chapter based on scroll progress
  getCurrentChapter: () => {
    const { scrollProgress, chapters } = get();
    return (
      chapters.find(
        (ch) => scrollProgress >= ch.scrollStart && scrollProgress < ch.scrollEnd
      ) || null
    );
  },

  // Get progress within current chapter (0-1)
  getChapterProgress: () => {
    const { scrollProgress, chapters } = get();
    const currentChapter = chapters.find(
      (ch) => scrollProgress >= ch.scrollStart && scrollProgress < ch.scrollEnd
    );
    if (!currentChapter) return 0;

    const chapterDuration = currentChapter.scrollEnd - currentChapter.scrollStart;
    const progressWithinChapter = scrollProgress - currentChapter.scrollStart;
    return progressWithinChapter / chapterDuration;
  },
}));
