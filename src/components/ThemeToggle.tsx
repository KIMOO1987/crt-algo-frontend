"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className || "fixed bottom-6 right-6 z-50 p-4 rounded-full glass-panel border border-[var(--glass-border)] shadow-xl flex items-center justify-center transition-all group"}
      aria-label="Toggle Theme"
    >
      <div className="relative flex items-center justify-center w-6 h-6">
        <motion.div
          initial={false}
          animate={{ rotate: isDark ? 180 : 0, scale: isDark ? 0 : 1, opacity: isDark ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          className="absolute"
        >
          <Sun className="text-amber-500 group-hover:drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" size={20} />
        </motion.div>
        <motion.div
          initial={false}
          animate={{ rotate: isDark ? 0 : -180, scale: isDark ? 1 : 0, opacity: isDark ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute"
        >
          <Moon className="text-blue-400 group-hover:drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]" size={20} />
        </motion.div>
      </div>
    </motion.button>
  );
}
