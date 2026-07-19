'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import Logo from '@/components/Logo';
import { LogIn } from 'lucide-react';
import Link from 'next/link';

function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentTheme, isDarkMode } = usePokemonTheme();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setCode(codeParam);
      lookupRoom(codeParam);
    }
  }, [searchParams]);

  const lookupRoom = async (inviteCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/invite?code=${encodeURIComponent(inviteCode)}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Invalid invite code');
        setRoom(null);
        return;
      }
      const data = await res.json();
      setRoom(data);
    } catch (err) {
      setError('Failed to lookup room');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      lookupRoom(code.trim());
    }
  };

  const handleJoin = () => {
    if (room) {
      router.push(`/room/${room.id}`);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: isDarkMode ? currentTheme.colors.darkBackground : currentTheme.colors.background }}
    >
      <div 
        className="w-full max-w-md border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        style={{ backgroundColor: isDarkMode ? 'black' : 'white' }}
      >
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <h1 
          className="text-3xl font-black text-center mb-6"
          style={{ color: isDarkMode ? 'white' : 'black' }}
        >
          🔗 Join Room
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              className="block text-sm font-bold mb-2"
              style={{ color: isDarkMode ? '#ccc' : '#333' }}
            >
              Invite Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code (e.g., ABC123)"
              maxLength={6}
              className={`w-full p-3 border-2 border-black font-mono text-lg text-center tracking-widest uppercase ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
            />
          </div>
          
          {!room && (
            <button
              type="submit"
              disabled={!code.trim() || loading}
              className="w-full py-3 border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all"
                  style={{ backgroundColor: currentTheme.colors.primary, color: 'white' }}
            >
              {loading ? '🔍 Looking up...' : '🔍 Find Room'}
            </button>
          )}
        </form>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 font-bold text-center">
            ❌ {error}
          </div>
        )}
        
        {room && (
          <div className="mt-4 space-y-4">
            <div 
              className="p-4 border-2 border-black"
              style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0' }}
            >
              <p className="text-sm text-gray-500">Room Found:</p>
              <p 
                className="text-xl font-bold"
                style={{ color: isDarkMode ? 'white' : 'black' }}
              >
                {room.name}
              </p>
            </div>
            
            <button
              onClick={handleJoin}
              className="w-full py-3 border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: '#4CAF50', color: 'white' }}
            >
              <LogIn size={24} /> Join Room
            </button>
          </div>
        )}
        
        <div className="mt-6 text-center">
          <Link 
            href="/"
            className="text-sm font-bold underline"
            style={{ color: currentTheme.colors.primary }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold animate-pulse">Loading...</div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
