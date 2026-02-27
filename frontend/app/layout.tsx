import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/shared/Sidebar";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { MobileSidebar } from "@/components/mobile/MobileSidebar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "PolyPact | Advanced Legal Intelligence",
  description: "AI-Powered Paralegal Platform",
};

import { AuthProvider } from "@/components/shared/AuthProvider";
import { NeuralBackground } from "@/components/shared/NeuralBackground";
import { LayoutWrapper } from "@/components/shared/LayoutWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Noto+Sans:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap" />
      </head>
      <body className={cn("antialiased bg-background text-foreground h-[100dvh] overflow-hidden flex flex-col md:flex-row relative")}>
        <NeuralBackground />

        <AuthProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
