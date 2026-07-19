'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Delete, History } from 'lucide-react';

export function PixelCalculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastInput, setLastInput] = useState<string | null>(null);

  const handleNumber = useCallback((num: string) => {
    setLastInput(num);
    setDisplay(prev => {
      if (prev === '0' && num !== '.') return num;
      if (num === '.' && prev.includes('.')) return prev;
      if (prev.length >= 12) return prev; // Limit display length
      return prev + num;
    });
  }, []);

  const handleOperation = useCallback((op: string) => {
    setLastInput(op);
    if (previousValue === null) {
      setPreviousValue(parseFloat(display));
      setDisplay('0');
      setOperation(op);
    } else if (operation) {
      // Chain operations
      const current = parseFloat(display);
      let result = 0;
      switch (operation) {
        case '+': result = previousValue + current; break;
        case '-': result = previousValue - current; break;
        case '×': result = previousValue * current; break;
        case '÷': result = current !== 0 ? previousValue / current : 0; break;
      }
      setPreviousValue(result);
      setDisplay('0');
      setOperation(op);
    }
  }, [display, operation, previousValue]);

  const calculate = useCallback(() => {
    if (previousValue === null || operation === null) return;

    const current = parseFloat(display);
    let result = 0;
    const operationSymbol = operation;

    switch (operation) {
      case '+': result = previousValue + current; break;
      case '-': result = previousValue - current; break;
      case '×': result = previousValue * current; break;
      case '÷': result = current !== 0 ? previousValue / current : 0; break;
      default: return;
    }

    // Add to history
    const historyEntry = `${previousValue} ${operationSymbol} ${current} = ${result}`;
    setHistory(prev => [historyEntry, ...prev.slice(0, 9)]);

    // Format result (avoid floating point issues)
    const formattedResult = parseFloat(result.toFixed(10)).toString();
    setDisplay(formattedResult);
    setPreviousValue(null);
    setOperation(null);
    setLastInput('=');
  }, [display, operation, previousValue]);

  const handleEquals = useCallback(() => {
    calculate();
  }, [calculate]);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setLastInput('C');
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    setLastInput('⌫');
  }, []);

  const handlePercent = useCallback(() => {
    const value = parseFloat(display) / 100;
    setDisplay(value.toString());
    setLastInput('%');
  }, [display]);

  const handleNegate = useCallback(() => {
    setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
    setLastInput('±');
  }, [display]);

  // Determine button style based on type
  const getButtonClass = useCallback((type: 'number' | 'operation' | 'function' | 'equals' | 'clear') => {
    const base = 'flex items-center justify-center font-black text-lg border-2 border-black transition-all';
    switch (type) {
      case 'number':
        return `${base} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-black dark:text-white`;
      case 'operation':
        return `${base} bg-blue-500 hover:bg-blue-600 text-white`;
      case 'function':
        return `${base} bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-black dark:text-white`;
      case 'equals':
        return `${base} bg-green-500 hover:bg-green-600 text-white`;
      case 'clear':
        return `${base} bg-red-500 hover:bg-red-600 text-white`;
    }
  }, []);

  // Display formatting
  const formattedDisplay = useMemo(() => {
    const num = parseFloat(display);
    if (isNaN(num)) return display;
    if (display.includes('.') && display.endsWith('0')) return display; // Keep trailing zeros while typing
    return display;
  }, [display]);

  return (
    <div
      className="space-y-2"
      style={{ fontFamily: 'VT323, monospace' }}
    >
      {/* LCD Display */}
      <div className="relative">
        <motion.div
          className="p-3 text-right border-4 border-black relative overflow-hidden"
          style={{
            backgroundColor: '#9EA792',
            boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.4)',
            minHeight: '70px',
          }}
        >
          {/* Scanlines effect */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
            }}
          />

          {/* Operation indicator */}
          {operation && (
            <div className="absolute top-1 left-2 text-xs font-bold" style={{ color: '#1a3d1a' }}>
              {previousValue} {operation}
            </div>
          )}

          {/* Main display */}
          <motion.div
            key={display}
            initial={{ opacity: 0.5, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-black relative z-10 truncate"
            style={{
              color: '#1a3d1a',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {formattedDisplay}
          </motion.div>
        </motion.div>

        {/* History toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="absolute top-1 right-1 p-1 rounded hover:bg-black/10 transition-colors"
          aria-label="Toggle history"
        >
          <History size={14} style={{ color: '#1a3d1a' }} />
        </button>
      </div>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && history.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-2 border-black bg-gray-100 dark:bg-gray-800 p-2 max-h-24 overflow-y-auto text-xs space-y-1">
              {history.map((entry, i) => (
                <div key={i} className="text-gray-600 dark:text-gray-400 font-mono">
                  {entry}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* Row 1 */}
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={handleClear}
          className={`${getButtonClass('clear')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
          style={{ minHeight: '48px' }}
        >
          C
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={handleNegate}
          className={`${getButtonClass('function')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
          style={{ minHeight: '48px' }}
        >
          ±
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={handlePercent}
          className={`${getButtonClass('function')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
          style={{ minHeight: '48px' }}
        >
          %
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={() => handleOperation('÷')}
          className={`${getButtonClass('operation')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
          style={{ minHeight: '48px' }}
        >
          ÷
        </motion.button>

        {/* Row 2 */}
        {['7', '8', '9'].map(num => (
          <motion.button
            key={num}
            whileTap={{ scale: 0.95, y: 2 }}
            onClick={() => handleNumber(num)}
            className={`${getButtonClass('number')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
            style={{ minHeight: '48px' }}
          >
            {num}
          </motion.button>
        ))}
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={() => handleOperation('×')}
          className={`${getButtonClass('operation')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
          style={{ minHeight: '48px' }}
        >
          ×
        </motion.button>

        {/* Row 3 */}
        {['4', '5', '6'].map(num => (
          <motion.button
            key={num}
            whileTap={{ scale: 0.95, y: 2 }}
            onClick={() => handleNumber(num)}
            className={`${getButtonClass('number')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
            style={{ minHeight: '48px' }}
          >
            {num}
          </motion.button>
        ))}
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={() => handleOperation('-')}
          className={`${getButtonClass('operation')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
          style={{ minHeight: '48px' }}
        >
          −
        </motion.button>

        {/* Row 4 */}
        {['1', '2', '3'].map(num => (
          <motion.button
            key={num}
            whileTap={{ scale: 0.95, y: 2 }}
            onClick={() => handleNumber(num)}
            className={`${getButtonClass('number')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
            style={{ minHeight: '48px' }}
          >
            {num}
          </motion.button>
        ))}
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={() => handleOperation('+')}
          className={`${getButtonClass('operation')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
          style={{ minHeight: '48px' }}
        >
          +
        </motion.button>

        {/* Row 5 */}
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={() => handleNumber('0')}
          className={`${getButtonClass('number')} col-span-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
          style={{ minHeight: '48px' }}
        >
          0
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={() => handleNumber('.')}
          className={`${getButtonClass('number')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
          style={{ minHeight: '48px' }}
        >
          .
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={handleEquals}
          className={`${getButtonClass('equals')} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]`}
          style={{ minHeight: '48px' }}
        >
          =
        </motion.button>
      </div>

      {/* Backspace */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleBackspace}
        className="w-full py-2 border-2 border-black bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-bold flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] text-black dark:text-white"
      >
        <Delete size={14} /> Backspace
      </motion.button>
    </div>
  );
}

