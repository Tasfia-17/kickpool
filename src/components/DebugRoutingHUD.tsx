"use client";

import useRouteTransition from '@/hooks/useRouteTransition';
import React from 'react';

export default function DebugRoutingHUD() {
  const isRouting = useRouteTransition();
  return (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999 }}>
      {isRouting && (
        <div className="px-3 py-1 bg-black text-white text-xs rounded">Routing…</div>
      )}
    </div>
  );
}
