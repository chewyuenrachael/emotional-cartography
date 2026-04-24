'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useJourneyStore } from '@/stores/journeyStore';

// Register GSAP plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ScrollManagerProps {
  children: ReactNode;
}

export function ScrollManager({ children }: ScrollManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const setScrollProgress = useJourneyStore((state) => state.setScrollProgress);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create scroll trigger for entire journey
    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5, // Smooth scrolling with slight delay
      onUpdate: (self) => {
        setScrollProgress(self.progress);
      },
    });

    return () => {
      trigger.kill();
    };
  }, [setScrollProgress]);

  return (
    <div ref={containerRef} className="relative">
      {children}
    </div>
  );
}
