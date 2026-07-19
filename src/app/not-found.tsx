'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Home, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

const messages = [
  "Looks like this page missed the goal... completely!",
  "404: Page went offside and never came back!",
  "This page got a red card and left the pitch.",
  "Oops! The ball rolled out of bounds here.",
  "The page you're looking for is warming the bench permanently!",
  "This URL is as empty as the stadium after the final whistle.",
];

export default function NotFound() {
  const [msg, setMsg] = useState(messages[0]);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setMsg(messages[Math.floor(Math.random() * messages.length)]);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center p-4">
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-purple-400/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ y: [-20, -120], opacity: [0.2, 0.8, 0.2] }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      <div className="text-center z-10 max-w-lg">
        {/* Animated 404 */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, stiffness: 100 }}
          className="mb-6"
        >
          <h1 className="text-[120px] sm:text-[180px] font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 leading-none drop-shadow-2xl">
            404
          </h1>
        </motion.div>

        {/* Animated football */}
        <motion.div
          animate={{ 
            y: isHovering ? -10 : [0, -10, 0],
            rotate: isHovering ? 360 : [0, 15, -15, 0],
          }}
          transition={{ 
            y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            rotate: isHovering ? { duration: 0.5 } : { duration: 3, repeat: Infinity },
          }}
          onHoverStart={() => setIsHovering(true)}
          onHoverEnd={() => setIsHovering(false)}
          className="mb-6 cursor-pointer select-none text-7xl flex justify-center"
        >
          ⚽
        </motion.div>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl sm:text-2xl text-purple-200 mb-8 font-medium"
        >
          {msg}
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all hover:scale-105"
          >
            <Home size={18} /> Back to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-purple-500 text-purple-300 hover:bg-purple-500/20 font-bold rounded-xl transition-all hover:scale-105"
          >
            <ArrowLeft size={18} /> Go Back
          </button>
        </motion.div>
      </div>
    </main>
  );
}
