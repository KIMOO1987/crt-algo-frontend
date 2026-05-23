"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ShieldAlert, WifiOff } from 'lucide-react';
import { useEffect } from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export default function ErrorModal({ isOpen, onClose, title = "Execution Failed", message }: ErrorModalProps) {
  // Auto-close after 5 seconds for errors (slightly longer to let them read the reason)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-6 right-6 z-[110] w-80 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
        >
          <div className="bg-[#0a0a0a] border border-red-500/20 rounded-2xl overflow-hidden backdrop-blur-xl">
            {/* Header / Alert Bar */}
            <div className="bg-red-500/10 px-4 py-2 flex justify-between items-center border-b border-red-500/10">
              <div className="flex items-center gap-2">
                <ShieldAlert size={12} className="text-red-500" />
                <span className="text-[9px] font-black uppercase text-red-500 tracking-widest">System Alert</span>
              </div>
              <button onClick={onClose} className="text-zinc-600 hover:text-zinc-900 dark:text-white transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 flex-shrink-0">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black italic tracking-tighter text-zinc-900 dark:text-white leading-none mb-1">
                    {title}
                  </h3>
                  <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 leading-relaxed uppercase tracking-tight">
                    {message}
                  </p>
                </div>
              </div>

              <div className="bg-black/40 p-3 rounded-lg border border-white/5 flex items-center gap-3">
                <WifiOff size={14} className="text-zinc-700" />
                <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                  Bridge Connection Terminated
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className="h-1 bg-red-500"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}