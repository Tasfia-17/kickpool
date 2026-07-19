'use client';

import { Info, Users, Film, Heart, Sparkles } from 'lucide-react';

export function AboutWindow() {
  return (
    <div className="h-full overflow-y-auto p-4 text-sm">
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-black mb-3 flex items-center gap-2">
            <Film size={20} />
            What is CinePurr?
          </h2>
          <p className="opacity-80 leading-relaxed">
            CinePurr is a platform for watching videos together in real-time. Create rooms, invite friends, 
            and enjoy synchronized viewing experiences. Whether you&apos;re watching YouTube videos, movies, or TV shows, 
            CinePurr keeps everyone in sync.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black mb-3 flex items-center gap-2">
            <Sparkles size={20} />
            Features
          </h2>
          <ul className="space-y-2 opacity-80">
            <li className="flex items-start gap-2">
              <span className="text-pink-500 font-black">•</span>
              <span><strong>Real-time Sync:</strong> Automatic sync for YouTube videos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-500 font-black">•</span>
              <span><strong>Room Creation:</strong> Create private or public rooms</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-500 font-black">•</span>
              <span><strong>Chat & Interaction:</strong> Chat while watching</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-500 font-black">•</span>
              <span><strong>Minigames:</strong> Play retro-style games</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-500 font-black">•</span>
              <span><strong>XP & Rewards:</strong> Earn XP, unlock achievements</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black mb-3 flex items-center gap-2">
            <Heart size={20} />
            Our Mission
          </h2>
          <p className="opacity-80 leading-relaxed">
            CinePurr was created to bring people together through shared entertainment. We believe that watching 
            videos together, even when apart, creates meaningful connections and memorable experiences.
          </p>
        </section>

        <div className="pt-4 border-t border-black/10 dark:border-white/10 text-center opacity-60">
          <p className="text-xs">Made with 💕 for cozy watch parties</p>
        </div>
      </div>
    </div>
  );
}
