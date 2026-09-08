import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import SignalChart from './SignalChart';

const DetailBox = ({ label, value, color = "text-zinc-900 dark:text-white", highlight = false }: any) => (
  <div className={`p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] ${highlight ? 'border-orange-500/20 bg-orange-500/[0.02]' : ''}`}>
    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">{label}</p>
    <p className={`text-[11px] font-bold truncate tracking-tight ${color}`}>{value}</p>
  </div>
);

const PriceRow = ({ label, value, color, isFilled }: any) => (
  <div className="flex justify-between items-center py-2 border-b border-[var(--glass-border)] last:border-0">
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</span>
      {isFilled && (
        <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          ✓ FILLED
        </span>
      )}
    </div>
    <span className={`font-mono text-xs md:text-[13px] font-extrabold ${color}`}>{Number(value || 0).toFixed(5)}</span>
  </div>
);

export default function SignalModal({ signal, onClose }: { signal: any, onClose: () => void }) {
  const [showDetails, setShowDetails] = useState(true);

  if (!signal) return null;

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isBuy = signal.side?.toUpperCase() === 'BUY' || signal.side?.toUpperCase() === 'BULLISH';
  const isSfp = signal.trade_type?.toUpperCase() === 'SFP' || signal.type?.toUpperCase() === 'SFP' || signal.algo === 'SFP' || signal.strategy?.includes('SFP') || signal.strategy?.includes('sfp') || ('tp3' in signal) || ('tp4' in signal);

  const statusText = signal.status || 'ACTIVE';
  const statusUpper = statusText.toUpperCase();
  const isTp4Hit = statusUpper.includes('TP4') || statusUpper === 'WIN';
  const isTp3Hit = isTp4Hit || statusUpper.includes('TP3');
  const isTp2Hit = isTp3Hit || statusUpper.includes('TP2');
  const isTp1Hit = isTp2Hit || statusUpper.includes('TP') || statusUpper.includes('BE') || statusUpper.includes('PROFIT');

  // Live PnL & Live RR computation (fallback if not already attached)
  const entry = Number(signal.entry_price || 0);
  const current = Number(signal.livePrice || signal.current_price || entry);
  const sl = Number(signal.sl || 0);
  const risk = Math.abs(entry - sl);

  const pnlPercent = signal.livePnlPercent !== undefined
    ? Number(signal.livePnlPercent)
    : (entry ? ((isBuy ? (current - entry) : (entry - current)) / entry) * 100 : 0);

  const isProfit = pnlPercent >= 0;

  const liveRR = signal.liveRR !== undefined
    ? signal.liveRR
    : (risk > 0 ? `${isProfit ? '+' : ''}${(((isBuy ? current - entry : entry - current) / risk)).toFixed(2)}R` : '0.00R');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // Placed inside lg:left-72 so the modal starts cleanly AFTER the dashboard sidebar (w-72)
      className="fixed inset-y-0 right-0 left-0 lg:left-72 z-[100] flex items-center justify-center p-2 sm:p-3 md:p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg)] border border-[var(--glass-border)] w-full h-[94vh] max-h-[96vh] rounded-2xl overflow-hidden flex flex-col lg:flex-row shadow-[0_0_100px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Trade Details Sidebar (Clean, dedicated fixed width starting AFTER main sidebar) */}
        <AnimatePresence initial={false}>
          {showDetails && (
            <motion.div
              key="signal-details-sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full lg:w-[280px] xl:w-[310px] shrink-0 p-4 md:p-5 overflow-y-auto max-h-[38vh] lg:max-h-full h-auto lg:h-full border-b lg:border-b-0 lg:border-r border-[var(--glass-border)] bg-[var(--bg-surface)]/80 flex flex-col justify-between relative"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-orange-500/5 blur-[80px] pointer-events-none" />

              <div>
                <div className="flex justify-between items-start mb-3.5">
                  <div className="relative z-10">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground drop-shadow-sm">{signal.symbol}</h2>
                    <p className="text-[9px] text-orange-500 font-bold tracking-widest mt-0.5">{isSfp ? 'SFP ALGO SETUP' : 'CRT NEURAL SETUP'}</p>
                  </div>
                  <button 
                    onClick={onClose} 
                    className="lg:hidden p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                    title="Close"
                  >
                    <X size={18} className="text-zinc-500" />
                  </button>
                </div>

                {/* Status Display matching Active Card */}
                <div className="bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl p-2.5 mb-3 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <Activity size={12} className="text-orange-500 animate-pulse" /> Status
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                    statusUpper.includes('SL HIT')
                      ? 'text-red-500 animate-pulse'
                      : isTp2Hit
                        ? 'text-emerald-400 font-black'
                        : isTp1Hit
                          ? 'text-emerald-500'
                          : 'text-orange-500'
                  }`}>
                    {statusText}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <DetailBox label="Setup Time" value={signal.created_at ? new Date(signal.created_at).toLocaleTimeString() : 'Recent'} />
                  <DetailBox label="Confluences" value={signal.confluences || 'Bias Confirmed'} />
                </div>

                {/* Live Realtime RR & PnL Box matching Active Card */}
                <div className={`mb-3 p-2.5 rounded-xl border flex justify-between items-center transition-all duration-300 ${
                  isProfit ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className="flex flex-col">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-0.5">
                      <Activity size={11} className={isProfit ? 'text-emerald-500' : 'text-red-500'} /> Live PnL
                    </div>
                    <span className={`text-xs font-bold font-mono ${isProfit ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                      {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                  <span className={`text-sm md:text-base font-extrabold font-mono tracking-tight ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
                    {liveRR}
                  </span>
                </div>

                <div className="space-y-0.5 border-t border-[var(--glass-border)] pt-3">
                  <PriceRow label="ENTRY ZONE" value={signal.entry_price} color="text-orange-500" />
                  
                  {isTp1Hit ? (
                    <div className="flex justify-between items-center py-2 border-b border-[var(--glass-border)] last:border-0">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                          STOP LOSS (BE)
                        </span>
                        <span className="text-[8px] text-zinc-500 font-mono">ORIGINAL: {Number(signal.sl || 0).toFixed(5)}</span>
                      </div>
                      <span className="font-mono text-xs md:text-[13px] font-extrabold text-emerald-500">
                        {Number(signal.entry_price || 0).toFixed(5)}
                      </span>
                    </div>
                  ) : (
                    <PriceRow label="STOP LOSS" value={signal.sl} color="text-red-500" />
                  )}

                  {isSfp ? (
                    <>
                      <PriceRow label="TP 1 (2RR)" value={signal.tp} color="text-emerald-500" isFilled={isTp1Hit} />
                      <PriceRow label="TP 2 (2.5RR)" value={signal.tp2} color="text-emerald-500" isFilled={isTp2Hit} />
                      <PriceRow label="TP 3 (4RR)" value={signal.tp3} color="text-emerald-500" isFilled={isTp3Hit} />
                      <PriceRow label="TP 4 (4.5RR)" value={signal.tp4} color="text-emerald-500" isFilled={isTp4Hit} />
                    </>
                  ) : (
                    <>
                      <PriceRow label="TP 1 (EQ)" value={signal.tp} color="text-emerald-500" isFilled={isTp1Hit} />
                      <PriceRow label="TP 2 (TARGET)" value={signal.tp_secondary} color="text-emerald-500" isFilled={isTp2Hit} />
                    </>
                  )}
                </div>
              </div>

              {/* Quick Footer hint */}
              <div className="pt-2.5 border-t border-[var(--glass-border)] mt-2.5 text-[9px] text-zinc-500 flex items-center justify-between">
                <span className="font-mono text-orange-500/80">PRO TERMINAL VIEW</span>
                <span className="text-zinc-400">ESC to close</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Expansive Pro Chart Area */}
        <div className="flex-1 min-w-0 h-[62vh] lg:h-full bg-[var(--bg)] relative flex flex-col">
          {/* Top Bar for Chart */}
          <div className="h-12 px-3 sm:px-4 border-b border-[var(--glass-border)] bg-[var(--bg-surface)]/70 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {/* Sidebar toggle button to give full width to the chart */}
              <button
                type="button"
                onClick={() => setShowDetails((prev) => !prev)}
                title={showDetails ? "Hide Trade Details Sidebar" : "Show Trade Details Sidebar"}
                className="p-1.5 rounded-lg bg-[var(--input-bg)] hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 border border-[var(--glass-border)]"
              >
                {showDetails ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
                <span className="hidden sm:inline text-[10px] font-bold">{showDetails ? 'Hide Panel' : 'Trade Details'}</span>
              </button>

              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase border ${
                isBuy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}>
                {isBuy ? 'LONG' : 'SHORT'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/30 flex items-center gap-1.5 whitespace-nowrap">
                <Activity size={10} className="animate-pulse" /> LIVE INTELLIGENCE
              </span>
              {(signal.tf_alignment || signal.tf) && (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-zinc-800/90 text-orange-400 border border-orange-500/20 whitespace-nowrap">
                  TF: {signal.tf_alignment || signal.tf}
                </span>
              )}
              {statusText && (
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider border flex items-center gap-1.5 whitespace-nowrap ${
                  statusUpper.includes('SL HIT')
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : isTp2Hit
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : isTp1Hit
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-800/80 text-zinc-300 border-[var(--glass-border)]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    statusUpper.includes('SL HIT')
                      ? 'bg-red-500 animate-pulse'
                      : isTp2Hit
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : isTp1Hit
                          ? 'bg-emerald-400'
                          : 'bg-orange-500 animate-pulse'
                  }`} />
                  {statusText}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                title="Close Chart (Esc)"
                className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-all text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Full Height & Full Width Pro-Grade Chart Container */}
          <div className="flex-1 w-full min-h-0 relative">
            <SignalChart symbol={signal.symbol} signal={signal} className="w-full h-full rounded-none border-0" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
