"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface Option {
  v: string;
  l: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
}

export default function CustomSelect({
  label,
  value,
  onChange,
  options,
  icon,
  placeholder = "Select option...",
  className = "",
  containerClassName = ""
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.v === value);
  const displayLabel = selectedOption ? selectedOption.l : placeholder;

  return (
    <div className={`relative flex flex-col w-full ${containerClassName}`} ref={dropdownRef}>
      {label && (
        <span className="text-[9px] font-black uppercase opacity-70 tracking-widest mb-1.5 ml-2 block">
          {label}
        </span>
      )}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 focus:border-blue-500/40 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] rounded-xl px-4 flex items-center justify-between text-xs font-mono font-bold text-zinc-900 dark:text-white transition-all duration-300 h-[42px] cursor-pointer ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="opacity-60 shrink-0 flex items-center">{icon}</span>}
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown size={14} className={`text-zinc-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Options Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 mt-2 bg-[#0d0f14]/95 border border-white/[0.08] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-[999] overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
            style={{ top: '100%' }}
          >
            <div className="py-1">
              {options.map((opt) => {
                const isSelected = opt.v === value;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => {
                      onChange(opt.v);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 hover:bg-white/[0.05] transition-colors flex items-center justify-between text-left font-mono text-xs ${
                      isSelected 
                        ? 'text-blue-400 font-black bg-blue-500/[0.03]' 
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    <span className="truncate">{opt.l}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
