"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  widthClass?: string;
}

export default function CustomSelect({ label, icon, value, onChange, options, widthClass = "w-full" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = options.find(o => o.value === value) || options[0];

  return (
    <div className={`flex flex-col gap-1.5 ${widthClass} relative`} ref={ref}>
      <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider ml-1 select-none">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-modern w-full h-[42px] py-0 font-bold uppercase tracking-wider text-left flex justify-between items-center select-none text-xs pr-4 pl-4 relative cursor-pointer"
      >
        <span className="flex items-center gap-2 truncate">
          {icon && <span className="opacity-60">{icon}</span>}
          {currentOption?.label}
        </span>
        <ChevronDown size={14} className="text-zinc-550 dark:text-zinc-400 transition-transform duration-200 shrink-0" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-full bg-white dark:bg-[#0a0d14] border border-zinc-200 dark:border-white/5 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-1.5 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar select-none">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer text-left transition-all ${
                opt.value === value 
                  ? 'bg-orange-500/10 text-orange-500 font-extrabold border border-orange-500/20' 
                  : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
