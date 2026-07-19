"use client";

import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Header() {
  return (
    <header className="h-16 sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 shrink-0">
      <Logo size="md" />

      {/* Back to Home */}
      <Link
        href="/"
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:text-white hover:border-purple-500 font-semibold text-sm transition-all"
      >
        <Home size={16} /> Home
      </Link>
    </header>
  );
}
