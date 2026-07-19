"use client";

import { memo } from 'react';
import { Globe, Lock, Rocket } from 'lucide-react';

interface CreateRoomFormProps {
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  newRoomName: string;
  setNewRoomName: (v: string) => void;
  maxUsers: number;
  setMaxUsers: (v: number) => void;
  isPublicRoom: boolean;
  setIsPublicRoom: (v: boolean) => void;
  isCreating: boolean;
  primaryColor: string;
  t: (key: string) => string;
}

export const CreateRoomForm = memo(function CreateRoomForm({
  onSubmit,
  onClose,
  newRoomName,
  setNewRoomName,
  maxUsers,
  setMaxUsers,
  isPublicRoom,
  setIsPublicRoom,
  isCreating,
  primaryColor,
  t,
}: CreateRoomFormProps) {
  return (
    <div className="z-10 flex flex-col h-full animate-fade-in-scale">
      <div className="flex justify-between items-center mb-2 border-b-2 border-black dark:border-white pb-1">
        <h2 className="text-xl font-black tracking-tighter">CREATE ROOM</h2>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200 font-bold text-xs hover:rotate-90"
        >
          X
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 flex-1">
        <div className="space-y-0.5 animate-slide-in-left stagger-1" style={{ opacity: 0 }}>
          <label className="font-bold text-xs">ROOM NAME</label>
          <div className="border-2 border-black dark:border-white p-1 bg-white dark:bg-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-shadow duration-200 focus-within:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder={t('myRoom')}
              className="w-full p-1 outline-none font-mono text-xs bg-transparent"
              maxLength={20}
            />
          </div>
        </div>

        <div className="space-y-0.5 animate-slide-in-left stagger-2" style={{ opacity: 0 }}>
          <label className="font-bold text-xs">MAX USERS: {maxUsers}</label>
          <div className="border-2 border-black dark:border-white p-2 bg-white dark:bg-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
            <input
              type="range"
              min="2"
              max="20"
              value={maxUsers}
              onChange={(e) => setMaxUsers(parseInt(e.target.value))}
              className="w-full accent-black dark:accent-white cursor-pointer h-2"
              style={{ accentColor: primaryColor }}
            />
          </div>
        </div>

        <div className="space-y-0.5 animate-slide-in-left stagger-3" style={{ opacity: 0 }}>
          <label className="font-bold text-xs">VISIBILITY</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsPublicRoom(true)}
              className={`flex-1 border-2 border-black dark:border-white p-1 font-bold text-xs transition-all duration-200 ${isPublicRoom ? 'bg-black text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] scale-105' : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 hover:scale-102'}`}
            >
              PUBLIC ROOM <Globe size={16} className="inline" />
            </button>
            <button
              type="button"
              onClick={() => setIsPublicRoom(false)}
              className={`flex-1 border-2 border-black dark:border-white p-1 font-bold text-xs transition-all duration-200 ${!isPublicRoom ? 'bg-black text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] scale-105' : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 hover:scale-102'}`}
            >
              PRIVATE ROOM <Lock size={16} className="inline" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="mt-auto border-2 border-black dark:border-white p-2 font-black text-sm text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150 ease-out flex items-center justify-center gap-2 animate-slide-in-left stagger-4 group"
          style={{ backgroundColor: primaryColor }}
        >
          <span>{isCreating ? '...' : t('createRoom')}</span>
          <Rocket size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
        </button>
      </form>
    </div>
  );
});
