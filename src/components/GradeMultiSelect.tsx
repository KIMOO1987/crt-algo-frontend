"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Filter } from 'lucide-react';

interface GradeMultiSelectProps {
  selectedGrades: string[];
  onChange: (selected: string[]) => void;
}

const GRADE_OPTIONS = ["A++", "A+", "GOOD", "NORMAL"];

export default function GradeMultiSelect({
  selectedGrades,
  onChange
}: GradeMultiSelectProps) {
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

  const toggleGrade = (grade: string) => {
    if (selectedGrades.includes(grade)) {
      onChange(selectedGrades.filter(g => g !== grade));
    } else {
      onChange([...selectedGrades, grade]);
    }
  };

  const handleSelectAll = () => {
    onChange([...GRADE_OPTIONS]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="text-[9px] font-black text-zinc-605 dark:text-zinc-400 uppercase ml-2 tracking-widest block mb-1">
        Grade Checklist
      </label>
      
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none flex items-center justify-between focus:border-blue-500/50 hover:border-white/20 transition-all cursor-pointer h-[42px]"
      >
        <div className="flex items-center gap-2 truncate">
          <Filter size={12} className="text-zinc-550 dark:text-zinc-400 shrink-0" />
          <span className="truncate uppercase">
            {selectedGrades.length === 0 
              ? "ALL GRADES" 
              : selectedGrades.length === GRADE_OPTIONS.length 
              ? `ALL (${GRADE_OPTIONS.length})` 
              : `${selectedGrades.length} SELECTED`}
          </span>
        </div>
        <ChevronDown size={14} className={`text-zinc-550 dark:text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 mt-2 w-full bg-zinc-950/95 border border-[var(--glass-border)] rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-[99] overflow-hidden"
          >
            {/* Quick Actions */}
            <div className="flex justify-between items-center px-4 py-2 bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase tracking-wider text-zinc-500">
              <button
                type="button"
                onClick={handleSelectAll}
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="hover:text-red-400 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>

            {/* Grades Checklist List */}
            <div className="max-h-60 overflow-y-auto py-2 custom-scrollbar">
              {GRADE_OPTIONS.map((grade) => {
                const isChecked = selectedGrades.includes(grade);
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => toggleGrade(grade)}
                    className="w-full px-4 py-2 hover:bg-white/[0.05] transition-colors flex items-center justify-between text-left font-mono text-[11px] cursor-pointer"
                  >
                    <span className={`font-bold ${isChecked ? 'text-blue-400 font-black' : 'text-zinc-400 dark:text-zinc-500'}`}>
                      {grade}
                    </span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      isChecked 
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                        : 'border-white/20 text-transparent'
                    }`}>
                      <Check size={10} strokeWidth={4} />
                    </div>
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
