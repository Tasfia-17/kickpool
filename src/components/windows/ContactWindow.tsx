'use client';

import { Mail, MessageCircle, Github, HelpCircle } from 'lucide-react';

export function ContactWindow() {
  return (
    <div className="h-full overflow-y-auto p-4 text-sm">
      <div className="space-y-5">
        <section>
          <h2 className="text-base font-black mb-3">Get in Touch</h2>
          <p className="opacity-80 leading-relaxed text-xs mb-4">
            Have a question, suggestion, or need help? Reach out through any of these channels:
          </p>

          <div className="space-y-3">
            <a 
              href="mailto:support@cinepurr.com"
              className="flex items-center gap-3 p-3 border-2 border-black dark:border-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Mail size={24} className="text-pink-500 flex-shrink-0" />
              <div>
                <h3 className="font-black text-sm">Email</h3>
                <p className="text-xs opacity-70">support@cinepurr.com</p>
              </div>
            </a>

            <a 
              href="https://discord.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 border-2 border-black dark:border-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <MessageCircle size={24} className="text-indigo-500 flex-shrink-0" />
              <div>
                <h3 className="font-black text-sm">Discord</h3>
                <p className="text-xs opacity-70">Join our community</p>
              </div>
            </a>

            <a 
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 border-2 border-black dark:border-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Github size={24} className="text-gray-800 dark:text-gray-200 flex-shrink-0" />
              <div>
                <h3 className="font-black text-sm">GitHub</h3>
                <p className="text-xs opacity-70">Report issues & contribute</p>
              </div>
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-base font-black mb-3 flex items-center gap-2">
            <HelpCircle size={18} />
            FAQ
          </h2>
          <div className="space-y-3 opacity-80">
            <div className="p-2 bg-black/5 dark:bg-white/5 rounded">
              <h3 className="font-black text-xs mb-1">How do I create a room?</h3>
              <p className="text-xs">Click "Create Room" on home, name it, and share the link!</p>
            </div>
            <div className="p-2 bg-black/5 dark:bg-white/5 rounded">
              <h3 className="font-black text-xs mb-1">Why isn&apos;t sync working?</h3>
              <p className="text-xs">Auto-sync only works for YouTube. For movies, everyone must press play together.</p>
            </div>
            <div className="p-2 bg-black/5 dark:bg-white/5 rounded">
              <h3 className="font-black text-xs mb-1">How do I report a bug?</h3>
              <p className="text-xs">Report on GitHub or email us!</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
