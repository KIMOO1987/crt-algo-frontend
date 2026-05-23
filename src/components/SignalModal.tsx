import { motion } from 'framer-motion';
import { X, Activity } from 'lucide-react';
import SignalChart from './SignalChart';

const DetailBox = ({ label, value, color = "text-zinc-900 dark:text-white", highlight = false }: any) => (
  <div className={`p-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] ${highlight ? 'border-blue-500/20 bg-blue-500/[0.02]' : ''}`}>
    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">{label}</p>
    <p className={`text-[11px] font-bold truncate tracking-tight ${color}`}>{value}</p>
  </div>
);

const PriceRow = ({ label, value, color }: any) => (
  <div className="flex justify-between items-center py-3 border-b border-[var(--glass-border)] last:border-0">
    <span className="text-[9px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{label}</span>
    <span className={`font-mono text-sm font-black ${color}`}>{Number(value || 0).toFixed(5)}</span>
  </div>
);

export default function SignalModal({ signal, onClose }: { signal: any, onClose: () => void }) {
  if (!signal) return null;
  const isBuy = signal.side?.toUpperCase() === 'BUY' || signal.side?.toUpperCase() === 'BULLISH';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/80 backdrop-blur-2xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-gradient-to-br from-[#0a0c10] to-[#030407] border border-[var(--glass-border)] w-full max-w-6xl rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row shadow-[0_0_100px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lg:w-[35%] p-8 overflow-y-auto max-h-[50vh] lg:max-h-none border-b lg:border-b-0 lg:border-r border-[var(--glass-border)] relative">
          <div className="absolute top-0 left-0 w-full h-full bg-blue-500/5 blur-[100px] pointer-events-none" />
          <div className="flex justify-between items-start mb-8">
            <div className="relative z-10">
              <h2 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white drop-shadow-md">{signal.symbol}</h2>
              <p className="text-[10px] text-blue-500 font-bold tracking-[0.2em] mt-1">CRT NEURAL SETUP</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X size={20} className="text-zinc-600 dark:text-zinc-500" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <DetailBox label="Setup Time" value={new Date(signal.created_at).toLocaleTimeString()} />
            <DetailBox label="Confluences" value={signal.confluences || 'Institutional Bias Confirmed'} />
          </div>
          <div className="space-y-3">
            <PriceRow label="ENTRY ZONE" value={signal.entry_price} color="text-blue-400" />
            <PriceRow label="STOP LOSS" value={signal.sl} color="text-red-400" />
            <PriceRow label="TP 1 (EQ)" value={signal.tp} color="text-green-400" />
            <PriceRow label="TP 2 (TARGET)" value={signal.tp_secondary} color="text-green-400" />
          </div>
        </div>
        <div className="lg:w-[65%] bg-[var(--input-bg)] relative flex flex-col min-h-[450px]">
          <div className="absolute top-6 left-6 z-10 flex gap-2">
            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest shadow-lg ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>{isBuy ? 'LONG' : 'SHORT'}</span>
            <span className="px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-2 shadow-lg"><Activity size={12} /> LIVE INTELLIGENCE</span>
          </div>
          <SignalChart symbol={signal.symbol} signal={signal} />
        </div>
      </motion.div>
    </motion.div>
  );
}
