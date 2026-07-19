"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePokemonTheme } from "@/components/PokemonThemeProvider";
import { useToast } from "@/components/ui/Toast";
import type { IDCardStyleKey } from "@/components/ui/IDCard";
import type {
  ProfileSceneEffectId,
  ProfileSceneId,
  UserProfile,
} from "@/lib/profileTypes";

export interface ProfileFormState {
  username: string;
  setUsername: (value: string) => void;
  image: string;
  setImage: (value: string) => void;
  bio: string;
  setBio: (value: string) => void;
  discord: string;
  setDiscord: (value: string) => void;
  instagram: string;
  setInstagram: (value: string) => void;
  twitter: string;
  setTwitter: (value: string) => void;
  isLoading: boolean;
  message: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export interface PasswordFormState {
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  passwordMessage: string;
  isPasswordLoading: boolean;
}

export type VIPTabSelection =
  | "scene"
  | "showcases"
  | "personas"
  | "advanced"
  | "";

export interface VIPSettingsState {
  isVIP: boolean;
  profileSceneId: ProfileSceneId;
  profileSceneEffect: ProfileSceneEffectId;
  vipNameColor: string;
  vipFont: string;
  vipBadge: string;
  vipGlow: boolean;
  vipNameEffect: string;
  vipNameGradient: string;
  vipProfileBg: string;
  vipProfileBanner: string;
  vipProfileAccent: string;
  vipProfileBorder: string;
  vipProfileGlow: string;
  vipCardNameColor: string;
  vipCardNameGradient: string;
  vipCardNameGlow: boolean;
  vipMessage: string;
  isVipLoading: boolean;
  vipTab: VIPTabSelection;
}

export interface IDCardSettingsState {
  profileCardStyle: "classic" | "idcard";
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

export function useProfileSettings(
  usernameParam: string,
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>,
) {
  const { update } = useSession();
  const router = useRouter();
  const { currentTheme } = usePokemonTheme();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [image, setImage] = useState("");
  const [bio, setBio] = useState("");
  const [discord, setDiscord] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const [isVIP, setIsVIP] = useState(false);
  const [profileSceneId, setProfileSceneId] =
    useState<ProfileSceneId>("pallet-hideout");
  const [profileSceneEffect, setProfileSceneEffect] =
    useState<ProfileSceneEffectId>("none");
  const [vipNameColor, setVipNameColor] = useState("#ff69b4");
  const [vipFont, setVipFont] = useState("default");
  const [vipBadge, setVipBadge] = useState("");
  const [vipGlow, setVipGlow] = useState(false);
  const [vipNameEffect, setVipNameEffect] = useState("");
  const [vipNameGradient, setVipNameGradient] = useState("");
  const [vipProfileBg, setVipProfileBg] = useState("");
  const [vipProfileBanner, setVipProfileBanner] = useState("");
  const [vipProfileAccent, setVipProfileAccent] = useState("");
  const [vipProfileBorder, setVipProfileBorder] = useState("");
  const [vipProfileGlow, setVipProfileGlow] = useState("");
  const [vipCardNameColor, setVipCardNameColor] = useState("");
  const [vipCardNameGradient, setVipCardNameGradient] = useState("");
  const [vipCardNameGlow, setVipCardNameGlow] = useState(false);
  const [vipMessage, setVipMessage] = useState("");
  const [isVipLoading, setIsVipLoading] = useState(false);
  const [vipTab, setVipTab] = useState<VIPTabSelection>("scene");

  const [profileCardStyle, setProfileCardStyle] =
    useState<"classic" | "idcard">("classic");
  const [idCardStyle, setIdCardStyle] = useState<IDCardStyleKey>("officer");
  const [idCardCustomHeader, setIdCardCustomHeader] = useState("");
  const [idCardCustomBody, setIdCardCustomBody] = useState("");
  const [idCardCustomAccent, setIdCardCustomAccent] = useState("");
  const [idCardCustomBorder, setIdCardCustomBorder] = useState("");
  const [idCardShowLevel, setIdCardShowLevel] = useState(true);
  const [idCardShowXp, setIdCardShowXp] = useState(true);
  const [idCardShowHologram, setIdCardShowHologram] = useState(true);
  const [idCardShowScanlines, setIdCardShowScanlines] = useState(true);

  const initializeFromUser = useCallback((userData: Partial<UserProfile>) => {
    setUsername(userData.username || userData.name || "");
    setImage(userData.image || "");
    setBio(userData.bio || "");
    setDiscord(userData.discord || "");
    setInstagram(userData.instagram || "");
    setTwitter(userData.twitter || "");
  }, []);

  const initializeFromVIP = useCallback((vipData: Partial<UserProfile>) => {
    setIsVIP(!!vipData.isVIP);
    setProfileSceneId(vipData.sceneId || "pallet-hideout");
    setProfileSceneEffect(vipData.sceneEffect || "none");
    setVipNameColor(vipData.vipNameColor || "#ff69b4");
    setVipFont(vipData.vipFont || "default");
    setVipBadge(vipData.vipBadge || "");
    setVipGlow(!!vipData.vipGlow);
    setVipNameEffect(vipData.vipNameEffect || "");
    setVipNameGradient(vipData.vipNameGradient || "");
    setVipProfileBg(vipData.vipProfileBg || "");
    setVipProfileBanner(vipData.vipProfileBanner || "");
    setVipProfileAccent(vipData.vipProfileAccent || "");
    setVipProfileBorder(vipData.vipProfileBorder || "");
    setVipProfileGlow(vipData.vipProfileGlow || "");
    setVipCardNameColor(vipData.vipCardNameColor || "");
    setVipCardNameGradient(vipData.vipCardNameGradient || "");
    setVipCardNameGlow(!!vipData.vipCardNameGlow);
    setProfileCardStyle(
      vipData.profileCardStyle === "idcard" ? "idcard" : "classic",
    );
    setIdCardStyle((vipData.idCardStyle as IDCardStyleKey) || "officer");
    setIdCardCustomHeader(vipData.idCardCustomHeader || "");
    setIdCardCustomBody(vipData.idCardCustomBody || "");
    setIdCardCustomAccent(vipData.idCardCustomAccent || "");
    setIdCardCustomBorder(vipData.idCardCustomBorder || "");
    setIdCardShowLevel(vipData.idCardShowLevel !== false);
    setIdCardShowXp(vipData.idCardShowXp !== false);
    setIdCardShowHologram(vipData.idCardShowHologram !== false);
    setIdCardShowScanlines(vipData.idCardShowScanlines !== false);
  }, []);

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (file.size > 500000) {
        addToast({
          type: "error",
          title: "File Too Large",
          message: "Please use an image under 500KB.",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [addToast],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setIsLoading(true);
      setMessage("");

      if (!username || username.trim().length === 0) {
        setMessage("Username is required");
        setIsLoading(false);
        return;
      }

      if (username.length < 3 || username.length > 20) {
        setMessage("Username must be between 3 and 20 characters");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/user", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            image: image || null,
            bio: bio || null,
            discord: discord || null,
            instagram: instagram || null,
            twitter: twitter || null,
          }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error || "Failed to update profile");
        }

        const updatedUser = (await response.json()) as Partial<UserProfile>;

        setProfile((previous) => ({
          ...previous,
          ...updatedUser,
          name:
            updatedUser.username ||
            updatedUser.name ||
            previous.username ||
            previous.name,
          username:
            updatedUser.username || updatedUser.name || previous.username,
        }));

        await update({
          name: updatedUser.username || username,
          image: `/api/avatar/${updatedUser.username || username}?t=${Date.now()}`,
        });

        setMessage("Profile updated successfully!");

        if (updatedUser.username && updatedUser.username !== usernameParam) {
          router.push(`/profile/${updatedUser.username}`);
        } else {
          router.refresh();
        }
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      username,
      image,
      bio,
      discord,
      instagram,
      twitter,
      usernameParam,
      setProfile,
      update,
      router,
    ],
  );

