"use client";

import React from "react";
import { usePokemonTheme } from "@/components/PokemonThemeProvider";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { Camera, FileText, Globe, Save, Key, Link2 } from "lucide-react";
import { ProfileFormState, PasswordFormState } from "./useProfileSettings";

interface ProfileSettingsProps {
  profileForm: ProfileFormState;
  passwordForm: PasswordFormState;
  handlers: {
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handlePasswordChange: (e: React.FormEvent) => Promise<void>;
  };
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function ProfileSettings({
  profileForm,
  passwordForm,
  handlers,
  fileInputRef,
}: ProfileSettingsProps) {
  const { currentTheme } = usePokemonTheme();
  const { t, language, setLanguage } = useI18n();

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Profile Details Form */}
      <form onSubmit={handlers.handleSubmit} className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center">
          <div
            className="relative group cursor-pointer mb-3 rounded-full overflow-hidden border-4 transition-all hover:scale-105"
            style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}
            onClick={() => fileInputRef.current?.click()}
          >
            {profileForm.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileForm.image}
                alt="Avatar"
                className="w-32 h-32 object-cover"
              />
            ) : (
              <div
                className="w-32 h-32 flex items-center justify-center text-4xl font-bold text-white"
                style={{ backgroundColor: currentTheme.colors.primary }}
              >
                {profileForm.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-sm pointer-events-none">
              <Camera size={24} className="mb-1" />
              <span>Change</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlers.handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          <p className="text-xs font-bold text-white/40">
            Max 500KB
          </p>
        </div>

        {/* Username */}
        <div>
          <label className="settings-label">
            {t("username")}
          </label>
          <input
            type="text"
            value={profileForm.username}
            onChange={(e) => profileForm.setUsername(e.target.value)}
            className="settings-input"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="settings-label flex items-center gap-2">
            <FileText size={12} /> {t("aboutMe")}
          </label>
          <textarea
            value={profileForm.bio}
            onChange={(e) => profileForm.setBio(e.target.value)}
            className="settings-input h-28 resize-none"
            placeholder={t("tellUs")}
          />
        </div>

        {/* Social Links */}
        <div className="settings-section-card">
          <h3 className="font-bold flex items-center gap-2 mb-4 text-white text-sm">
            <Link2 size={16} className="text-white/60" /> {t("socialLinks")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#5865F2]">
                {t("discord")}
              </label>
              <input
                type="text"
                value={profileForm.discord}
                onChange={(e) => profileForm.setDiscord(e.target.value)}
                className="settings-input"
                placeholder="user#0000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#E1306C]">
                {t("instagram")}
              </label>
              <input
                type="text"
                value={profileForm.instagram}
                onChange={(e) => profileForm.setInstagram(e.target.value)}
                className="settings-input"
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#1DA1F2]">
                {t("twitter")}
              </label>
              <input
                type="text"
                value={profileForm.twitter}
                onChange={(e) => profileForm.setTwitter(e.target.value)}
                className="settings-input"
                placeholder="@username"
              />
            </div>
          </div>
        </div>

        {/* Display Message */}
        {profileForm.message && (
          <div
            className={`p-3 text-center text-sm font-bold rounded-xl ${profileForm.message.includes("success") ? "bg-emerald-500/10 text-emerald-300 border border-emerald-300/20" : "bg-red-500/10 text-red-300 border border-red-300/20"}`}
          >
            {profileForm.message}
          </div>
        )}

        <button
          type="submit"
          disabled={profileForm.isLoading}
          className="settings-save-btn"
          style={{
            backgroundColor: currentTheme.colors.primary,
            boxShadow: `0 4px 16px 0 ${currentTheme.colors.primary}44`,
          }}
        >
          {profileForm.isLoading ? (
            t("saving")
          ) : (
            <>
              <Save size={18} /> {t("save")}
            </>
          )}
        </button>
      </form>

      {/* Language Settings */}
      <div className="pt-6 border-t-2 border-dashed border-white/10">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-white">
          <Globe size={18} className="text-white/60" /> {t("language")}
        </h3>
        <div className="settings-section-card">
          <label className="settings-label">
            {t("selectLanguage")}
          </label>
          <LanguageSwitcher value={language} onChange={setLanguage} />
        </div>
      </div>

      {/* Password Change */}
      <div className="pt-6 border-t-2 border-dashed border-white/10">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-white">
          <Key size={18} className="text-white/60" /> {t("changePassword")}
        </h3>
        <form onSubmit={handlers.handlePasswordChange} className="space-y-4">
          <div>
            <label className="settings-label">
              Current Password
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => passwordForm.setCurrentPassword(e.target.value)}
              className="settings-input"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="settings-label">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => passwordForm.setNewPassword(e.target.value)}
                className="settings-input"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="settings-label">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  passwordForm.setConfirmPassword(e.target.value)
                }
                className="settings-input"
                required
                minLength={6}
              />
            </div>
          </div>

          {passwordForm.passwordMessage && (
            <div
              className={`p-3 text-center text-sm font-bold rounded-xl ${passwordForm.passwordMessage.includes("success") ? "bg-emerald-500/10 text-emerald-300 border border-emerald-300/20" : "bg-red-500/10 text-red-300 border border-red-300/20"}`}
            >
              {passwordForm.passwordMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={passwordForm.isPasswordLoading}
            className="settings-save-btn"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              color: "#f8fafc",
              border: "3px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            {passwordForm.isPasswordLoading ? (
              "Updating..."
            ) : (
              <>
                <Key size={18} /> Update Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
