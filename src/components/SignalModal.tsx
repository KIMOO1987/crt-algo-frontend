import { motion } from 'framer-motion';
import { X, Activity } from 'lucide-react';
import SignalChart from './SignalChart';

const DetailBox = ({ label, value, color = "text-zinc-900 dark:text-white", highlight = false }: any) => (
  <div className={`p-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] ${highlight ? 'border-orange-500/20 bg-orange-500/[0.02]' : ''}`}>
    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-[12px] font-bold truncate tracking-tight ${color}`}>{value}</p>
  </div>
);

const PriceRow = ({ label, value, color }: any) => (
  <div className="flex justify-between items-center py-3.5 border-b border-[var(--glass-border)] last:border-0">
    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</span>
    <span className={`font-mono text-sm font-extrabold ${color}`}>{Number(value || 0).toFixed(5)}</span>
  </div>
);

export default function SignalModal({ signal, onClose }: { signal: any, onClose: () => void }) {
  if (!signal) return null;
  const isBuy = signal.side?.toUpperCase() === 'BUY' || signal.side?.toUpperCase() === 'BULLISH';

  const isSfp = signal.strategy?.includes('SFP') || signal.strategy?.includes('sfp') || ('tp3' in signal) || ('tp4' in signal);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 15 }}
        className="bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg)] border border-[var(--glass-border)] w-full max-w-6xl rounded-2xl overflow-hidden flex flex-col lg:flex-row shadow-[0_0_80px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lg:w-[35%] p-6 md:p-8 overflow-y-auto max-h-[50vh] lg:max-h-none border-b lg:border-b-0 lg:border-r border-[var(--glass-border)] relative">
          <div className="absolute top-0 left-0 w-full h-full bg-orange-500/5 blur-[80px] pointer-events-none" />
          <div className="flex justify-between items-start mb-6">
            <div className="relative z-10">
              <h2 className="text-2xl font-extrabold tracking-tight uppercase text-foreground drop-shadow-sm">{signal.symbol}</h2>
              <p className="text-[10px] text-orange-500 font-bold tracking-widest mt-1">{isSfp ? 'SFP ALGO SETUP' : 'CRT NEURAL SETUP'}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer"><X size={18} className="text-zinc-500" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <DetailBox label="Setup Time" value={new Date(signal.created_at).toLocaleTimeString()} />
            <DetailBox label="Confluences" value={signal.confluences || 'Bias Confirmed'} />
          </div>
          <div className="space-y-1 border-t border-[var(--glass-border)] pt-4">
            <PriceRow label="ENTRY ZONE" value={signal.entry_price} color="text-orange-500" />
            <PriceRow label="STOP LOSS" value={signal.sl} color="text-red-500" />
            {isSfp ? (
              <>
                <PriceRow label="TP 1 (2RR)" value={signal.tp} color="text-emerald-500" />
                <PriceRow label="TP 2 (2.5RR)" value={signal.tp2} color="text-emerald-500" />
                <PriceRow label="TP 3 (4RR)" value={signal.tp3} color="text-emerald-500" />
                <PriceRow label="TP 4 (4.5RR)" value={signal.tp4} color="text-emerald-500" />
              </>
            ) : (
              <>
                <PriceRow label="TP 1 (EQ)" value={signal.tp} color="text-emerald-500" />
                <PriceRow label="TP 2 (TARGET)" value={signal.tp_secondary} color="text-emerald-500" />
              </>
            )}
          </div>
        </div>
        <div className="lg:w-[65%] bg-[var(--bg)] relative flex flex-col min-h-[450px]">
          <div className="absolute top-6 left-6 z-10 flex gap-2">
            <span className={`px-3 py-1 rounded-lg text-[9px] font-extrabold tracking-wider shadow-sm border ${isBuy ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{isBuy ? 'LONG' : 'SHORT'}</span>
            <span className="px-3 py-1 rounded-lg text-[9px] font-extrabold tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/30 flex items-center gap-1.5 shadow-sm"><Activity size={11} /> LIVE INTELLIGENCE</span>
          </div>
          <SignalChart symbol={signal.symbol} signal={signal} />
        </div>
      </motion.div>
    </motion.div>
  );
}
