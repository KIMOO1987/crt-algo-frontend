import type { Metadata, Viewport } from "next"; // Added Viewport import
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// CRITICAL: This ensures the mobile browser respects the device width
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050505",
};

export const metadata: Metadata = {
  title: "KIMOO CRT | Institutional Execution",
  description: "Advanced Trade Execution Terminal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-blue-500/30 overflow-x-hidden`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {/* Premium Ambient Background (Dynamic Theme Adaptability) */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 perspective-1000">
          {/* Purple Glow */}
          <div 
            className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-fuchsia-500/8 dark:bg-fuchsia-600/15 blur-[120px] rounded-full mix-blend-normal dark:mix-blend-screen animate-pulse"
            style={{ animationDuration: '12s' }}
          />
          {/* Indigo/Violet Glow */}
          <div 
            className="absolute top-[30%] -right-[10%] w-[45%] h-[45%] bg-indigo-500/8 dark:bg-indigo-600/12 blur-[130px] rounded-full mix-blend-normal dark:mix-blend-screen animate-pulse"
            style={{ animationDuration: '16s', animationDelay: '3s' }}
          />
          {/* Warm Bronze/Orange Glow */}
          <div 
            className="absolute -bottom-[10%] left-[15%] w-[40%] h-[40%] bg-amber-500/6 dark:bg-amber-500/10 blur-[110px] rounded-full mix-blend-normal dark:mix-blend-screen animate-pulse"
            style={{ animationDuration: '14s', animationDelay: '5s' }}
          />
        </div>
        
        {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