  const handlePasswordChange = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setPasswordMessage("");

      if (newPassword !== confirmPassword) {
        setPasswordMessage("Passwords do not match!");
        return;
      }

      if (newPassword.length < 6) {
        setPasswordMessage("Password must be at least 6 characters!");
        return;
      }

      setIsPasswordLoading(true);
      try {
        const response = await fetch("/api/user/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to update password");
        }

        setPasswordMessage("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (error) {
        setPasswordMessage(
          error instanceof Error ? error.message : "Something went wrong",
        );
      } finally {
        setIsPasswordLoading(false);
      }
    },
    [currentPassword, newPassword, confirmPassword],
  );

  const handleVIPSave = useCallback(async () => {
    setIsVipLoading(true);
    setVipMessage("");

    try {
      const response = await fetch("/api/user/vip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileSceneId,
          profileSceneEffect,
          vipNameColor,
          vipFont,
          vipBadge,
          vipGlow,
          vipNameEffect,
          vipNameGradient,
          vipProfileBg,
          vipProfileBanner,
          vipProfileAccent,
          vipProfileBorder,
          vipProfileGlow,
          vipCardNameColor,
          vipCardNameGradient,
          vipCardNameGlow,
          profileCardStyle,
          idCardStyle,
          idCardCustomHeader,
          idCardCustomBody,
          idCardCustomAccent,
          idCardCustomBorder,
          idCardShowLevel,
          idCardShowXp,
          idCardShowHologram,
          idCardShowScanlines,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save VIP settings");
      }

      const updatedVip = (await response.json()) as Partial<UserProfile> & {
        profileSceneId?: ProfileSceneId;
        profileSceneEffect?: ProfileSceneEffectId;
      };

      setProfile((previous) => ({
        ...previous,
        ...updatedVip,
        sceneId:
          updatedVip.profileSceneId || updatedVip.sceneId || previous.sceneId,
        sceneEffect:
          updatedVip.profileSceneEffect ||
          updatedVip.sceneEffect ||
          previous.sceneEffect,
      }));

      setVipMessage("Hideout settings saved successfully!");
    } catch (error) {
      setVipMessage(
        error instanceof Error
          ? error.message
          : "Failed to save VIP settings",
      );
    } finally {
      setIsVipLoading(false);
    }
  }, [
    profileSceneId,
    profileSceneEffect,
    vipNameColor,
    vipFont,
    vipBadge,
    vipGlow,
    vipNameEffect,
    vipNameGradient,
    vipProfileBg,
    vipProfileBanner,
    vipProfileAccent,
    vipProfileBorder,
    vipProfileGlow,
    vipCardNameColor,
    vipCardNameGradient,
    vipCardNameGlow,
    profileCardStyle,
    idCardStyle,
    idCardCustomHeader,
    idCardCustomBody,
    idCardCustomAccent,
    idCardCustomBorder,
    idCardShowLevel,
    idCardShowXp,
    idCardShowHologram,
    idCardShowScanlines,
    setProfile,
  ]);

  return {
    profileForm: {
      username,
      setUsername,
      image,
      setImage,
      bio,
      setBio,
      discord,
      setDiscord,
      instagram,
      setInstagram,
      twitter,
      setTwitter,
      isLoading,
      message,
      fileInputRef,
    },
    passwordForm: {
      currentPassword,
      setCurrentPassword,
      newPassword,
      setNewPassword,
      confirmPassword,
      setConfirmPassword,
      passwordMessage,
      isPasswordLoading,
    },
    vipSettings: {
      isVIP,
      profileSceneId,
      setProfileSceneId,
      profileSceneEffect,
      setProfileSceneEffect,
      vipNameColor,
      setVipNameColor,
      vipFont,
      setVipFont,
      vipBadge,
      setVipBadge,
      vipGlow,
      setVipGlow,
      vipNameEffect,
      setVipNameEffect,
      vipNameGradient,
      setVipNameGradient,
      vipProfileBg,
      setVipProfileBg,
      vipProfileBanner,
      setVipProfileBanner,
      vipProfileAccent,
      setVipProfileAccent,
      vipProfileBorder,
      setVipProfileBorder,
      vipProfileGlow,
      setVipProfileGlow,
      vipCardNameColor,
      setVipCardNameColor,
      vipCardNameGradient,
      setVipCardNameGradient,
      vipCardNameGlow,
      setVipCardNameGlow,
      vipMessage,
      isVipLoading,
      vipTab,
      setVipTab,
    },
    idCardSettings: {
      profileCardStyle,
      setProfileCardStyle,
      idCardStyle,
      setIdCardStyle,
      idCardCustomHeader,
      setIdCardCustomHeader,
      idCardCustomBody,
      setIdCardCustomBody,
      idCardCustomAccent,
      setIdCardCustomAccent,
      idCardCustomBorder,
      setIdCardCustomBorder,
      idCardShowLevel,
      setIdCardShowLevel,
      idCardShowXp,
      setIdCardShowXp,
      idCardShowHologram,
      setIdCardShowHologram,
      idCardShowScanlines,
      setIdCardShowScanlines,
    },
    handlers: {
      handleImageUpload,
      handleSubmit,
      handlePasswordChange,
      handleVIPSave,
      initializeFromUser,
      initializeFromVIP,
    },
    currentTheme,
  };
}
