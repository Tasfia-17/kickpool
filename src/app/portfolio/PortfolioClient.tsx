"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import { ChevronDown, Sparkles, ArrowUp, X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Outfit } from "next/font/google";
import { P, PROJECTS, SKILLS, SOCIALS, CATEGORIES, NAV_ITEMS } from "./data";
import type { Project } from "./data";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"] });

// ─── Scroll-triggered Reveal ─────────────────────────────────────
function Anim({
  children,
  className = "",
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── Skill Bar ───────────────────────────────────────────────────
function SkillBar({ level }: { level: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  return (
    <div ref={ref} className="relative h-full overflow-hidden" style={{ background: "#18181b" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={inView ? { width: `${level}%` } : {}}
        transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
        style={{ background: P.accent }}
      />
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────
function Lightbox({
  projects,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  projects: Project[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const project = projects[index];
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [index]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: `${P.obsidian}ee` }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-6 right-6 z-10 w-12 h-12 flex items-center justify-center hover:scale-110 transition-transform"
        onClick={onClose}
      >
        <X size={28} color={P.accent} />
      </button>

      {/* Arrows */}
      {projects.length > 1 && (
        <>
          <button
            className="absolute left-6 top-1/2 -translate-y-1/2 z-10 w-14 h-14 flex items-center justify-center border hover:bg-white/5 transition-colors"
            style={{ borderColor: P.border, color: P.textSub }}
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
          >
            <ChevronLeft size={28} />
          </button>
          <button
            className="absolute right-6 top-1/2 -translate-y-1/2 z-10 w-14 h-14 flex items-center justify-center border hover:bg-white/5 transition-colors"
            style={{ borderColor: P.border, color: P.textSub }}
            onClick={(e) => { e.stopPropagation(); onNext(); }}
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      {/* Content */}
      <motion.div
        key={index}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-6xl w-[90vw] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media */}
        <div className="relative w-full flex items-center justify-center" style={{ maxHeight: "75vh" }}>
          {project.type === "video" && project.video ? (
            <video
              ref={videoRef}
              src={project.video}
              controls
              autoPlay
              className="max-h-[75vh] max-w-full object-contain"
              style={{ background: "#000", border: `1px solid ${P.border}` }}
            />
          ) : project.image ? (
            <div className="relative w-full" style={{ height: "70vh" }}>
              <Image
                src={project.image}
                alt={project.title}
                fill
                sizes="(max-width: 1200px) 90vw, 1200px"
                className="object-contain"
                priority
              />
            </div>
          ) : null}
        </div>

        {/* Info */}
        <div className="mt-8 text-center px-4">
          <h3
            className="text-2xl font-black uppercase tracking-[0.15em]"
            style={{ color: P.text }}
          >
            {project.title}
          </h3>
          <p className="text-sm mt-2 max-w-xl mx-auto leading-relaxed" style={{ color: P.textSub }}>
            {project.description}
          </p>
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-bold px-3 py-1 uppercase tracking-[0.2em] border"
                style={{ borderColor: P.border, color: P.textSub }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Portfolio (Client) ─────────────────────────────────────
export default function PortfolioClient() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    const h = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const filtered = useMemo(
    () => (activeFilter === "all" ? PROJECTS : PROJECTS.filter((p) => p.category === activeFilter)),
    [activeFilter],
  );

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevLightbox = useCallback(
    () => setLightboxIndex((prev) => (prev === null ? null : (prev - 1 + filtered.length) % filtered.length)),
    [filtered.length],
  );
  const nextLightbox = useCallback(
    () => setLightboxIndex((prev) => (prev === null ? null : (prev + 1) % filtered.length)),
    [filtered.length],
  );

  // Varying aspect ratios for the cinematic masonry feel
  const getAspect = (i: number, type: string) => {
    if (type === "video") return "aspect-video";
    if (i % 5 === 0) return "aspect-[3/4]";
    if (i % 3 === 0) return "aspect-square";
    return "aspect-[4/3]";
  };

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden ${outfit.className}`}
      style={{ background: P.obsidian, color: P.text }}
    >
      {/* ── Film Grain Texture ────────────────────────── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── 90/10 Asymmetric Layout ──────────────────── */}
      <div className="relative z-10 lg:flex min-h-screen">
        {/* ── 10% Vertical Sidebar (Desktop) ──────────── */}
        <aside
          className="hidden lg:flex flex-col w-[100px] fixed h-screen items-center py-12 justify-between shrink-0 z-50"
          style={{ background: P.obsidian, borderRight: `1px solid ${P.border}` }}
        >
          {/* Logo Mark */}
          <div className="font-black text-xl tracking-tighter">
            R<span style={{ color: P.accent }}>/</span>Q
          </div>

          {/* Vertical Nav */}
          <nav
            className="flex flex-col gap-8 font-bold uppercase tracking-[0.25em] text-[9px]"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="py-3 transition-colors duration-300 hover:text-[#ff4d00]"
                style={{ color: P.textMuted }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Socials */}
          <div className="flex flex-col gap-5">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-300 hover:text-[#ff4d00]"
                style={{ color: P.textMuted }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </aside>

        {/* ── Mobile Top Bar ──────────────────────────── */}
        <div
          className="lg:hidden flex items-center justify-between px-6 py-5 sticky top-0 z-50"
          style={{ background: P.obsidian, borderBottom: `1px solid ${P.border}` }}
        >
          <div className="font-black text-xl tracking-tighter">
            R<span style={{ color: P.accent }}>/</span>Q
          </div>
          <div className="flex gap-5">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-[#ff4d00]"
                style={{ color: P.textMuted }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* ── 90% Content ────────────────────────────── */}
        <main className="lg:ml-[100px] flex-1 w-full max-w-[1400px] px-6 md:px-16 lg:px-20 pb-32">
          {/* ══════ HERO ══════════════════════════════════ */}
          <motion.section
            id="hero"
            style={{ opacity: heroOpacity }}
            className="min-h-screen flex flex-col justify-center relative"
          >
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Big Name */}
              <h1 className="text-[13vw] sm:text-[10vw] lg:text-[8rem] leading-[0.85] font-black uppercase tracking-tighter">
                RESQUE
              </h1>

              {/* Info Block */}
              <div
                className="w-full max-w-lg mt-12 space-y-4 pl-8"
                style={{ borderLeft: `2px solid ${P.accent}` }}
              >
                <p
                  className="font-bold uppercase tracking-[0.3em] text-xs flex items-center gap-2"
                  style={{ color: P.accent }}
                >
                  <Sparkles size={12} />
                  Graphic &amp; Motion Designer
                </p>
                <p className="text-base leading-relaxed" style={{ color: P.textSub }}>
                  Crafting cinematic visual experiences through bold design &amp; motion.
                  Creator of CinePurr.
                </p>
              </div>
            </motion.div>

            {/* Scroll hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.25, y: [0, 12, 0] }}
              transition={{ delay: 1.5, duration: 2.5, repeat: Infinity }}
              className="absolute bottom-12 left-8"
            >
              <ChevronDown size={28} color={P.text} />
            </motion.div>

            {/* Decorative accent line */}
            <div
              className="absolute right-0 top-[20%] w-[1px] h-[60%] hidden lg:block"
              style={{ background: `linear-gradient(to bottom, transparent, ${P.accent}40, transparent)` }}
            />
          </motion.section>

          {/* ══════ WORK ══════════════════════════════════ */}
          <section id="work" className="pt-32">
            <Anim>
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.4em] mb-3"
                    style={{ color: P.textMuted }}
                  >
                    Portfolio
                  </p>
                  <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9]">
                    Selected
                    <br />
                    <span style={{ color: P.accent }}>Work</span>
                  </h2>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const active = activeFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveFilter(cat.id)}
                        className="uppercase text-[10px] font-bold tracking-[0.2em] px-5 py-2.5 border transition-all duration-300"
                        style={{
                          borderColor: active ? P.accent : P.border,
                          color: active ? P.obsidian : P.textSub,
                          background: active ? P.accent : "transparent",
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Anim>

            {/* Asymmetric Masonry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((project, i) => (
                  <motion.div
                    key={project.title}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.5, delay: Math.min(i * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
                    className="group cursor-pointer"
                    onClick={() => setLightboxIndex(i)}
                  >
                    <div
                      className={`relative overflow-hidden ${getAspect(i, project.type)}`}
                      style={{ border: `1px solid ${P.border}` }}
                    >
                      {project.type === "video" && project.video ? (
                        <>
                          <video
                            src={project.video}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div
                              className="w-16 h-16 flex items-center justify-center border opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                              style={{ borderColor: "rgba(255,255,255,0.3)" }}
                            >
                              <Play size={28} className="text-white ml-0.5" fill="white" />
                            </div>
                          </div>
                        </>
                      ) : project.image ? (
                        <Image
                          src={project.image}
                          alt={project.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-all duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                        />
                      ) : null}

                      {/* Hover Overlay */}
                      <div
                        className="absolute inset-0 p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: `linear-gradient(to top, ${P.obsidian}ee 0%, ${P.obsidian}60 40%, transparent 70%)`,
                        }}
                      >
                        <h3 className="text-lg font-black uppercase tracking-wider text-white">
                          {project.title}
                        </h3>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {project.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-bold uppercase tracking-[0.2em]"
                              style={{ color: P.accent }}
                            >
                              [{tag}]
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filtered.length === 0 && (
              <p className="text-center mt-20 font-mono text-sm" style={{ color: P.textMuted }}>
                [ NO PROJECTS IN THIS CATEGORY ]
              </p>
            )}
          </section>

          {/* ══════ SKILLS ════════════════════════════════ */}
          <section id="skills" className="pt-32">
            <Anim>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.4em] mb-3"
                style={{ color: P.textMuted }}
              >
                Expertise
              </p>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-16 leading-[0.9]">
                Technical
                <br />
                <span style={{ color: P.textSub }}>Arsenal</span>
              </h2>
            </Anim>

            <div className="grid lg:grid-cols-2 gap-x-16 gap-y-8">
              {SKILLS.map((skill, i) => (
                <Anim key={skill.name} delay={i * 0.06}>
                  <div
                    className="pb-6"
                    style={{ borderBottom: `1px solid ${P.border}` }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span style={{ color: P.accent }}>{skill.icon}</span>
                        <span className="text-sm font-bold uppercase tracking-[0.15em]">
                          {skill.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono" style={{ color: P.textMuted }}>
                        {skill.level}%
                      </span>
                    </div>
                    <div className="h-[3px] w-full" style={{ background: "#18181b" }}>
                      <SkillBar level={skill.level} />
                    </div>
                  </div>
                </Anim>
              ))}
            </div>
          </section>

          {/* ══════ CONTACT ══════════════════════════════ */}
          <section id="contact" className="pt-40 pb-20">
            <Anim>
              <div
                className="p-10 md:p-20"
                style={{ border: `1px solid ${P.border}` }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.4em] mb-4"
                  style={{ color: P.textMuted }}
                >
                  Contact
                </p>
                <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] max-w-3xl">
                  LET&apos;S
                  <br />
                  <span style={{ color: P.accent }}>COLLABORATE</span>
                </h2>

                <div className="mt-14 flex flex-col sm:flex-row gap-4">
                  <a
                    href="mailto:resquedzn05@gmail.com"
                    className="inline-flex items-center justify-center font-bold px-8 py-4 uppercase tracking-[0.2em] text-[11px] border transition-all duration-300 hover:bg-[#ff4d00] hover:text-black hover:border-[#ff4d00]"
                    style={{ borderColor: P.accent, color: P.accent }}
                  >
                    Send Email
                  </a>
                  <a
                    href="https://www.instagram.com/resquedzn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center font-bold px-8 py-4 uppercase tracking-[0.2em] text-[11px] border transition-all duration-300 hover:bg-white/5 hover:text-white"
                    style={{ borderColor: P.border, color: P.textSub }}
                  >
                    Instagram
                  </a>
                </div>
              </div>
            </Anim>

            {/* Footer */}
            <div className="mt-24 text-center">
              <span
                className="text-[10px] font-mono uppercase tracking-[0.3em]"
                style={{ color: P.textMuted }}
              >
                Powered by CinePurr
              </span>
            </div>
          </section>
        </main>
      </div>

      {/* ── Scroll to Top ────────────────────────────── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-8 right-8 z-50 w-12 h-12 flex items-center justify-center border transition-colors duration-300 hover:bg-white/5"
            style={{ borderColor: P.border, background: P.obsidian }}
          >
            <ArrowUp size={20} color={P.text} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Lightbox ──────────────────────────────────── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            projects={filtered}
            index={lightboxIndex}
            onClose={closeLightbox}
            onPrev={prevLightbox}
            onNext={nextLightbox}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
