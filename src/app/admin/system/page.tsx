import SettingsClient from '@/components/admin/SettingsClient';

export const dynamic = 'force-dynamic';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">System Settings</h1>
        <p className="text-gray-500 font-mono text-sm bg-white p-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-block">
          Manage system health, clear memory caches, and toggle global maintenance mode.
        </p>
      </div>

      <SettingsClient />
    </div>
  );
}
