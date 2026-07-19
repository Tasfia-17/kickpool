import type { Metadata } from 'next';
import { HistoryWindow } from '@/components/windows/HistoryWindow';

export const metadata: Metadata = {
  title: 'Watch History | CinePurr',
  description: 'View your watch history and recent room activity.',
};

export default function WatchHistoryPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8" style={{ backgroundColor: '#f7f3ea' }}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#ff7a59]">Watch History</p>
          <h1 className="mt-2 text-3xl font-black text-black sm:text-4xl">Your recent viewing activity</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium text-black/70">
            Open your watch history to revisit rooms you watched recently. If you have no items yet, this page will show the empty state instead of a broken route.
          </p>
        </div>

        <section className="overflow-hidden rounded-3xl border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <HistoryWindow />
        </section>
      </div>
    </main>
  );
}