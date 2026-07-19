'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';
import { GameBoyContainer } from './GameBoyContainer';
import { Keyboard } from 'lucide-react';

const WORD_LISTS = {
  easy: [
    'cat', 'dog', 'run', 'fun', 'sun', 'cup', 'map', 'hat', 'red', 'box',
    'pen', 'car', 'bed', 'top', 'bag', 'yes', 'hop', 'log', 'wet', 'fix'
  ],
  medium: [
    'apple', 'beach', 'cloud', 'dream', 'earth', 'flame', 'grape', 'happy',
    'image', 'juice', 'knife', 'lemon', 'music', 'night', 'ocean', 'piano',
    'queen', 'river', 'storm', 'tiger', 'urban', 'voice', 'water', 'youth'
  ],
  hard: [
    'adventure', 'butterfly', 'celebrate', 'dangerous', 'excellent',
    'fantastic', 'graceful', 'happiness', 'important', 'knowledge',
    'landscape', 'mysterious', 'nightmare', 'operation', 'paragraph',
    'question', 'restaurant', 'something', 'technical', 'understand'
  ],
  code: [
    'function', 'variable', 'const', 'return', 'import', 'export',
    'interface', 'component', 'useState', 'useEffect', 'async',
    'promise', 'callback', 'render', 'props', 'state', 'reducer'
  ]
};

type Difficulty = keyof typeof WORD_LISTS;

interface WordState {
  word: string;
  typed: string;
  startTime: number;
}

