'use client';

import { useState } from 'react';
import { ROOM_TEMPLATES, RoomTemplate } from '@/lib/roomTemplates';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface RoomTemplatesProps {
  onSelect: (template: RoomTemplate) => void;
}

export function RoomTemplates({ onSelect }: RoomTemplatesProps) {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<RoomTemplate | null>(null);

  return (
    <div 
      className={`border-4 ${isDarkMode ? 'border-white' : 'border-black'} p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]`}
      style={{ backgroundColor: isDarkMode ? currentTheme.colors.darkBackground : 'white' }}
    >
      <div className="flex items-center gap-2 mb-3 border-b-2 border-black dark:border-white pb-2">
        <span className="font-black text-sm uppercase tracking-tighter">ROOM TEMPLATES</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ROOM_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              setSelectedTemplate(template);
              onSelect(template);
            }}
            className={`p-3 border-2 text-left transition-all hover:scale-105 ${
              selectedTemplate?.id === template.id
                ? 'border-black dark:border-white border-4'
                : isDarkMode
                  ? 'border-white/30 hover:border-white'
                  : 'border-black/30 hover:border-black'
            }`}
            style={{
              backgroundColor: selectedTemplate?.id === template.id
                ? currentTheme.colors.primary
                : (isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'),
              color: selectedTemplate?.id === template.id ? '#fff' : undefined,
            }}
          >
            <div className="text-2xl mb-1">{template.icon}</div>
            <div className="font-bold text-xs mb-1">{template.name}</div>
            <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
              {template.maxUsers} users • {template.isPublic ? 'Public' : 'Private'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}



