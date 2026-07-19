import React from "react";
import {
  Mail, Instagram, Briefcase, Wrench, MessageCircle, Home,
  Palette, Film, Layers, Monitor, PenTool, Box,
} from "lucide-react";

// ─── Cinematic Canvas Palette ─────────────────────────────────────
export const P = {
  obsidian: "#050505",
  dark: "#0a0a0a",
  surface: "#121212",
  accent: "#ff4d00",
  accentMuted: "rgba(255, 77, 0, 0.15)",
  text: "#ffffff",
  textSub: "#a1a1aa",
  textMuted: "#52525b",
  border: "#27272a",
};

// ─── Types ────────────────────────────────────────────────────────
export type ProjectType = "image" | "video";
export type CategoryType = "graphic" | "motion" | "branding";

export interface Project {
  title: string;
  description: string;
  image: string;
  video?: string;
  type: ProjectType;
  tags: string[];
  category: CategoryType;
}

export interface Skill {
  name: string;
  icon: React.ReactNode;
  level: number;
}

// ─── Project Data ─────────────────────────────────────────────────
export const PROJECTS: Project[] = [
  {
    title: "Resque Cyber",
    description: "Immersive cyber-themed 3D landscape featuring the Resque brand identity.",
    image: "/portfolio/resque-cyber.jpg",
    type: "image",
    tags: ["3D Modeling", "Branding", "Cyber"],
    category: "branding",
  },
  {
    title: "Ace",
    description: "Dynamic character artwork with striking composition and vivid detail.",
    image: "/portfolio/ace.jpg",
    type: "image",
    tags: ["Character Design", "Illustration"],
    category: "graphic",
  },
  {
    title: "Resque",
    description: "Watercolour-inspired self-branding piece with soft gradients and expressive strokes.",
    image: "/portfolio/resque.png",
    type: "image",
    tags: ["Branding", "Watercolour"],
    category: "branding",
  },
  {
    title: "Nizura",
    description: "Character illustration blending ethereal lighting with detailed linework.",
    image: "/portfolio/nizura.jpg",
    type: "image",
    tags: ["Illustration", "Character Design"],
    category: "graphic",
  },
  {
    title: "ASH",
    description: "Anime-style portrait fusing bold colours with cinematic composition.",
    image: "/portfolio/ash.png",
    type: "image",
    tags: ["Anime", "Portrait"],
    category: "graphic",
  },
  {
    title: "Arcane — Caitlyn",
    description: "Fan art inspired by the Arcane series, capturing Caitlyn's intensity with painterly detail.",
    image: "/portfolio/caitlyn.jpg",
    type: "image",
    tags: ["Fan Art", "Digital Painting"],
    category: "graphic",
  },
  {
    title: "Cely",
    description: "Stylised character design exploring contrast, texture, and personality.",
    image: "/portfolio/cely.jpg",
    type: "image",
    tags: ["Character Design", "Stylised"],
    category: "graphic",
  },
  {
    title: "Sylveon",
    description: "Pokémon-inspired artwork with a dreamy pastel palette and soft rendering.",
    image: "/portfolio/sylveon.jpg",
    type: "image",
    tags: ["Pokémon", "Fan Art"],
    category: "graphic",
  },
  {
    title: "Puss in Boots",
    description: "Cinematic character artwork with rich textures and dramatic lighting.",
    image: "/portfolio/puss.jpg",
    type: "image",
    tags: ["Fan Art", "Character"],
    category: "graphic",
  },
  {
    title: "Puss in Boots — Banner",
    description: "Conceptual banner design combining cinematic characters with automotive branding.",
    image: "/portfolio/pibbanner.jpg",
    type: "image",
    tags: ["Branding", "Banner"],
    category: "branding",
  },
  {
    title: "Lana Del Rey",
    description: "Editorial portrait design with moody tones and typographic flair.",
    image: "/portfolio/dlrey.jpg",
    type: "image",
    tags: ["Portrait", "Editorial"],
    category: "graphic",
  },
  {
    title: "Resque Red",
    description: "Bold red-toned variant of the Resque identity, high contrast and striking.",
    image: "/portfolio/resqred.png",
    type: "image",
    tags: ["Branding", "Identity"],
    category: "branding",
  },
  {
    title: "Resque Banner",
    description: "Wide-format banner design for the Resque brand identity.",
    image: "/portfolio/resque_banner.jpg",
    type: "image",
    tags: ["Branding", "Banner"],
    category: "branding",
  },
  {
    title: "Resque Wallpaper",
    description: "Desktop wallpaper showcasing the Resque brand aesthetic.",
    image: "/portfolio/Resque_wallpaper.jpg",
    type: "image",
    tags: ["Branding", "Wallpaper"],
    category: "branding",
  },
  {
    title: "Cool",
    description: "Stylised graphic piece with a fresh, modern aesthetic.",
    image: "/portfolio/cool.png",
    type: "image",
    tags: ["Graphic", "Design"],
    category: "graphic",
  },
  {
    title: "GDash",
    description: "Geometry Dash-inspired artwork with vibrant colours and dynamic composition.",
    image: "/portfolio/gdash.jpg",
    type: "image",
    tags: ["Fan Art", "Gaming"],
    category: "graphic",
  },
  {
    title: "Ustatlar",
    description: "Illustration piece with bold composition and expressive detail.",
    image: "/portfolio/ustatlar.png",
    type: "image",
    tags: ["Illustration", "Design"],
    category: "graphic",
  },
  {
    title: "Ultroll",
    description: "Motion graphics edit with dynamic transitions and visual effects.",
    image: "",
    video: "/portfolio/Ultroll_final.mp4",
    type: "video",
    tags: ["After Effects", "Motion"],
    category: "motion",
  },
  {
    title: "Pokémon",
    description: "Pokémon-themed motion edit with vibrant effects and smooth transitions.",
    image: "",
    video: "/portfolio/pokemon.mp4",
    type: "video",
    tags: ["After Effects", "Pokémon"],
    category: "motion",
  },
];

