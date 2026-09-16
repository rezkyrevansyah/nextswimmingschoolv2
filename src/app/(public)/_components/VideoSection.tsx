"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Icon from "@/components/ui/Icon";

function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const str = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = str.match(regExp);
  if (match && match[1]) return match[1];
  const embedMatch = str.match(/youtube\.com\/embed\/([^"&?\/\s]{11})/);
  if (embedMatch && embedMatch[1]) return embedMatch[1];
  return null;
}

/**
 * Click-to-play YouTube facade — shows a static thumbnail (`i.ytimg.com`,
 * no player JS) until clicked, so the section never pays for YouTube's
 * embed player on page load. Keyed by video id at the call site so
 * switching the active video resets back to a thumbnail.
 */
function YouTubeFacade({ videoId, title, sizes }: { videoId: string; title?: string | null; sizes: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        title={title || "Next Swimming School Video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full h-full border-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={title ? `Putar video: ${title}` : "Putar video"}
      className="group relative block w-full h-full cursor-pointer"
    >
      <Image
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        fill
        sizes={sizes}
        className="object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/35">
        <span className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/95 shadow-xl transition-transform group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 text-ocean-700 ml-0.5" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}

const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
    scale: 0.94,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring", stiffness: 280, damping: 28 },
      opacity: { duration: 0.35, ease: "easeOut" },
      scale: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
    scale: 0.94,
    transition: {
      x: { type: "spring", stiffness: 280, damping: 28 },
      opacity: { duration: 0.25, ease: "easeIn" },
      scale: { duration: 0.25 },
    },
  }),
};

export default function VideoSection({
  videoUrl,
  videoUrl2,
  videoUrl3,
  title,
  subtitle,
}: {
  videoUrl?: string | null;
  videoUrl2?: string | null;
  videoUrl3?: string | null;
  title?: string | null;
  subtitle?: string | null;
}) {
  const videos = [
    extractYouTubeId(videoUrl),
    extractYouTubeId(videoUrl2),
    extractYouTubeId(videoUrl3),
  ].filter(Boolean) as string[];

  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(0);

  if (videos.length === 0) return null;

  const header = (
    <div className="text-center max-w-2xl mx-auto mb-10">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ocean-100 text-ocean-700 text-xs font-extrabold uppercase tracking-widest mb-3">
        <Icon name="video" className="w-3.5 h-3.5" /> Video Profil
      </span>
      <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink tracking-tight">
        {title || "Lihat Aktivitas & Suasana Belajar Kami"}
      </h2>
      <p className="text-ink-soft text-sm sm:text-base mt-3 leading-relaxed">
        {subtitle || "Kenali lebih dekat metode pengajaran, fasilitas, dan keseruan belajar renang bersama pelatih profesional di Next Swimming School."}
      </p>
    </div>
  );

  // Single video — original layout
  if (videos.length === 1) {
    return (
      <section className="py-20 lg:py-24 bg-paper-tint relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] lg:w-[800px] h-[400px] bg-ocean-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          {header}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-950 aspect-video ring-1 ring-slate-900/10">
            <YouTubeFacade key={videos[0]} videoId={videos[0]} title={title} sizes="(min-width: 1024px) 800px, 100vw" />
          </div>
        </div>
      </section>
    );
  }

  // 2–3 videos — animated carousel with center focus
  const prev = () => {
    setDirection(-1);
    setActive((i) => (i - 1 + videos.length) % videos.length);
  };

  const next = () => {
    setDirection(1);
    setActive((i) => (i + 1) % videos.length);
  };

  const goTo = (index: number) => {
    setDirection(index > active ? 1 : -1);
    setActive(index);
  };

  const leftIdx = (active - 1 + videos.length) % videos.length;
  const rightIdx = (active + 1) % videos.length;

  return (
    <section className="py-20 lg:py-24 bg-paper-tint relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] lg:w-[900px] h-[500px] bg-ocean-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {header}

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Prev button */}
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            onClick={prev}
            aria-label="Video sebelumnya"
            className="shrink-0 w-10 h-10 rounded-full bg-white shadow-card flex items-center justify-center text-ink-soft hover:text-ocean-700 hover:shadow-lift transition-shadow cursor-pointer"
          >
            <Icon name="chevron-left" className="w-5 h-5" />
          </motion.button>

          {/* Cards row */}
          <div className="flex-1 flex items-center justify-center gap-3 sm:gap-4">
            {/* Left side card (hidden on mobile) — thumbnail only */}
            {videos.length === 3 && (
              <motion.button
                key={`left-${videos[leftIdx]}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 0.45, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                whileHover={{ opacity: 0.75, scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={prev}
                tabIndex={-1}
                aria-hidden="true"
                className="hidden sm:block shrink-0 w-[26%] aspect-video rounded-2xl overflow-hidden shadow-card relative ring-1 ring-slate-900/10 cursor-pointer"
              >
                <Image
                  src={`https://i.ytimg.com/vi/${videos[leftIdx]}/hqdefault.jpg`}
                  alt=""
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/10" />
              </motion.button>
            )}

            {/* Center (active) card with animated slide and scale */}
            <div className="flex-1 max-w-[640px] relative">
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                  key={videos[active]}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-950 aspect-video ring-2 ring-ocean-400/40"
                >
                  <YouTubeFacade key={videos[active]} videoId={videos[active]} title={title} sizes="640px" />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right side card (hidden on mobile) — thumbnail only */}
            {videos.length >= 2 && (
              <motion.button
                key={`right-${videos[rightIdx]}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 0.45, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                whileHover={{ opacity: 0.75, scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={next}
                tabIndex={-1}
                aria-hidden="true"
                className="hidden sm:block shrink-0 w-[26%] aspect-video rounded-2xl overflow-hidden shadow-card relative ring-1 ring-slate-900/10 cursor-pointer"
              >
                <Image
                  src={`https://i.ytimg.com/vi/${videos[rightIdx]}/hqdefault.jpg`}
                  alt=""
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/10" />
              </motion.button>
            )}
          </div>

          {/* Next button */}
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            onClick={next}
            aria-label="Video berikutnya"
            className="shrink-0 w-10 h-10 rounded-full bg-white shadow-card flex items-center justify-center text-ink-soft hover:text-ocean-700 hover:shadow-lift transition-shadow cursor-pointer"
          >
            <Icon name="chevron-right" className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Dot indicators with smooth spring width expansion */}
        <div className="flex justify-center items-center gap-2 mt-6">
          {videos.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Video ${i + 1}`}
              animate={{
                width: i === active ? 26 : 8,
              }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={`h-2 rounded-full cursor-pointer hover:opacity-80 transition-colors ${
                i === active ? "bg-ocean-600" : "bg-line hover:bg-ink-soft"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
