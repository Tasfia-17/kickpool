import { ImageResponse } from "next/og";
import {
  getFeaturedWatchForUser,
  getPassportBookForUser,
  getRawProfileRecordByUsername,
  getResolvedShowcaseSlots,
  resolveProfileSceneEffect,
  resolveProfileSceneId,
} from "@/lib/profileData";
import { getProfileScene, getProfileSceneEffect } from "@/lib/profileScenes";

export const runtime = "nodejs";
export const revalidate = 86400;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const baseUrl =
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://cinepurr.me";

export default async function ProfileOGImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);
  const user = await getRawProfileRecordByUsername(username);

  if (!user) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #1f1720, #09090b)",
            color: "white",
            fontSize: 44,
            fontWeight: 700,
          }}
        >
          CinePurr Hideout
        </div>
      ),
      size,
    );
  }

  const scene = getProfileScene(resolveProfileSceneId(user));
  const effect = getProfileSceneEffect(resolveProfileSceneEffect(user));
  const passportBook = await getPassportBookForUser(user);
  const showcaseSlots = await getResolvedShowcaseSlots(user, passportBook);
  const featuredWatch = await getFeaturedWatchForUser(user.id);
  const featuredShowcase = showcaseSlots.find((slot) => slot.itemType) || showcaseSlots[0];
  const avatarUrl =
    user.image && user.image.startsWith("http")
      ? user.image
      : `${baseUrl}/api/avatar/${encodeURIComponent(user.username)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: scene.background,
          color: scene.text,
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: effect.overlay,
            opacity: 0.92,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 26,
            top: 26,
            right: 26,
            bottom: 26,
            display: "flex",
            border: `8px solid ${scene.border}`,
            borderRadius: 26,
            background: scene.panel,
            boxShadow: "12px 12px 0 rgba(0,0,0,0.24)",
          }}
        >
          <div
            style={{
              width: 410,
              display: "flex",
              flexDirection: "column",
              padding: 34,
              borderRight: `6px solid ${scene.border}`,
              background: scene.panelSoft,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 18,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              <span>CinePurr Passport</span>
              <span>{scene.label}</span>
            </div>

            <div
              style={{
                marginTop: 28,
                width: 188,
                height: 188,
                borderRadius: 28,
                overflow: "hidden",
                border: `6px solid ${scene.accent}`,
                background: scene.desk,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={user.username}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1 }}>{user.username}</div>
              <div style={{ fontSize: 22, opacity: 0.8 }}>
                {user.activeTitle || (user.isFounder ? "Founder" : user.isVIP ? "VIP Member" : "Member")}
              </div>
            </div>

            <div style={{ marginTop: 26, display: "flex", gap: 22 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 36, fontWeight: 800 }}>{user.level}</span>
                <span style={{ fontSize: 14, letterSpacing: 2, opacity: 0.75 }}>LEVEL</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 36, fontWeight: 800 }}>
                  {Math.floor((user.watchTime ?? 0) / 3600)}h
                </span>
                <span style={{ fontSize: 14, letterSpacing: 2, opacity: 0.75 }}>WATCHED</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 36, fontWeight: 800 }}>{passportBook.length}</span>
                <span style={{ fontSize: 14, letterSpacing: 2, opacity: 0.75 }}>STAMPS</span>
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: 34,
            }}
          >
            <div style={{ display: "flex", gap: 22 }}>
              <div
                style={{
                  flex: 1,
                  border: `6px solid ${scene.accent}`,
                  borderRadius: 24,
                  padding: 24,
                  background: scene.screen,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span style={{ fontSize: 16, letterSpacing: 3, textTransform: "uppercase", opacity: 0.7 }}>
                  Now Screening
                </span>
                <div style={{ marginTop: 18, fontSize: 34, fontWeight: 800, lineHeight: 1.2 }}>
                  {featuredWatch?.videoTitle || "No reel spinning right now"}
                </div>
                <span style={{ marginTop: 16, fontSize: 18, opacity: 0.72 }}>
                  {featuredWatch
                    ? featuredWatch.kind === "live"
                      ? "Live right now"
                      : `Last watched ${new Date(featuredWatch.watchedAt).toLocaleDateString()}`
                    : "Hideout standby mode"}
                </span>
              </div>

              <div
                style={{
                  width: 260,
                  border: `6px solid ${scene.accent}`,
                  borderRadius: 24,
                  padding: 24,
                  background: scene.shelf,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span style={{ fontSize: 16, letterSpacing: 3, textTransform: "uppercase", opacity: 0.72 }}>
                  Showcase
                </span>
                <div style={{ marginTop: 18, fontSize: 48 }}>
                  {featuredShowcase?.emoji || "✦"}
                </div>
                <div style={{ marginTop: 14, fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>
                  {featuredShowcase?.title || "Hall of Fame Shelf"}
                </div>
                <span style={{ marginTop: 10, fontSize: 16, opacity: 0.72 }}>
                  {featuredShowcase?.subtitle || "Pinned collectible"}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
                border: `6px solid ${scene.border}`,
                borderRadius: 24,
                padding: 24,
                background: scene.desk,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <span style={{ fontSize: 16, letterSpacing: 3, textTransform: "uppercase", opacity: 0.72 }}>
                Passport Board
              </span>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {passportBook.slice(0, 4).map((stamp) => (
                  <div
                    key={stamp.id}
                    style={{
                      minWidth: 190,
                      border: `4px solid ${scene.accent}`,
                      borderRadius: 18,
                      padding: "14px 16px",
                      background: "rgba(0,0,0,0.18)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", opacity: 0.68 }}>
                      {stamp.rarity}
                    </span>
                    <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
                      {stamp.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
