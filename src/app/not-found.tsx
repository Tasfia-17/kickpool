'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import PixelIcon from '@/components/PixelIcon';

const catPuns = [
  "Looks like this page took a cat nap... permanently!",
  "This page has gone missing, like a cat at bath time!",
  "404: Page not feline so good right meow!",
  "Oops! This page scratched its way out of existence!",
  "The page you&apos;re looking for is playing hide and seek... and winning!",
  "This URL is as empty as a food bowl at dinner time!",
];

export default function NotFound() {
  const [pun, setPun] = useState(catPuns[0]);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setPun(catPuns[Math.floor(Math.random() * catPuns.length)]);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center p-4">
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-purple-400/20 rounded-full"
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)
            }}
            animate={{
              y: [null, Math.random() * -200 - 100],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              repeatType: 'reverse',
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

        {/* Animated Pixel Cat */}
        <motion.div
          animate={{ 
            y: isHovering ? -10 : [0, -10, 0],
            rotate: isHovering ? [0, -5, 5, 0] : 0
          }}
          transition={{ 
            y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 0.5 }
          }}
          onHoverStart={() => setIsHovering(true)}
          onHoverEnd={() => setIsHovering(false)}
          className="mb-6 cursor-pointer select-none flex justify-center"
          style={{ color: isHovering ? '#a855f7' : '#ff69b4' }}
        >
          <PixelIcon name={isHovering ? 'catHappy' : 'cat'} size={96} />
        </motion.div>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl sm:text-2xl text-purple-200 mb-8 font-medium"
        >
          {pun}
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
            className="group flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl border-2 border-white/20 shadow-lg hover:shadow-pink-500/25 hover:scale-105 transition-all duration-300"
          >
            <Home size={20} className="group-hover:animate-bounce" />
            Go Home
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="group flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-bold rounded-xl border-2 border-white/20 backdrop-blur-sm hover:bg-white/20 hover:scale-105 transition-all duration-300"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
        </motion.div>

        {/* Fun fact */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-purple-400/60 text-sm"
        >
          Fun fact: Cats spend 70% of their lives sleeping. This page is sleeping forever. 💤
        </motion.p>
      </div>
    </main>
  );
}
