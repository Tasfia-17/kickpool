'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudyDrawerProps {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function StudyDrawer({ title, subtitle, open, onClose, children }: StudyDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close drawer overlay"
            className="fixed inset-0 z-40 bg-[#120f17]/65 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[30rem] border-l-4 border-black bg-[#f8ecd2] text-[#2f2118] shadow-[-14px_0_0_rgba(36,20,14,0.32)] dark:bg-[#1f1721] dark:text-[#f3e8d0]"
          >
            <div className="flex h-full flex-col">
              <div className="border-b-4 border-black bg-[#ead09b] px-5 py-4 dark:bg-[#3a2a37]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-[#714f34] dark:text-[#d9b98f]">
                      Study Room Module
                    </p>
                    <h2 className="mt-2 font-mono text-2xl uppercase tracking-[0.08em]">
                      {title}
                    </h2>
                    {subtitle ? (
                      <p className="mt-2 max-w-md text-sm leading-6 text-[#5a4231] dark:text-[#decbb0]">
                        {subtitle}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 w-10 items-center justify-center border-4 border-black bg-white text-[#251610] shadow-[4px_4px_0_rgba(31,19,13,0.25)] dark:bg-[#251927] dark:text-[#f6ead2]"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-5">{children}</div>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
