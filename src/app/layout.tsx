import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Shell } from "@/components/layout/Shell";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bismillah Construction",
  description: "Web-based operations management system for Bismillah Construction",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {session ? (
            <Shell>{children}</Shell>
          ) : (
            children
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
