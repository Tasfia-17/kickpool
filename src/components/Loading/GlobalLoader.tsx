"use client";

import React, { memo } from 'react';
import { useLoading } from './LoadingProvider';

const GlobalLoader = memo(function GlobalLoader() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-black p-4 rounded-lg flex items-center gap-3 shadow">
        <div className="w-8 h-8 border-4 border-t-transparent border-gray-300 rounded-full animate-spin" />
        <div className="font-semibold">Loading...</div>
      </div>
    </div>
  );
});

export default GlobalLoader;
