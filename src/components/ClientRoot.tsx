'use client';

import React from 'react';
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { BadgeProvider } from "@/components/Badges/BadgeProvider";
import { LoadingProvider } from "@/components/Loading/LoadingProvider";
import PageTransition from "@/components/PageTransition";
import GlobalLoader from "@/components/Loading/GlobalLoader";
import MusicPlayerWrapper from "@/components/MusicPlayerWrapper";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { ErrorMonitorProvider } from "@/components/ErrorMonitorProvider";
import OfflineIndicator from "@/components/OfflineIndicator";
import InstallPrompt from "@/components/InstallPrompt";
import IntroAnimation from "@/components/IntroAnimation";
import dynamic from 'next/dynamic';

const AIChatbot = dynamic(() => import('@/components/AIChatbot'), { ssr: false });
const CursorTrail = dynamic(() => import('@/components/CursorTrail'), { ssr: false });
const VirtualPet = dynamic(() => import('@/components/VirtualPet'), { ssr: false });
const DynamicBackground = dynamic(() => import('@/components/DynamicBackground'), { ssr: false });

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  // NOTE: Do NOT use sessionStorage in useState lazy initializers here.
  // That causes React hydration mismatch (#418) because the server always
  // returns false while the client may return true. IntroAnimation handles
  // its own sessionStorage check after mount via useEffect.
  return (
    <AuthProvider>
      <ToastProvider>
        <LoadingProvider>
          <BadgeProvider>
            <OfflineIndicator />
            <InstallPrompt />

            {/* IntroAnimation is a fixed overlay — children always render beneath it */}
            <IntroAnimation />

            <PageTransition>
              {children}
            </PageTransition>
            <GlobalLoader />
            <MusicPlayerWrapper />
            <CursorTrail />
            <div className="hidden sm:block">
              <VirtualPet />
            </div>
            <DynamicBackground />
            <div className="hidden sm:block">
              <AIChatbot />
            </div>

            <ServiceWorkerRegistration />
            <AnalyticsProvider><></></AnalyticsProvider>
            <ErrorMonitorProvider><></></ErrorMonitorProvider>
          </BadgeProvider>
        </LoadingProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
