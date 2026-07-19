'use client';

import React from 'react';
import { hexToHue, hslToHex } from '@/lib/colorUtils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  saturation?: number;
  lightness?: number;
  className?: string;
  showClear?: boolean;
  clearLabel?: string;
  onClear?: () => void;
}

/**
 * Reusable color picker with hue slider
 * Reduces code duplication across VIP customization sections
 */
export function ColorPicker({
  value,
  onChange,
  label,
  saturation = 0.8,
  lightness = 0.5,
  className = '',
  showClear = false,
  clearLabel = 'Clear',
  onClear
}: ColorPickerProps) {
  const hue = hexToHue(value);

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
  };

  return (
    <div className={`flex gap-3 items-center ${className}`}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-14 h-14 cursor-pointer border-2 border-black rounded-lg"
      />
      <div className="flex-1">
        {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
        <input
          type="range"
          min="0"
          max="360"
          value={hue}
          onChange={(e) => onChange(hslToHex(parseInt(e.target.value), saturation, lightness))}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer"
          style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
        />
      </div>
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-2 text-xs font-bold bg-gray-200 hover:bg-gray-300 rounded border-2 border-gray-400"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}

interface GradientPickerProps {
  value: string;
  onChange: (gradient: string) => void;
  startLabel?: string;
  endLabel?: string;
  className?: string;
}

/**
 * Dual color picker for gradients
 */
export function GradientPicker({
  value,
  onChange,
  startLabel = 'Start Color',
  endLabel = 'End Color',
  className = ''
}: GradientPickerProps) {
  const colors = value.split(',').map(c => c.trim());
  const color1 = colors[0] || '#ff69b4';
  const color2 = colors[1] || '#00bfff';

  return (
    <div className={`space-y-3 ${className}`}>
      <ColorPicker
        value={color1}
        onChange={(c) => onChange(`${c},${color2}`)}
        label={startLabel}
      />
      <ColorPicker
        value={color2}
        onChange={(c) => onChange(`${color1},${c}`)}
        label={endLabel}
      />
    </div>
  );
}

interface QuickColorsProps {
  colors: readonly string[];
  selected: string;
  onSelect: (color: string) => void;
  className?: string;
}

/**
 * Quick color selection grid
 */
export function QuickColors({ colors, selected, onSelect, className = '' }: QuickColorsProps) {
  return (
    <div className={`grid grid-cols-8 gap-1 ${className}`}>
      {colors.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onSelect(color)}
          className={`h-8 rounded-lg border-2 transition-all ${
            selected === color
              ? 'border-black scale-110 ring-2 ring-yellow-400'
              : 'border-gray-300 hover:scale-105'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

interface GradientPresetsProps {
  presets: readonly { value?: string; colors?: string; label: string }[];
  selected: string;
  onSelect: (gradient: string) => void;
  columns?: number;
  className?: string;
}

/**
 * Gradient preset buttons
 * Supports both `colors` and `value` field names for flexibility
 */
export function GradientPresets({
  presets,
  selected,
  onSelect,
  columns = 3,
  className = ''
}: GradientPresetsProps) {
  return (
    <div className={`grid gap-2 ${className}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {presets.map(grad => {
        const gradientValue = grad.value || grad.colors || '';
        const [c1, c2] = gradientValue.split(',');
        return (
          <button
            key={gradientValue}
            type="button"
            onClick={() => onSelect(gradientValue)}
            className={`h-9 rounded-lg border-2 text-xs font-bold transition-all ${
              selected === gradientValue
                ? 'border-black ring-2 ring-yellow-400'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            style={{
              background: `linear-gradient(90deg, ${c1}, ${c2})`,
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {grad.label}
          </button>
        );
      })}
    </div>
  );
}
