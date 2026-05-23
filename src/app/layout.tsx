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
        {/* 3D Ambient Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 perspective-1000">
          {/* Main Glow - Vibrant Pink/Purple */}
          <div 
            className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-fuchsia-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          {/* Secondary Glow - Vibrant Violet */}
          <div 
            className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] bg-violet-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse"
            style={{ animationDuration: '10s', animationDelay: '2s' }}
          />
          {/* Subtle Bottom Glow - Vibrant Orange/Amber */}
          <div 
            className="absolute -bottom-[20%] left-[20%] w-[40%] h-[40%] bg-amber-500/15 blur-[100px] rounded-full mix-blend-screen animate-pulse"
            style={{ animationDuration: '12s', animationDelay: '4s' }}
          />
        </div>
        
        {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
