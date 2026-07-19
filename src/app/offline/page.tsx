'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import PixelIcon from '@/components/PixelIcon';

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Animated Icon */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-gray-800/50 flex items-center justify-center border-2 border-gray-600">
            <WifiOff size={48} className="text-gray-400" />
          </div>
        </motion.div>

        {/* Sad Cat */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
          style={{ color: '#a855f7' }}
        >
          <PixelIcon name="cat" size={64} />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-white mb-4"
        >
          You&apos;re Offline
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-400 mb-8"
        >
          CinePurr needs an internet connection to watch videos together. 
          Check your connection and try again!
        </motion.p>

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => window.location.reload()}
          className="group flex items-center justify-center gap-2 mx-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105"
        >
          <RefreshCw size={20} className="group-hover:animate-spin" />
          Try Again
        </motion.button>

        {/* Connection tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-left bg-gray-800/30 rounded-xl p-4 border border-gray-700"
        >
          <h3 className="text-sm font-bold text-gray-300 mb-2">💡 Quick fixes:</h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Check if your Wi-Fi is connected</li>
            <li>• Try turning airplane mode off and on</li>
            <li>• Move closer to your router</li>
            <li>• Restart your browser</li>
          </ul>
        </motion.div>
      </div>
    </main>
  );
}
