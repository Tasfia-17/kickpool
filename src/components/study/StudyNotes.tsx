'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PenTool, Eraser, Download, Trash2, Type, Palette, Plus, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  textContent: string;
  drawing?: string;
  createdAt: Date;
}

const MOTIVATIONAL_QUOTES = [
  { text: "You've got this!", emoji: "💪" },
  { text: "Every expert was once a beginner.", emoji: "🌟" },
  { text: "Small steps lead to big changes.", emoji: "🚀" },
  { text: "Believe in yourself!", emoji: "✨" },
  { text: "Progress, not perfection.", emoji: "📈" },
  { text: "You're doing amazing!", emoji: "🎉" },
  { text: "Keep going, you&apos;re almost there!", emoji: "🏃" },
  { text: "Learning is a superpower.", emoji: "🦸" },
  { text: "Focus on the journey.", emoji: "🛤️" },
  { text: "Your future self will thank you.", emoji: "🙏" },
  { text: "Dream big, work hard.", emoji: "💭" },
  { text: "One page at a time.", emoji: "📖" },
  { text: "Stay curious, stay humble.", emoji: "🔍" },
  { text: "You are capable of amazing things.", emoji: "⭐" },
  { text: "Make today count!", emoji: "📅" },
  { text: "Knowledge is power.", emoji: "🧠" },
  { text: "Embrace the challenge.", emoji: "🎯" },
  { text: "Success starts with a single step.", emoji: "👣" },
  { text: "The only limit is your imagination.", emoji: "🌈" },
  { text: "Hard work beats talent.", emoji: "💎" },
  { text: "Stay focused, stay determined.", emoji: "🔥" },
  { text: "Great things take time.", emoji: "⏳" },
  { text: "Never stop learning.", emoji: "📚" },
  { text: "You are stronger than you think.", emoji: "💪" },
];

const PEN_COLORS = [
  '#1a1a2e', // Dark ink
  '#2563eb', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#be185d', // Pink
];

