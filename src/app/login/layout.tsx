import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In | CinePurr",
    description: "Sign in to your CinePurr account to watch movies and videos together with friends.",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
