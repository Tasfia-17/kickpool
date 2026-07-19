import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { Outfit } from "next/font/google";
import { authOptions } from "@/lib/auth";
import { getProfileViewByUsername } from "@/lib/profileData";
import ProfileClient from "./ProfileClient";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const [{ username: rawUsername }, session] = await Promise.all([
    params,
    getServerSession(authOptions),
  ]);
  const username = decodeURIComponent(rawUsername);
  const profile = await getProfileViewByUsername({
    username,
    viewer: session?.user
      ? {
          id: (session.user as { id?: string }).id,
          username: session.user.name,
          role: (session.user as { role?: string }).role,
        }
      : null,
  });

  if (!profile) {
    notFound();
  }

  return (
    <div className={outfit.variable}>
      <ProfileClient key={profile.username || profile.name} initialProfile={profile} />
    </div>
  );
}