export function StudyNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'text'>('pen');
  const [penColor, setPenColor] = useState('#1a1a2e');
  const [penSize, setPenSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFade, setQuoteFade] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentNote = notes[currentNoteIndex] || null;

  // Rotate motivational quotes every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteFade(false);
      setTimeout(() => {
        setQuoteIndex(prev => (prev + 1) % MOTIVATIONAL_QUOTES.length);
        setQuoteFade(true);
      }, 300);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load notes
  useEffect(() => {
    try {
      const saved = localStorage.getItem('study-notebook-v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        setNotes(parsed.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) })));
      } else {
        const newNote: Note = {
          id: Date.now().toString(),
          title: 'Page 1',
          textContent: '',
          createdAt: new Date(),
        };
        setNotes([newNote]);
      }
    } catch {
      const newNote: Note = {
        id: Date.now().toString(),
        title: 'Page 1',
        textContent: '',
        createdAt: new Date(),
      };
      setNotes([newNote]);
    }
  }, []);

  // Save notes
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem('study-notebook-v2', JSON.stringify(notes));
    }
  }, [notes]);

  const drawLinedPaper = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Cream paper background
    ctx.fillStyle = '#fffef9';
    ctx.fillRect(0, 0, width, height);

    // Subtle paper texture
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(255,254,249,1)');
    gradient.addColorStop(0.5, 'rgba(254,252,243,1)');
    gradient.addColorStop(1, 'rgba(250,248,238,1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Red margin line
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(40, height);
    ctx.stroke();

    // Lighter red secondary margin
    ctx.strokeStyle = '#fed7d7';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(38, 0);
    ctx.lineTo(38, height);
    ctx.stroke();

    // Blue horizontal lines
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 0.8;
    const lineSpacing = 26;
    const startY = 45;
    for (let y = startY; y < height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Hole punches on left margin
    ctx.fillStyle = '#f3f4f6';
    const holes = [40, height / 2, height - 40];
    holes.forEach(y => {
      ctx.beginPath();
      ctx.arc(14, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Inner shadow for depth
      ctx.beginPath();
      ctx.arc(14, y, 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#e5e7eb';
      ctx.stroke();
    });

    // Subtle shadow at top
    const topShadow = ctx.createLinearGradient(0, 0, 0, 10);
    topShadow.addColorStop(0, 'rgba(0,0,0,0.03)');
    topShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(0, 0, width, 10);
  }, []);

  // Initialize canvas with lined paper
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    drawLinedPaper(ctx, rect.width, rect.height);

    if (currentNote?.drawing) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = currentNote.drawing;
    }
  }, [currentNote?.drawing, drawLinedPaper]);

  useEffect(() => {
    const timeout = setTimeout(initCanvas, 50);
    return () => clearTimeout(timeout);
  }, [initCanvas, currentNoteIndex]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setTimeout(initCanvas, 50);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [initCanvas]);

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: `Page ${notes.length + 1}`,
      textContent: '',
      createdAt: new Date(),
    };
    setNotes(prev => [...prev, newNote]);
    setTimeout(() => setCurrentNoteIndex(notes.length), 10);
  };

  const updateCurrentNote = (updates: Partial<Note>) => {
    if (!currentNote) return;
    setNotes(prev => prev.map((n, i) =>
      i === currentNoteIndex ? { ...n, ...updates } : n
    ));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(2, 2);
    drawLinedPaper(ctx, rect.width, rect.height);
    updateCurrentNote({ drawing: undefined, textContent: '' });
  };

  const deletePage = () => {
    if (notes.length <= 1) {
      // Just clear if only one page
      clearCanvas();
      return;
    }
    setNotes(prev => prev.filter((_, i) => i !== currentNoteIndex));
    setCurrentNoteIndex(prev => Math.max(0, prev - 1));
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'text') return;
    setIsDrawing(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = penSize * 6;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || tool === 'text') return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveDrawing();
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const drawingData = canvas.toDataURL('image/png');
    updateCurrentNote({ drawing: drawingData });
  };

  const downloadNote = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    const rect = canvas.getBoundingClientRect();
    exportCanvas.width = rect.width * 2;
    exportCanvas.height = rect.height * 2;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);
    drawLinedPaper(ctx, rect.width, rect.height);

    // Draw text content with proper line spacing
    if (currentNote?.textContent) {
      ctx.font = '15px "Segoe UI", -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#1a1a2e';
      const lines = currentNote.textContent.split('\n');
      const lineSpacing = 26;
      const startY = 58;
      lines.forEach((line, i) => {
        ctx.fillText(line, 50, startY + i * lineSpacing);
      });
    }

    // Overlay the drawing
    const doDownload = () => {
      exportCanvas.toBlob(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `notebook-page-${currentNoteIndex + 1}-${new Date().toISOString().split('T')[0]}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    };

    if (currentNote?.drawing) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        doDownload();
      };
      img.src = currentNote.drawing;
    } else {
      doDownload();
    }
  };

  const quote = MOTIVATIONAL_QUOTES[quoteIndex];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-inner">
      {/* Professional Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">
        {/* Drawing Tools */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-slate-300">
          <button
            onClick={() => setTool('pen')}
            className={`p-1.5 rounded-md transition-all ${
              tool === 'pen'
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'hover:bg-slate-200 text-slate-600'
            }`}
            title="Pen"
          >
            <PenTool size={14} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded-md transition-all ${
              tool === 'eraser'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'hover:bg-slate-200 text-slate-600'
            }`}
            title="Eraser"
          >
            <Eraser size={14} />
          </button>
          <button
            onClick={() => {
              setTool('text');
              setTimeout(() => textAreaRef.current?.focus(), 100);
            }}
            className={`p-1.5 rounded-md transition-all ${
              tool === 'text'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'hover:bg-slate-200 text-slate-600'
            }`}
            title="Type"
          >
            <Type size={14} />
          </button>
        </div>

        {/* Color & Size */}
        <div className="flex items-center gap-1 px-2 border-r border-slate-300 relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1.5 rounded-md hover:bg-slate-200 transition-all"
            title="Color"
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: penColor }}
            />
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-xl border border-slate-200 flex flex-wrap gap-1 z-50 w-24">
              {PEN_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    setPenColor(color);
                    setShowColorPicker(false);
                  }}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    penColor === color ? 'border-slate-800 scale-110' : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          <input
            type="range"
            min="1"
            max="8"
            value={penSize}
            onChange={(e) => setPenSize(parseInt(e.target.value))}
            className="w-12 h-1 accent-indigo-500"
            title="Pen Size"
          />
          <span className="text-[10px] text-slate-500">{penSize}px</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 px-1">
          <button
            onClick={clearCanvas}
            className="p-1.5 rounded-md hover:bg-amber-100 text-amber-600 transition-all"
            title="Clear Page"
          >
            <Eraser size={14} />
          </button>
          <button
            onClick={deletePage}
            className="p-1.5 rounded-md hover:bg-rose-100 text-rose-500 transition-all"
            title="Delete Page"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={downloadNote}
            className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-600 transition-all"
            title="Download"
          >
            <Download size={14} />
          </button>
          <button
            onClick={createNewNote}
            className="p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600 transition-all"
            title="New Page"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-0.5 ml-auto text-slate-600">
          <button
            onClick={() => setCurrentNoteIndex(prev => Math.max(0, prev - 1))}
            disabled={currentNoteIndex === 0}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] min-w-[40px] text-center font-medium">
            {currentNoteIndex + 1}/{notes.length || 1}
          </span>
          <button
            onClick={() => setCurrentNoteIndex(prev => Math.min(notes.length - 1, prev + 1))}
            disabled={currentNoteIndex >= notes.length - 1}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Notebook Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ minHeight: '280px' }}
      >
        {/* Drawing Canvas - Bottom layer */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${
            tool === 'text' ? 'pointer-events-none' : 'cursor-crosshair z-20'
          }`}
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Text Layer - Top layer when in text mode */}
        {tool === 'text' && (
          <textarea
            ref={textAreaRef}
            value={currentNote?.textContent || ''}
            onChange={(e) => updateCurrentNote({ textContent: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            className="absolute inset-0 w-full h-full resize-none bg-transparent text-slate-800 focus:outline-none z-30"
            style={{
              padding: '32px 16px 16px 50px',
              lineHeight: '26px',
              fontSize: '15px',
              fontFamily: '"Segoe UI", -apple-system, system-ui, sans-serif',
              caretColor: penColor,
            }}
            placeholder="Start typing on the lines..."
            autoFocus
          />
        )}

        {/* Display text when not in text mode (read-only) */}
        {tool !== 'text' && currentNote?.textContent && (
          <div
            className="absolute inset-0 pointer-events-none z-10 text-slate-800 whitespace-pre-wrap overflow-hidden"
            style={{
              padding: '32px 16px 16px 50px',
              lineHeight: '26px',
              fontSize: '15px',
              fontFamily: '"Segoe UI", -apple-system, system-ui, sans-serif',
            }}
          >
            {currentNote.textContent}
          </div>
        )}

        {/* Mode indicator */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded text-[10px] text-slate-500 font-medium shadow-sm capitalize">
          {tool}
        </div>
      </div>

      {/* Motivational Quote Footer */}
      <div className="px-3 py-2 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 border-t border-pink-100/50">
        <div
          className={`flex items-center justify-center gap-2 transition-all duration-500 ${
            quoteFade ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
          }`}
        >
          <Sparkles size={12} className="text-pink-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-600">
            {quote.emoji} {quote.text}
          </span>
          <Sparkles size={12} className="text-purple-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
