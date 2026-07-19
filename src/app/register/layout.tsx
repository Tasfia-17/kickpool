import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create Account | CinePurr",
    description: "Create a free CinePurr account to watch movies and videos together with friends in real-time.",
};

export default function RegisterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
