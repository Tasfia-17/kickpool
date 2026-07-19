'use client';

import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { Info, Users, Film, Heart, Gamepad2, Gift, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function AboutPage() {
  const { isDarkMode } = usePokemonTheme();

  const features = [
    { icon: Film, title: 'Real-time Sync', desc: 'YouTube videos stay perfectly synchronized', color: 'text-pink-500' },
    { icon: Users, title: 'Watch Parties', desc: 'Create rooms and invite friends', color: 'text-purple-500' },
    { icon: Gamepad2, title: 'Minigames', desc: 'Play retro games while watching', color: 'text-green-500' },
    { icon: Gift, title: 'Daily Rewards', desc: 'Complete quests and earn XP', color: 'text-yellow-500' },
    { icon: Sparkles, title: 'Achievements', desc: 'Unlock badges and level up', color: 'text-cyan-500' },
    { icon: Zap, title: 'Fast & Fun', desc: 'Lightweight and responsive', color: 'text-orange-500' },
  ];

  return (
    <div className={`min-h-screen p-4 sm:p-8 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        className="max-w-4xl mx-auto"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Hero Section */}
        <motion.div variants={item} className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 mb-6 shadow-lg">
            <Info size={40} className="text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            About CinePurr
          </h1>
          <p className={`text-lg sm:text-xl max-w-2xl mx-auto ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Watch videos together, stay cozy. 🐱
          </p>
        </motion.div>

        {/* What is CinePurr */}
        <motion.section variants={item} className="mb-12">
          <div className={`p-6 sm:p-8 rounded-2xl border-2 ${isDarkMode ? 'border-white/20 bg-white/5' : 'border-black/10 bg-black/5'}`}>
            <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
              <Film size={24} className="text-pink-500" />
              What is CinePurr?
            </h2>
            <p className={`text-lg leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              CinePurr is a platform for watching videos together in real-time. Create rooms, invite friends,
              and enjoy synchronized viewing experiences. Whether you&apos;re watching YouTube videos, movies, or TV shows,
              CinePurr keeps everyone in sync so you can enjoy the moment together.
            </p>
          </div>
        </motion.section>

        {/* Features Grid */}
        <motion.section variants={item} className="mb-12">
          <h2 className="text-2xl font-black mb-6 text-center">Features</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className={`p-4 sm:p-6 rounded-xl border-2 text-center transition-all ${isDarkMode ? 'border-white/20 bg-white/5 hover:bg-white/10' : 'border-black/10 bg-black/5 hover:bg-black/10'}`}
              >
                <feature.icon size={32} className={`mx-auto mb-3 ${feature.color}`} />
                <h3 className="font-bold text-sm sm:text-base mb-1">{feature.title}</h3>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Mission */}
        <motion.section variants={item} className="mb-12">
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-2 border-pink-500/30">
            <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
              <Heart size={24} className="text-pink-500" />
              Our Mission
            </h2>
            <p className={`text-lg leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              CinePurr was created to bring people together through shared entertainment. We believe that watching
              videos together, even when apart, creates meaningful connections and memorable experiences. Our retro
              aesthetic and playful design make every interaction feel cozy and fun.
            </p>
          </div>
        </motion.section>

        {/* Back Button */}
        <motion.div variants={item} className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-pink-500/25 transition-all hover:-translate-y-1"
          >
            ← Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