// ─── Skills ───────────────────────────────────────────────────────
export const SKILLS: Skill[] = [
  { name: "After Effects", icon: React.createElement(Film, { size: 20 }), level: 90 },
  { name: "Photoshop", icon: React.createElement(Palette, { size: 20 }), level: 70 },
  { name: "Illustrator", icon: React.createElement(PenTool, { size: 20 }), level: 60 },
  { name: "Blender", icon: React.createElement(Box, { size: 20 }), level: 50 },
  { name: "Cinema 4D", icon: React.createElement(Monitor, { size: 20 }), level: 50 },
  { name: "Figma", icon: React.createElement(Layers, { size: 20 }), level: 40 },
];

// ─── Social Links ─────────────────────────────────────────────────
export const SOCIALS = [
  { name: "Instagram", icon: React.createElement(Instagram, { size: 20 }), url: "https://www.instagram.com/resquedzn/" },
  { name: "Email", icon: React.createElement(Mail, { size: 20 }), url: "https://mail.google.com/mail/?view=cm&to=resquedzn05@gmail.com" },
];

// ─── Categories ───────────────────────────────────────────────────
export const CATEGORIES = [
  { id: "all", label: "All Work" },
  { id: "graphic", label: "Graphic" },
  { id: "motion", label: "Motion" },
  { id: "branding", label: "Branding" },
];

// ─── Nav Items ────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { id: "hero", icon: React.createElement(Home, { size: 16 }), label: "Home" },
  { id: "work", icon: React.createElement(Briefcase, { size: 16 }), label: "Work" },
  { id: "skills", icon: React.createElement(Wrench, { size: 16 }), label: "Skills" },
  { id: "contact", icon: React.createElement(MessageCircle, { size: 16 }), label: "Contact" },
];
