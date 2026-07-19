import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In | KickPool",
    description: "Sign in to your KickPool account to watch movies and videos together with friends.",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
