'use client';

import { useState, useEffect } from 'react';
import { PowerOff, Server, HardDrive, RefreshCw, AlertTriangle, Activity } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function SettingsClient() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    fetchSettings(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchSettings = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/admin/settings', { signal });
      if (res.ok) {
        const data = await res.json();
        setIsMaintenanceMode(data.maintenanceMode);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      addToast({ type: 'error', title: 'Error', message: 'Failed to load system settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMaintenanceMode = async () => {
    const newState = !isMaintenanceMode;
    const actionPhrase = newState ? 'ENABLE Maintenance Mode' : 'DISABLE Maintenance Mode';
    
    if (newState) {
        if (!confirm(`Are you absolutely sure you want to ${actionPhrase}? Normal users will be blocked from accessing the site, and a global warning will be broadcasted to active rooms immediately.`)) return;
    } else {
        if (!confirm(`Are you sure you want to ${actionPhrase}? The site will become immediately accessible to all users again.`)) return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setMaintenanceMode', value: newState }),
      });

      if (!res.ok) throw new Error('Failed to update maintenance mode');
      
      setIsMaintenanceMode(newState);
      addToast({ type: 'success', title: 'Success', message: `Maintenance Mode ${newState ? 'Enabled' : 'Disabled'}` });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to update system settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = async () => {
      if (!confirm('Are you sure you want to clear the Redis In-Memory object caches? This will clear Friend lists, searches, and other fast-access data causing them to be re-queried from the database. Room states will NOT be affected.')) return;
      
      setIsClearing(true);
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clearCache' }),
        });
  
        if (!res.ok) throw new Error('Failed to clear caches');
        
        addToast({ type: 'success', title: 'Success', message: 'In-Memory caches cleared.' });
      } catch {
        addToast({ type: 'error', title: 'Error', message: 'Failed to clear caches.' });
      } finally {
        setIsClearing(false);
      }
  };

  if (isLoading) {
      return (
          <div className="flex justify-center items-center py-12">
              <RefreshCw className="animate-spin text-purple-500" size={32} />
          </div>
      );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      
      {/* Maintenance Mode Toggle */}
      <div className={`p-6 border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors duration-500 ${isMaintenanceMode ? 'bg-red-50 border-red-500' : 'bg-white border-black'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                  <h2 className={`text-xl font-black uppercase flex items-center gap-2 mb-2 ${isMaintenanceMode ? 'text-red-600' : 'text-black'}`}>
                      <AlertTriangle size={24} /> 
                      {isMaintenanceMode ? 'Maintenance Mode: ACTIVE' : 'Maintenance Mode'}
                  </h2>
                  <p className="font-mono text-sm text-gray-600 max-w-xl">
                      When active, only users with <kbd className="bg-gray-200 px-1">FOUNDER</kbd> or <kbd className="bg-gray-200 px-1">PURR_ADMIN</kbd> roles can access the site. Everyone else will see a maintenance screen.
                  </p>
              </div>
              
              <button
                onClick={handleToggleMaintenanceMode}
                disabled={isSaving}
                className={`flex-shrink-0 px-6 py-4 font-black text-sm uppercase text-white border-4 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${isMaintenanceMode ? 'bg-red-600' : 'bg-black hover:bg-red-600 hover:border-red-600'}`}
              >
                  {isSaving ? (
                      <RefreshCw size={20} className="animate-spin" />
                  ) : (
                      <PowerOff size={20} className={isMaintenanceMode ? "animate-pulse" : ""} />
                  )}
                  {isMaintenanceMode ? 'DISABLE MAINTENANCE' : 'ENTER MAINTENANCE'}
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cache Management */}
          <div className="bg-white p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-lg font-black uppercase flex items-center gap-2 mb-2">
                <HardDrive size={20} /> Object Cache Details
            </h3>
            <p className="font-mono text-xs text-gray-500 mb-6">
                Clear the internal Redis object cache to force a re-fetch of database information. Does not affect PostgreSQL schema or user data. Safe to run.
            </p>
            <button
                onClick={handleClearCache}
                disabled={isClearing}
                className="w-full py-3 px-4 font-bold text-sm bg-orange-100 text-orange-800 border-2 border-orange-500 hover:bg-orange-200 transition-colors flex items-center justify-center gap-2"
            >
                {isClearing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Clear Application Cache
            </button>
          </div>

          {/* System Health Data */}
          <div className="bg-white p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-lg font-black uppercase flex items-center gap-2 mb-2">
                <Activity size={20} /> Environment Data
            </h3>
            <ul className="space-y-3 font-mono text-sm mt-4">
                <li className="flex justify-between border-b-2 border-dashed border-gray-200 pb-2">
                    <span className="text-gray-500">Node ENV</span>
                    <span className="font-bold">{process.env.NODE_ENV || 'production'}</span>
                </li>
                <li className="flex justify-between border-b-2 border-dashed border-gray-200 pb-2">
                    <span className="text-gray-500">Process</span>
                    <span className="font-bold">Next.js 16 (App Router)</span>
                </li>
                <li className="flex justify-between border-b-2 border-dashed border-gray-200 pb-2">
                    <span className="text-gray-500">Custom Socket Server</span>
                    <span className="font-bold text-green-600">Active</span>
                </li>
                <li className="flex justify-between pb-2">
                    <span className="text-gray-500">Redis Services</span>
                    <span className="font-bold text-green-600">Active</span>
                </li>
            </ul>
          </div>
      </div>
    </div>
  );
}
