'use client';

import { motion } from 'framer-motion';

interface NarrativePanelProps {
  headline: string;
  subtitle: string;
  body: string;
  technicalNote: string;
  color: string;
}

export function NarrativePanel({
  headline,
  subtitle,
  body,
  technicalNote,
  color,
}: NarrativePanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.6 }}
      className="flex-1 flex flex-col justify-center p-4 sm:p-6 md:p-8 lg:p-12"
    >
      {/* Headline */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-white mb-1 sm:mb-2"
        style={{ textShadow: `0 0 40px ${color}40` }}
      >
        {headline}
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm sm:text-base md:text-lg text-white/60 font-light mb-4 sm:mb-6 md:mb-8"
      >
        {subtitle}
      </motion.p>

      {/* Body */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-sm sm:text-base md:text-lg text-white/80 leading-relaxed font-serif mb-4 sm:mb-6 md:mb-8"
      >
        {body}
      </motion.p>

      {/* Technical Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="border-l-2 border-white/20 pl-3 sm:pl-4"
        style={{ borderColor: `${color}60` }}
      >
        <p className="text-xs sm:text-sm text-white/50 font-mono leading-relaxed">
          {technicalNote}
        </p>
      </motion.div>
    </motion.div>
  );
}