export function TypingSpeedGame() {
  const { data: session } = useSession();

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameState, setGameState] = useState<'menu' | 'countdown' | 'playing' | 'gameover'>('menu');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentWord, setCurrentWord] = useState<WordState | null>(null);
  const [typedText, setTypedText] = useState('');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [errors, setErrors] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const usedWordsRef = useRef<Set<string>>(new Set());

  // Fetch high score
  useEffect(() => {
    if (session) {
      const controller = new AbortController();
      fetch('/api/minigames/score?gameType=typing-speed', { signal: controller.signal })
        .then(res => res.json())
        .then(data => setHighScore(data.highScore || 0))
        .catch((error) => {
          if (error.name !== 'AbortError') console.error('Failed to fetch high score:', error);
        });
      return () => controller.abort();
    }
  }, [session]);

  const getRandomWord = useCallback(() => {
    const words = WORD_LISTS[difficulty];
    let word;
    let attempts = 0;

    do {
      word = words[Math.floor(Math.random() * words.length)];
      attempts++;
    } while (usedWordsRef.current.has(word) && attempts < 20);

    if (attempts >= 20) {
      usedWordsRef.current.clear();
    }

    usedWordsRef.current.add(word);
    return word;
  }, [difficulty]);

  const nextWord = useCallback(() => {
    const word = getRandomWord();
    setCurrentWord({
      word,
      typed: '',
      startTime: Date.now(),
    });
    setTypedText('');
  }, [getRandomWord]);

  const startGame = () => {
    setScore(0);
    setWordsCompleted(0);
    setTotalChars(0);
    setErrors(0);
    setStreak(0);
    setBestStreak(0);
    setWpm(0);
    setAccuracy(100);
    setTimeLeft(60);
    usedWordsRef.current.clear();
    setCountdown(3);
    setGameState('countdown');
  };

  // Countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;

    if (countdown <= 0) {
      setGameState('playing');
      nextWord();
      inputRef.current?.focus();
      return;
    }

    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [gameState, countdown, nextWord]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Calculate WPM and accuracy
  useEffect(() => {
    if (gameState !== 'playing') return;

    const elapsedMinutes = (60 - timeLeft) / 60;
    if (elapsedMinutes > 0) {
      setWpm(Math.round(totalChars / 5 / elapsedMinutes));
    }

    const totalAttempts = totalChars + errors;
    if (totalAttempts > 0) {
      setAccuracy(Math.round((totalChars / totalAttempts) * 100));
    }
  }, [gameState, timeLeft, totalChars, errors]);

  // Handle typing
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== 'playing' || !currentWord) return;

    const typed = e.target.value;
    setTypedText(typed);

    // Check if word is complete
    if (typed === currentWord.word) {
      const timeSpent = (Date.now() - currentWord.startTime) / 1000;
      const wordLength = currentWord.word.length;

      // Score based on word length and speed
      const baseScore = wordLength * 10;
      const speedBonus = Math.max(0, Math.floor((3 - timeSpent) * 10));
      const streakBonus = streak >= 5 ? 20 : streak >= 3 ? 10 : 0;
      const points = baseScore + speedBonus + streakBonus;

      setScore(s => s + points);
      setWordsCompleted(w => w + 1);
      setTotalChars(c => c + wordLength);
      setStreak(s => {
        const newStreak = s + 1;
        setBestStreak(b => Math.max(b, newStreak));
        return newStreak;
      });

      nextWord();
    }
  };

  // Handle keydown for error tracking
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameState !== 'playing' || !currentWord) return;

    // Check for error (wrong character)
    if (e.key.length === 1) {
      const expectedChar = currentWord.word[typedText.length];
      if (e.key !== expectedChar) {
        setErrors(err => err + 1);
        setStreak(0);
      }
    }
  };

  // Save score
  useEffect(() => {
    if (gameState === 'gameover' && session && score > highScore) {
      const controller = new AbortController();
      fetch('/api/minigames/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType: 'typing-speed', score }),
        signal: controller.signal
      })
      .then(() => setHighScore(score))
      .catch((error) => {
        if (error.name !== 'AbortError') console.error('Failed to save high score:', error);
      });
      return () => controller.abort();
    }
  }, [gameState, score, highScore, session]);

  // Render word with highlighting
  const renderWord = () => {
    if (!currentWord) return null;

    return currentWord.word.split('').map((char, i) => {
      let className = 'text-gray-500';
      if (i < typedText.length) {
        className = typedText[i] === char ? 'text-green-400' : 'text-red-500 line-through';
      } else if (i === typedText.length) {
        className = 'text-white bg-blue-600 px-0.5';
      }
      return (
        <span key={i} className={className}>
          {char}
        </span>
      );
    });
  };

  return (
    <GameBoyContainer isPlaying={gameState === 'playing'} gameOver={gameState === 'gameover'}>
      <div className="w-full h-full flex flex-col bg-gradient-to-b from-slate-900 to-slate-950">

        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-black/50 border-b border-slate-700">
          <div className="flex items-center gap-3 text-xs">
            <span className={`font-mono ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
              ⏱️ {timeLeft}s
            </span>
            <span className="text-yellow-400 font-mono">
              {score} pts
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-cyan-400">{wpm} WPM</span>
            <span className="text-green-400">{accuracy}%</span>
          </div>
        </div>

        {/* Game area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">

          {/* Streak indicator */}
          {gameState === 'playing' && streak >= 3 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-12 text-orange-400 text-xs font-bold"
            >
              🔥 {streak} streak!
            </motion.div>
          )}

          {/* Current word */}
          <div className="mb-6 text-center">
            <div className="text-3xl font-mono tracking-wider mb-2">
              {renderWord()}
            </div>
            <p className="text-xs text-slate-500">
              Words: {wordsCompleted}
            </p>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={typedText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={gameState !== 'playing'}
            className="w-full max-w-xs px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-center text-xl font-mono text-white focus:border-blue-500 focus:outline-none"
            placeholder={gameState === 'playing' ? 'Type here...' : ''}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        {/* Menu overlay */}
        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Keyboard className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
                </motion.div>
                <h1 className="text-xl font-black text-cyan-400 mb-4">TYPING SPEED</h1>

                <div className="flex gap-2 justify-center mb-4">
                  {(Object.keys(WORD_LISTS) as Difficulty[]).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`px-3 py-1 rounded text-xs font-bold ${
                        difficulty === diff
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {diff.toUpperCase()}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  Type words as fast as you can!<br />
                  Build streaks for bonus points.
                </p>

                {highScore > 0 && (
                  <p className="text-xs text-yellow-400 mb-4">
                    🏆 High Score: {highScore}
                  </p>
                )}

                <button
                  onClick={startGame}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded"
                >
                  START
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Countdown overlay */}
        <AnimatePresence>
          {gameState === 'countdown' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 flex items-center justify-center"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-6xl font-black text-cyan-400"
              >
                {countdown > 0 ? countdown : 'GO!'}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game over overlay */}
        <AnimatePresence>
          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 flex items-center justify-center"
            >
              <div className="text-center">
                <h2 className="text-xl font-black text-cyan-400 mb-4">TIME'S UP!</h2>

                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                  <div className="bg-slate-800 p-3 rounded">
                    <p className="text-slate-500">Score</p>
                    <p className="text-xl font-bold text-yellow-400">{score}</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded">
                    <p className="text-slate-500">WPM</p>
                    <p className="text-xl font-bold text-cyan-400">{wpm}</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded">
                    <p className="text-slate-500">Accuracy</p>
                    <p className="text-xl font-bold text-green-400">{accuracy}%</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded">
                    <p className="text-slate-500">Words</p>
                    <p className="text-xl font-bold text-purple-400">{wordsCompleted}</p>
                  </div>
                </div>

                {bestStreak >= 5 && (
                  <p className="text-orange-400 text-sm mb-2">
                    🔥 Best Streak: {bestStreak}
                  </p>
                )}

                {score > highScore && (
                  <p className="text-green-400 text-sm mb-4">🏆 NEW HIGH SCORE!</p>
                )}

                <button
                  onClick={startGame}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded"
                >
                  PLAY AGAIN
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameBoyContainer>
  );
}
