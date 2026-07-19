/**
 * Color manipulation utilities
 * Extracted to reduce code duplication across components
 */

/**
 * Convert hex color to hue (0-360)
 */
export function hexToHue(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;

  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return Math.round(h * 360);
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(h: number, s: number = 0.8, l: number = 0.5): string {
  const hue = h / 360;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, hue + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, hue) * 255);
  const b = Math.round(hue2rgb(p, q, hue - 1/3) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Parse a gradient string like "#ff0000,#00ff00" into colors array
 */
export function parseGradient(gradient: string): [string, string] {
  const parts = gradient.split(',').map(c => c.trim());
  return [parts[0] || '#ff69b4', parts[1] || '#00bfff'];
}

/**
 * Create a CSS gradient from two colors
 */
export function createGradient(color1: string, color2: string): string {
  return `${color1},${color2}`;
}

/**
 * Quick color presets
 */
export const COLOR_PRESETS = {
  solid: ['#ff69b4', '#ff0000', '#ff8c00', '#ffd700', '#00ff00', '#00bfff', '#8a2be2', '#ff1493'],
  gradients: [
    { colors: '#ff69b4,#00bfff', label: 'Pink-Blue' },
    { colors: '#ff0000,#ffd700', label: 'Fire' },
    { colors: '#00ff00,#00bfff', label: 'Mint' },
    { colors: '#8a2be2,#ff1493', label: 'Purple-Pink' },
    { colors: '#ffd700,#ff8c00', label: 'Gold' },
    { colors: '#ff6b6b,#ffecd2', label: 'Sunset' },
  ],
  cardBackgrounds: [
    { value: '#60496e,#71C4FF', label: 'Default' },
    { value: '#1a1a2e,#4a4a6e', label: 'Dark' },
    { value: '#2d1b69,#8a2be2', label: 'Purple' },
    { value: '#ff69b4,#ff1493', label: 'Pink' },
    { value: '#00bfff,#0077ff', label: 'Ocean' },
    { value: '#ff6b6b,#ffd93d', label: 'Sunset' },
    { value: '#00d4aa,#00ffcc', label: 'Mint' },
    { value: '#ffd700,#ff8c00', label: 'Gold' },
  ],
} as const;

/**
 * VIP Badge presets
 */
export const BADGE_PRESETS = [
  { icon: '♛', label: 'Crown' },
  { icon: '★', label: 'Star' },
  { icon: '◆', label: 'Diamond' },
  { icon: '♥', label: 'Heart' },
  { icon: '✦', label: 'Sparkle' },
  { icon: '⚡', label: 'Bolt' },
  { icon: '☾', label: 'Moon' },
  { icon: '✿', label: 'Flower' },
  { icon: '♪', label: 'Music' },
  { icon: '⬥', label: 'Gem' },
  { icon: '✶', label: 'Star2' },
  { icon: '❖', label: 'Cross' },
] as const;

/**
 * VIP font options
 */
export const FONT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'mono', label: 'Monospace (Coder)' },
  { value: 'serif', label: 'Serif (Elegant)' },
  { value: 'cursive', label: 'Cursive (Fancy)' },
  { value: 'fantasy', label: 'Fantasy (Mystical)' },
  { value: 'comic', label: 'Comic Sans (Fun)' },
] as const;

/**
 * Get CSS font-family from font key
 */
export function getFontFamily(fontKey: string): string {
  switch (fontKey) {
    case 'mono': return 'monospace';
    case 'serif': return 'serif';
    case 'cursive': return 'cursive';
    case 'fantasy': return 'fantasy';
    case 'comic': return '"Comic Sans MS", cursive';
    default: return 'inherit';
  }
}
