"use client";

import { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';

function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // If we are on desktop or hydrating, we can just render the page without wait states.
  // Using conditional animations avoids breaking desktop instantaneous feel.

  return (
    <motion.div
      key={pathname}
      initial={isMobile ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full h-full flex flex-col flex-grow"
    >
      {children}
    </motion.div>
  );
}

export default memo(PageTransition);
