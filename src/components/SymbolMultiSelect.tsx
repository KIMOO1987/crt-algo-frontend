"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, X, Check, Filter } from 'lucide-react';

interface SymbolMultiSelectProps {
  symbols: string[];
  selectedSymbols: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export default function SymbolMultiSelect({
  symbols,
  selectedSymbols,
  onChange,
  placeholder = "Filter Symbol..."
}: SymbolMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
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

  // Filter symbols based on search
  const filteredSymbols = symbols.filter(sym =>
    sym.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSymbol = (sym: string) => {
    if (selectedSymbols.includes(sym)) {
      onChange(selectedSymbols.filter(s => s !== sym));
    } else {
      onChange([...selectedSymbols, sym]);
    }
  };

  const handleSelectAll = () => {
    onChange([...symbols]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="relative w-full md:w-60" ref={dropdownRef}>
      <label className="text-[9px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-2 tracking-widest block mb-1">
        Symbols Checklist
      </label>
      
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none flex items-center justify-between focus:border-blue-500/50 hover:border-white/20 transition-all cursor-pointer h-[42px]"
      >
        <div className="flex items-center gap-2 truncate">
          <Filter size={12} className="text-zinc-500 shrink-0" />
          <span className="truncate">
            {selectedSymbols.length === 0 
              ? "ALL SYMBOLS" 
              : selectedSymbols.length === symbols.length 
              ? `ALL (${symbols.length})` 
              : `${selectedSymbols.length} SELECTED`}
          </span>
        </div>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 mt-2 w-full md:w-64 bg-zinc-950/95 border border-[var(--glass-border)] rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-[99] overflow-hidden"
          >
            {/* Search Input inside Dropdown */}
            <div className="p-3 border-b border-white/5 relative flex items-center">
              <Search className="absolute left-6 text-zinc-500" size={14} />
              <input
                type="text"
                placeholder="Search symbol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500/40 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-5 p-1 text-zinc-500 hover:text-zinc-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex justify-between items-center px-4 py-2 bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase tracking-wider text-zinc-500">
              <button
                type="button"
                onClick={handleSelectAll}
                className="hover:text-blue-400 transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="hover:text-red-400 transition-colors"
              >
                Clear Filters
              </button>
            </div>

            {/* Symbols Checklist List */}
            <div className="max-h-60 overflow-y-auto py-2 custom-scrollbar">
              {filteredSymbols.length === 0 ? (
                <div className="px-4 py-6 text-center text-[10px] uppercase font-bold text-zinc-600">
                  No symbols found
                </div>
              ) : (
                filteredSymbols.map((sym) => {
                  const isChecked = selectedSymbols.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleSymbol(sym)}
                      className="w-full px-4 py-2 hover:bg-white/[0.05] transition-colors flex items-center justify-between text-left font-mono text-[11px]"
                    >
                      <span className={`font-bold ${isChecked ? 'text-blue-400 font-black' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {sym}
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
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
