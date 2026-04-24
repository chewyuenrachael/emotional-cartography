'use client';

import { AudioEnablePrompt } from '@/components/AudioEngine';
import type { JourneyData } from '@/types';

/**
 * Hero copy variants — extracted from page.tsx on branch
 * `content/hero-rewrite`. See /tmp/hero-drafts.md for full drafts,
 * word counts, and voice rationale.
 *
 * To pick a variant:
 *   1. Change ACTIVE_VARIANT below to 'forensic' | 'confessional' |
 *      'analytical'.
 *   2. If you pick a new variant, the `metadata` prop on <Hero /> is
 *      unused and can be removed from both this file and page.tsx.
 *   3. Commit.
 *
 * NOTE: the numeric hook "102 vlogs" is the raw corpus count Rach
 * cited in the prompt. `metadata.totalClips` (14) is the selected /
 * analysed subset shown in the conclusion metrics. Verify 102 against
 * the real raw count before shipping.
 */
type HeroVariant = 'current' | 'forensic' | 'confessional' | 'analytical';
const ACTIVE_VARIANT: HeroVariant = 'current';

interface HeroProps {
  metadata: JourneyData['metadata'];
}

export function Hero({ metadata }: HeroProps) {
  return (
    <section className="h-screen flex items-center justify-center relative z-10 pt-[15vh] md:pt-0">
      <div className="text-center max-w-2xl px-4 sm:px-8">
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif mb-4 sm:mb-6 animate-fade-in">
          Emotional Cartography
        </h1>

        {ACTIVE_VARIANT === 'current' && <CurrentCopy metadata={metadata} />}
        {ACTIVE_VARIANT === 'forensic' && <ForensicCopy />}
        {ACTIVE_VARIANT === 'confessional' && <ConfessionalCopy />}
        {ACTIVE_VARIANT === 'analytical' && <AnalyticalCopy />}

        <AudioEnablePrompt />
        <div className="animate-bounce text-white/40 mt-8 sm:mt-12 text-sm sm:text-base">
          ↓ Scroll to explore
        </div>
      </div>
    </section>
  );
}

const COPY_CLASSES =
  'text-base sm:text-lg lg:text-xl text-white/60 mb-6 sm:mb-8 animate-fade-in leading-relaxed';
const COPY_STYLE = { animationDelay: '0.2s' } as const;

function CurrentCopy({ metadata }: { metadata: JourneyData['metadata'] }) {
  return (
    <p className={COPY_CLASSES} style={COPY_STYLE}>
      I recorded vlogs across {metadata.countries} countries over{' '}
      {metadata.totalDuration}.
      <br className="hidden sm:block" />
      <span className="sm:hidden"> </span>
      Then I asked:{' '}
      <em className="text-white/80">can a machine understand how I felt?</em>
    </p>
  );
}

/**
 * Variant 1 — FORENSIC
 * Detached, investigator voice. Third-person framing of the speaker.
 * 31 words. Setup line: 6 words.
 */
function ForensicCopy() {
  return (
    <p className={COPY_CLASSES} style={COPY_STYLE}>
      102 vlogs. Seven cities. Three years of recordings, mostly on the way
      home from work.
      <br className="hidden sm:block" />
      <span className="sm:hidden"> </span>
      <em className="text-white/80">
        What does that voice carry that the speaker doesn&apos;t hear?
      </em>
      <br className="hidden sm:block" />
      <span className="sm:hidden"> </span>
      Scroll the map. The clips play.
    </p>
  );
}

/**
 * Variant 2 — CONFESSIONAL
 * First-person, slightly vulnerable. Owns the archive and the not-knowing.
 * 35 words. Setup line: 4 words.
 */
function ConfessionalCopy() {
  return (
    <p className={COPY_CLASSES} style={COPY_STYLE}>
      I have 102 vlogs of myself. Seven cities, three years of talking to a
      camera on the way home.
      <br className="hidden sm:block" />
      <span className="sm:hidden"> </span>
      <em className="text-white/80">
        What was I actually saying when I thought I was just narrating?
      </em>
      <br className="hidden sm:block" />
      <span className="sm:hidden"> </span>
      Scroll the map. Listen.
    </p>
  );
}

/**
 * Variant 3 — ANALYTICAL
 * Research-framed, hypothesis-shaped. Reads as the opening of a paper.
 * 35 words. Setup line: 9 words.
 */
function AnalyticalCopy() {
  return (
    <p className={COPY_CLASSES} style={COPY_STYLE}>
      A corpus of 102 vlogs. Seven cities. Three years of one voice, recorded
      by its owner.
      <br className="hidden sm:block" />
      <span className="sm:hidden"> </span>
      <em className="text-white/80">
        Can a voice alone tell you how the speaker felt?
      </em>
      <br className="hidden sm:block" />
      <span className="sm:hidden"> </span>
      Scroll the map. Each chapter plays its own clips.
    </p>
  );
}
