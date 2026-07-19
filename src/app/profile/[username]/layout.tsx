import type { Metadata } from "next";
import {
  getRawProfileRecordByUsername,
  resolveProfileSceneEffect,
  resolveProfileSceneId,
} from "@/lib/profileData";
import { getProfileScene, getProfileSceneEffect } from "@/lib/profileScenes";

const baseUrl =
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://cinepurr.me";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);
  const user = await getRawProfileRecordByUsername(username);

  const scene = user
    ? getProfileScene(resolveProfileSceneId(user))
    : getProfileScene("pallet-hideout");
  const effect = user
    ? getProfileSceneEffect(resolveProfileSceneEffect(user))
    : getProfileSceneEffect("none");

  const title = user
    ? `${user.username} · ${scene.label} Hideout`
    : `${username}'s Hideout`;
  const description = user
    ? `${user.activeTitle ? `${user.activeTitle}. ` : ""}${scene.vibe}. ${effect.label} variant on CinePurr with ${user.unlockedBadges.length} badges and ${user.unlockedThemes.length} themes collected.`
    : `Visit ${username}'s CinePurr hideout and collection.`;

  const profileUrl = `${baseUrl}/profile/${encodeURIComponent(username)}`;
  const ogImageUrl = `${profileUrl}/opengraph-image`;

  return {
    title,
    description,
    alternates: {
      canonical: profileUrl,
    },
    openGraph: {
      type: "profile",
      url: profileUrl,
      title,
      description,
      siteName: "CinePurr",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${username}'s CinePurr hideout`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
      creator: "@cinepurr",
    },
  };
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
