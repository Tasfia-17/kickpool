'use client';

import { useState, useCallback } from 'react';
import type { IDCardStyleKey } from '@/components/ui/IDCard';

export interface VIPSettings {
  // Name customization
  nameColor: string;
  nameGradient: string;
  nameEffect: string;
  font: string;
  badge: string;
  glow: boolean;

  // Profile card
  profileBg: string;
  profileBanner: string;
  profileAccent: string;
  profileBorder: string;
  profileGlow: string;

  // ProfileCard name settings
  cardNameColor: string;
  cardNameGradient: string;
  cardNameGlow: boolean;

  // ID Card settings
  profileCardStyle: 'classic' | 'idcard';
  idCardStyle: IDCardStyleKey;
  idCardCustomHeader: string;
  idCardCustomBody: string;
  idCardCustomAccent: string;
  idCardCustomBorder: string;
  idCardShowLevel: boolean;
  idCardShowXp: boolean;
  idCardShowHologram: boolean;
  idCardShowScanlines: boolean;
}

const DEFAULT_VIP_SETTINGS: VIPSettings = {
  nameColor: '#ff69b4',
  nameGradient: '',
  nameEffect: '',
  font: 'default',
  badge: '👑',
  glow: false,

  profileBg: '',
  profileBanner: '',
  profileAccent: '',
  profileBorder: '',
  profileGlow: '',

  cardNameColor: '',
  cardNameGradient: '',
  cardNameGlow: false,

  profileCardStyle: 'classic',
  idCardStyle: 'officer',
  idCardCustomHeader: '',
  idCardCustomBody: '',
  idCardCustomAccent: '',
  idCardCustomBorder: '',
  idCardShowLevel: true,
  idCardShowXp: true,
  idCardShowHologram: true,
  idCardShowScanlines: true,
};

/**
 * Custom hook to manage VIP settings with reduced boilerplate
 * Replaces 30+ individual useState calls
 */
export function useVIPSettings(initialData?: Partial<VIPSettings>) {
  const [settings, setSettings] = useState<VIPSettings>({
    ...DEFAULT_VIP_SETTINGS,
    ...initialData,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'name' | 'profile' | 'idcard'>('name');

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof VIPSettings>(
    key: K,
    value: VIPSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple settings at once
  const updateSettings = useCallback((updates: Partial<VIPSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Load settings from API data
  const loadFromAPI = useCallback((data: Record<string, unknown>) => {
    setSettings({
      nameColor: (data.vipNameColor as string) || DEFAULT_VIP_SETTINGS.nameColor,
      nameGradient: (data.vipNameGradient as string) || '',
      nameEffect: (data.vipNameEffect as string) || '',
      font: (data.vipFont as string) || 'default',
      badge: (data.vipBadge as string) || '👑',
      glow: Boolean(data.vipGlow),

      profileBg: (data.vipProfileBg as string) || '',
      profileBanner: (data.vipProfileBanner as string) || '',
      profileAccent: (data.vipProfileAccent as string) || '',
      profileBorder: (data.vipProfileBorder as string) || '',
      profileGlow: (data.vipProfileGlow as string) || '',

      cardNameColor: (data.vipCardNameColor as string) || '',
      cardNameGradient: (data.vipCardNameGradient as string) || '',
      cardNameGlow: Boolean(data.vipCardNameGlow),

      profileCardStyle: (data.profileCardStyle as 'classic' | 'idcard') || 'classic',
      idCardStyle: (data.idCardStyle as IDCardStyleKey) || 'officer',
      idCardCustomHeader: (data.idCardCustomHeader as string) || '',
      idCardCustomBody: (data.idCardCustomBody as string) || '',
      idCardCustomAccent: (data.idCardCustomAccent as string) || '',
      idCardCustomBorder: (data.idCardCustomBorder as string) || '',
      idCardShowLevel: data.idCardShowLevel !== false,
      idCardShowXp: data.idCardShowXp !== false,
      idCardShowHologram: data.idCardShowHologram !== false,
      idCardShowScanlines: data.idCardShowScanlines !== false,
    });
  }, []);

  // Convert to API format for saving
  const toAPIFormat = useCallback(() => ({
    vipNameColor: settings.nameColor,
    vipNameGradient: settings.nameGradient,
    vipNameEffect: settings.nameEffect,
    vipFont: settings.font,
    vipBadge: settings.badge,
    vipGlow: settings.glow,

    vipProfileBg: settings.profileBg,
    vipProfileBanner: settings.profileBanner,
    vipProfileAccent: settings.profileAccent,
    vipProfileBorder: settings.profileBorder,
    vipProfileGlow: settings.profileGlow,

    vipCardNameColor: settings.cardNameColor,
    vipCardNameGradient: settings.cardNameGradient,
    vipCardNameGlow: settings.cardNameGlow,

    profileCardStyle: settings.profileCardStyle,
    idCardStyle: settings.idCardStyle,
    idCardCustomHeader: settings.idCardCustomHeader,
    idCardCustomBody: settings.idCardCustomBody,
    idCardCustomAccent: settings.idCardCustomAccent,
    idCardCustomBorder: settings.idCardCustomBorder,
    idCardShowLevel: settings.idCardShowLevel,
    idCardShowXp: settings.idCardShowXp,
    idCardShowHologram: settings.idCardShowHologram,
    idCardShowScanlines: settings.idCardShowScanlines,
  }), [settings]);

  // Save to API
  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/user/vip', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toAPIFormat()),
      });

      if (!res.ok) throw new Error('Failed to save');
      setMessage('VIP settings saved successfully! ✨');
      return true;
    } catch (err) {
      setMessage('Failed to save VIP settings');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toAPIFormat]);

  return {
    settings,
    updateSetting,
    updateSettings,
    loadFromAPI,
    toAPIFormat,
    saveSettings,
    isLoading,
    message,
    setMessage,
    activeTab,
    setActiveTab,
  };
}

export interface ProfileSettings {
  username: string;
  image: string;
  bio: string;
  discord: string;
  instagram: string;
  twitter: string;
}

const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  username: '',
  image: '',
  bio: '',
  discord: '',
  instagram: '',
  twitter: '',
};

/**
 * Hook for basic profile settings
 */
export function useProfileSettings(initialData?: Partial<ProfileSettings>) {
  const [settings, setSettings] = useState<ProfileSettings>({
    ...DEFAULT_PROFILE_SETTINGS,
    ...initialData,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const updateSetting = useCallback(<K extends keyof ProfileSettings>(
    key: K,
    value: ProfileSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const loadFromAPI = useCallback((data: Record<string, unknown>) => {
    setSettings({
      username: (data.username as string) || '',
      image: (data.image as string) || '',
      bio: (data.bio as string) || '',
      discord: (data.discord as string) || '',
      instagram: (data.instagram as string) || '',
      twitter: (data.twitter as string) || '',
    });
  }, []);

  return {
    settings,
    updateSetting,
    setSettings,
    loadFromAPI,
    isLoading,
    setIsLoading,
    message,
    setMessage,
  };
}
