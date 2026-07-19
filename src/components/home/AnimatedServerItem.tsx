"use client";

import React, { useRef, memo } from 'react';
import { motion, useInView } from 'motion/react';

export const AnimatedServerItem = memo(function AnimatedServerItem({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.8, opacity: 0, y: 20 }}
      transition={{ duration: 0.3, delay: index * 0.08, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
});
