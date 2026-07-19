"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SetPageBodyClass() {
  const pathname = usePathname();

  useEffect(() => {
    // if pathname is exactly '/'
    if (pathname === '/') {
      document.body.classList.add('page-main');
    } else {
      document.body.classList.remove('page-main');
    }
  }, [pathname]);

  return null;
}
