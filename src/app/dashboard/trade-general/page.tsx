'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import AccessGuard from '@/components/AccessGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, AlertTriangle, TrendingUp, TrendingDown,
  BookOpen, Award, Activity, CheckSquare, Wallet,
  Percent, Save, FileText, AlertCircle, Copy, Check,
  Target, Download, Calendar, Smile, RefreshCw, History as HistoryIcon,
  Pencil
} from 'lucide-react';

interface JournalAccount {
  id: string;
  account_id_input: string;
  name: string;
  exchange: 'bybit' | 'okx' | 'mt5' | 'ctrader';
  type: 'Evaluation' | 'Funded' | 'Personal';
  starting_balance: number;
  max_drawdown: number;
  status: 'Active' | 'Passed' | 'Failed' | 'Payout Eligible';
}

interface JournalStrategy {
  id: string;
  name: string;
  timeframe: string;
  win_rate_target: number;
}

interface JournalTrade {
  id: string;
  trade_no: number;
  account_id: string;
  strategy_id: string | null;
  timeframe: string | null;
  asset: string;
  direction: 'BUY' | 'SELL';
  risk_amount: number;
  realized_rr: number;
  total_pnl: number;
  emotions: string;
  status: 'Win' | 'Loss' | 'Break-Even' | 'Active';
  created_at: string;
}

interface DailyJournal {
  id: string;
  date: string;
  htf_bias: string;
  mental_state: string;
  eod_review: string;
  rules_followed: string;
}

export default function TradeGeneralPage() {
  const { user, loading: authLoading } = useAuth();
  
  // UI states
  const [activeExchange, setActiveExchange] = useState<'bybit' | 'okx' | 'mt5' | 'ctrader'>('okx');
  const [activeAccount, setActiveAccount] = useState<JournalAccount | null>(null);
  const [journalTab, setJournalTab] = useState<'trades' | 'strategies' | 'daily'>('trades');
  
  // Data states
  const [accounts, setAccounts] = useState<JournalAccount[]>([]);
  const [strategies, setStrategies] = useState<JournalStrategy[]>([]);
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyJournal[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Resilience / DB setup state
  const [dbMissing, setDbMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  
  // Form modal states
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);

  // Form input states
  const [accountForm, setAccountForm] = useState({
    accountIdInput: '',
    name: '',
    type: 'Evaluation' as 'Evaluation' | 'Funded' | 'Personal',
    startingBalance: '',
    maxDrawdown: '',
    status: 'Active' as 'Active' | 'Passed' | 'Failed' | 'Payout Eligible'
  });

  const [tradeForm, setTradeForm] = useState({
    tradeNo: '',
    strategyId: '',
    timeframe: '15m',
    asset: '',
    direction: 'BUY' as 'BUY' | 'SELL',
    riskAmount: '',
    realizedRr: '',
    totalPnl: '',
    emotions: '',
    status: 'Active' as 'Win' | 'Loss' | 'Break-Even' | 'Active'
  });

  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);

  const [strategyForm, setStrategyForm] = useState({
    name: '',
    timeframe: '',
    winRateTarget: ''
  });

  const [dailyForm, setDailyForm] = useState({
    date: new Date().toISOString().split('T')[0],
    htfBias: 'Bullish',
    mentalState: 'Focused',
    rulesFollowed: 'Yes',
    eodReview: ''
  });

  // SQL Script to render if table is missing
  const schemaSQL = `-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.journal_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id_input TEXT NOT NULL,
    name TEXT NOT NULL,
    exchange TEXT NOT NULL CHECK (exchange IN ('bybit', 'okx', 'mt5', 'ctrader')),
    type TEXT NOT NULL CHECK (type IN ('Evaluation', 'Funded', 'Personal')),
    starting_balance NUMERIC NOT NULL DEFAULT 0,
    max_drawdown NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Passed', 'Failed', 'Payout Eligible')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.journal_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own journal accounts" ON public.journal_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.journal_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    win_rate_target NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.journal_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own journal strategies" ON public.journal_strategies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.journal_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trade_no INTEGER NOT NULL,
    account_id UUID NOT NULL REFERENCES public.journal_accounts(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES public.journal_strategies(id) ON DELETE SET NULL,
    timeframe TEXT,
    asset TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
    risk_amount NUMERIC NOT NULL DEFAULT 0,
    realized_rr NUMERIC NOT NULL DEFAULT 0,
    total_pnl NUMERIC NOT NULL DEFAULT 0,
    emotions TEXT,
    status TEXT NOT NULL CHECK (status IN ('Win', 'Loss', 'Break-Even', 'Active')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.journal_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own journal trades" ON public.journal_trades FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.journal_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    htf_bias TEXT,
    mental_state TEXT,
    eod_review TEXT,
    rules_followed TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

ALTER TABLE public.journal_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own daily journals" ON public.journal_daily FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(schemaSQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Fetch Database Data
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    setDbMissing(false);
    try {
      // 1. Fetch Accounts
      const { data: accts, error: acctErr } = await supabase
        .from('journal_accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (acctErr) {
        if (acctErr.message.includes('relation "public.journal_accounts" does not exist') || acctErr.code === 'P0001') {
          setDbMissing(true);
          setLoadingData(false);
          return;
        }
        throw acctErr;
      }

      setAccounts(accts || []);

      // 2. Fetch Strategies
      const { data: strats, error: stratErr } = await supabase
        .from('journal_strategies')
        .select('*')
        .order('name', { ascending: true });

      if (stratErr) throw stratErr;

      // Prepopulate default strategies if user has none
      if (strats && strats.length === 0) {
        const defaultStrats = [
          { user_id: user.id, name: 'CRT', timeframe: '15m', win_rate_target: 65 },
          { user_id: user.id, name: 'SFP', timeframe: '5m', win_rate_target: 60 }
        ];
        const { data: inserted, error: insertErr } = await supabase
          .from('journal_strategies')
          .insert(defaultStrats)
          .select();
        
        if (!insertErr && inserted) {
          setStrategies(inserted);
        }
      } else {
        setStrategies(strats || []);
      }

      // 3. Fetch Trades
      const { data: trds, error: tradeErr } = await supabase
        .from('journal_trades')
        .select('*')
        .order('trade_no', { ascending: false });

      if (tradeErr) throw tradeErr;
      setTrades(trds || []);

      // 4. Fetch Daily Reviews
      const { data: logs, error: logErr } = await supabase
        .from('journal_daily')
        .select('*')
        .order('date', { ascending: false });

      if (logErr) throw logErr;
      setDailyLogs(logs || []);

    } catch (e) {
      console.error('Error fetching journaling data:', e);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Set default active account when exchange changes or accounts load
  useEffect(() => {
    const exchangeAccts = accounts.filter(a => a.exchange === activeExchange);
    if (exchangeAccts.length > 0) {
      // Keep selected account if still valid for this exchange, else pick first
      const exists = exchangeAccts.find(a => a.id === activeAccount?.id);
      if (!exists) {
        setActiveAccount(exchangeAccts[0]);
      }
    } else {
      setActiveAccount(null);
    }
  }, [accounts, activeExchange, activeAccount]);

  // Calculations for active account
  const getAccountStats = useCallback((accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return { balance: 0, drawdown: 0, drawdownPercent: 0, tradesCount: 0, winRate: 0 };

    const acctTrades = trades.filter(t => t.account_id === accountId);
    const totalPnL = acctTrades.reduce((sum, t) => sum + Number(t.total_pnl), 0);
    const balance = Number(account.starting_balance) + totalPnL;

    // Drawdown represents loss below the starting capital
    const drawdown = balance < Number(account.starting_balance) 
      ? Number(account.starting_balance) - balance 
      : 0;

    const drawdownPercent = Number(account.starting_balance) > 0 
      ? (drawdown / Number(account.starting_balance)) * 100 
      : 0;

    const closedTrades = acctTrades.filter(t => t.status !== 'Active');
    const winTrades = closedTrades.filter(t => t.status === 'Win');
    const winRate = closedTrades.length > 0 
      ? (winTrades.length / closedTrades.length) * 100 
      : 0;

    return {
      balance,
      drawdown,
      drawdownPercent,
      tradesCount: acctTrades.length,
      winRate
    };
  }, [accounts, trades]);

  // Handle Account Form Submit
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accountForm.accountIdInput || !accountForm.name || !accountForm.startingBalance) return;

    try {
      const payload = {
        user_id: user.id,
        account_id_input: accountForm.accountIdInput,
        name: accountForm.name,
        exchange: activeExchange,
        type: accountForm.type,
        starting_balance: parseFloat(accountForm.startingBalance),
        max_drawdown: parseFloat(accountForm.maxDrawdown || '0'),
        status: accountForm.status
      };

      const { data, error } = await supabase
        .from('journal_accounts')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setAccounts(prev => [...prev, data]);
        setActiveAccount(data);
        setShowAccountModal(false);
        setAccountForm({
          accountIdInput: '',
          name: '',
          type: 'Evaluation',
          startingBalance: '',
          maxDrawdown: '',
          status: 'Active'
        });
      }
    } catch (err) {
      alert('Error creating account: ' + (err as any).message);
    }
  };

  // Handle Account Delete
  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('⚠️ Are you sure you want to delete this account? This will permanently delete all associated manual trade logs.')) return;
    try {
      const { error } = await supabase
        .from('journal_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAccounts(prev => prev.filter(a => a.id !== id));
      if (activeAccount?.id === id) {
        setActiveAccount(null);
      }
    } catch (err) {
      alert('Error deleting account: ' + (err as any).message);
    }
  };

  // Handle Strategy Form Submit
  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !strategyForm.name || !strategyForm.timeframe) return;

    try {
      const payload = {
        user_id: user.id,
        name: strategyForm.name,
        timeframe: strategyForm.timeframe,
        win_rate_target: parseFloat(strategyForm.winRateTarget || '0')
      };

      const { data, error } = await supabase
        .from('journal_strategies')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setStrategies(prev => [...prev, data]);
        setShowStrategyModal(false);
        setStrategyForm({ name: '', timeframe: '', winRateTarget: '' });
      }
    } catch (err) {
      alert('Error creating strategy: ' + (err as any).message);
    }
  };

  // Handle Strategy Delete
  const handleDeleteStrategy = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this strategy?')) return;
    try {
      const { error } = await supabase
        .from('journal_strategies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setStrategies(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert('Error deleting strategy: ' + (err as any).message);
    }
  };

  // Close Trade Modal and reset state
  const closeTradeModal = () => {
    setShowTradeModal(false);
    setEditingTradeId(null);
    setTradeForm({
      tradeNo: '',
      strategyId: '',
      timeframe: '15m',
      asset: '',
      direction: 'BUY',
      riskAmount: '',
      realizedRr: '',
      totalPnl: '',
      emotions: '',
      status: 'Active'
    });
  };

  // Populate trade form to edit existing trade
  const handleEditTrade = (trade: JournalTrade) => {
    setEditingTradeId(trade.id);
    setTradeForm({
      tradeNo: trade.trade_no.toString(),
      strategyId: trade.strategy_id || '',
      timeframe: trade.timeframe || '15m',
      asset: trade.asset,
      direction: trade.direction,
      riskAmount: trade.risk_amount.toString(),
      realizedRr: trade.realized_rr.toString(),
      totalPnl: trade.total_pnl.toString(),
      emotions: trade.emotions || '',
      status: trade.status
    });
    setShowTradeModal(true);
  };

  // Open trade modal to log a new trade
  const openNewTradeModal = () => {
    setEditingTradeId(null);
    setTradeForm({
      tradeNo: '',
      strategyId: '',
      timeframe: '15m',
      asset: '',
      direction: 'BUY',
      riskAmount: '',
      realizedRr: '',
      totalPnl: '',
      emotions: '',
      status: 'Active'
    });
    setShowTradeModal(true);
  };

  // Handle Trade Form Submit (Insert or Update)
  const handleSubmitTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeAccount || !tradeForm.tradeNo || !tradeForm.asset || !tradeForm.riskAmount) return;

    try {
      const payload = {
        user_id: user.id,
        account_id: activeAccount.id,
        trade_no: parseInt(tradeForm.tradeNo),
        strategy_id: tradeForm.strategyId || null,
        timeframe: tradeForm.timeframe || null,
        asset: tradeForm.asset.toUpperCase(),
        direction: tradeForm.direction,
        risk_amount: parseFloat(tradeForm.riskAmount),
        realized_rr: parseFloat(tradeForm.realizedRr || '0'),
        total_pnl: parseFloat(tradeForm.totalPnl || '0'),
        emotions: tradeForm.emotions,
        status: tradeForm.status
      };

      if (editingTradeId) {
        const { data, error } = await supabase
          .from('journal_trades')
          .update(payload)
          .eq('id', editingTradeId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setTrades(prev => prev.map(t => t.id === editingTradeId ? data : t));
          closeTradeModal();
        }
      } else {
        const { data, error } = await supabase
          .from('journal_trades')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setTrades(prev => [data, ...prev]);
          closeTradeModal();
        }
      }
    } catch (err) {
      alert(`Error ${editingTradeId ? 'updating' : 'logging'} trade: ` + (err as any).message);
    }
  };

  // Handle Trade Delete
  const handleDeleteTrade = async (id: string) => {
    if (!window.confirm('Delete this trade?')) return;
    try {
      const { error } = await supabase
        .from('journal_trades')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTrades(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert('Error deleting trade: ' + (err as any).message);
    }
  };

  // Handle Daily Journal Form Submit
  const handleCreateDaily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dailyForm.date) return;

    try {
      const payload = {
        user_id: user.id,
        date: dailyForm.date,
        htf_bias: dailyForm.htfBias,
        mental_state: dailyForm.mentalState,
        rules_followed: dailyForm.rulesFollowed,
        eod_review: dailyForm.eodReview
      };

      // Perform upsert since date + user_id is unique
      const { data, error } = await supabase
        .from('journal_daily')
        .upsert([payload], { onConflict: 'user_id, date' })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setDailyLogs(prev => {
          const filtered = prev.filter(l => l.date !== data.date);
          return [data, ...filtered].sort((a,b) => b.date.localeCompare(a.date));
        });
        setShowDailyModal(false);
        setDailyForm({
          date: new Date().toISOString().split('T')[0],
          htfBias: 'Bullish',
          mentalState: 'Focused',
          rulesFollowed: 'Yes',
          eodReview: ''
        });
      }
    } catch (err) {
      alert('Error saving daily journal: ' + (err as any).message);
    }
  };

  // Handle Daily Review Delete
  const handleDeleteDaily = async (id: string) => {
    if (!window.confirm('Delete this daily log?')) return;
    try {
      const { error } = await supabase
        .from('journal_daily')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDailyLogs(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      alert('Error deleting log: ' + (err as any).message);
    }
  };

  // Export trades to CSV
  const handleExportCSV = () => {
    if (!activeAccount) return;
    const acctTrades = trades.filter(t => t.account_id === activeAccount.id);
    if (acctTrades.length === 0) return;

    const headers = ['Trade No', 'Strategy', 'Timeframe', 'Asset', 'Direction', 'Risk Amount', 'Realized R:R', 'Total PnL', 'Emotions', 'Status', 'Date Logged'];
    const rows = acctTrades.map(t => {
      const strat = strategies.find(s => s.id === t.strategy_id);
      return [
        t.trade_no,
        strat ? strat.name : 'Custom',
        t.timeframe || '---',
        t.asset,
        t.direction,
        t.risk_amount,
        t.realized_rr,
        t.total_pnl,
        t.emotions || '---',
        t.status,
        new Date(t.created_at).toLocaleDateString()
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeExchange}_${activeAccount.account_id_input}_journal_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAccountCSV = (acct: JournalAccount) => {
    const acctTrades = trades.filter(t => t.account_id === acct.id);
    if (acctTrades.length === 0) {
      alert("No trades logged for this account yet!");
      return;
    }

    const headers = ['Trade No', 'Strategy', 'Timeframe', 'Asset', 'Direction', 'Risk Amount', 'Realized R:R', 'Total PnL', 'Emotions', 'Status', 'Date Logged'];
    const rows = acctTrades.map(t => {
      const strat = strategies.find(s => s.id === t.strategy_id);
      return [
        t.trade_no,
        strat ? strat.name : 'Custom',
        t.timeframe || '---',
        t.asset,
        t.direction,
        t.risk_amount,
        t.realized_rr,
        t.total_pnl,
        t.emotions || '---',
        t.status,
        new Date(t.created_at).toLocaleDateString()
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${acct.exchange}_${acct.account_id_input}_journal_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered lists based on current workspace
  const exchangeAccounts = accounts.filter(a => a.exchange === activeExchange);
  const activeStats = activeAccount ? getAccountStats(activeAccount.id) : null;
  const activeTrades = activeAccount ? trades.filter(t => t.account_id === activeAccount.id) : [];

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-orange-500" size={32} />
          <span className="text-xs uppercase tracking-widest font-black text-zinc-500">Decrypting terminal session...</span>
        </div>
      </div>
    );
  }

  return (
    <AccessGuard requiredTier={1} tierName="PRO">
      <div className="space-y-8 w-full mx-auto select-none flex-grow text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-200 dark:border-zinc-850 pb-6">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white flex items-center gap-3">
              <BookOpen className="text-orange-500" size={32} /> TRADE GENERAL
            </h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-550 dark:text-zinc-500 font-bold mt-1.5">• PROFESSIONAL MANUAL TRADING JOURNAL & LAB •</p>
          </div>

          {/* Exchange Tab Selectors */}
          <div className="flex bg-zinc-100 dark:bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-850 self-stretch md:self-auto overflow-x-auto scrollbar-none">
            {(['okx', 'bybit', 'mt5', 'ctrader'] as const).map((ex) => (
              <button
                key={ex}
                onClick={() => setActiveExchange(ex)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                  activeExchange === ex
                    ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]'
                    : 'text-zinc-550 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white'
                }`}
              >
                {ex === 'mt5' ? 'MetaTrader 5' : ex.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Database Missing Schema Error Resilience */}
        {dbMissing ? (
          <div className="glass-panel p-8 md:p-12 border-red-500/20 max-w-4xl mx-auto flex flex-col items-center text-center space-y-6 shadow-2xl animate-fadeIn">
            <AlertCircle size={60} className="text-red-500 animate-pulse" />
            <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Database Migration Required</h2>
            <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed max-w-2xl">
              To use the **Trade General** journaling workspace, you need to create the required tables in your Supabase project. We have compiled a self-contained SQL migration script for you.
            </p>
            <div className="relative w-full max-h-[300px] overflow-y-auto bg-zinc-950 p-6 rounded-2xl border border-zinc-800 text-left font-mono text-[10px] text-zinc-400 leading-relaxed custom-scrollbar select-text">
              <pre>{schemaSQL}</pre>
              <button
                onClick={copyToClipboard}
                className="absolute top-4 right-4 p-2.5 bg-zinc-900 border border-zinc-800 hover:border-orange-500/30 text-zinc-300 hover:text-orange-500 transition-all rounded-xl cursor-pointer"
                title="Copy Script"
              >
                {copiedSql ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
            <div className="flex gap-4">
              <button
                onClick={fetchData}
                className="btn-modern bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-xs tracking-wider"
              >
                I HAVE RUN THE SCRIPT - RELOAD WORKSPACE
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Account Listing and Stats */}
            <div className="lg:col-span-3 space-y-8 flex flex-col h-full">
              
              {/* Account List Header */}
              <div className="glass-panel p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-850">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white flex items-center gap-2">
                    <Wallet size={16} className="text-orange-500" /> ACCOUNTS ({exchangeAccounts.length})
                  </h3>
                  <button
                    onClick={() => setShowAccountModal(true)}
                    className="p-2 bg-orange-500/10 border border-orange-500/25 hover:bg-orange-500/20 text-orange-500 hover:text-orange-400 transition-all rounded-xl flex items-center justify-center cursor-pointer"
                    title="Add Account"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {loadingData ? (
                  <div className="py-8 flex justify-center">
                    <RefreshCw className="animate-spin text-zinc-500" size={20} />
                  </div>
                ) : exchangeAccounts.length === 0 ? (
                  <div className="py-12 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl flex flex-col items-center justify-center text-center">
                    <Wallet size={28} className="text-zinc-400 mb-3" />
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-550">No accounts configured</h4>
                    <p className="text-[9px] text-zinc-500 mt-1 max-w-[200px]">Create an account to start journaling your trades.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                    {exchangeAccounts.map((acct) => {
                      const stats = getAccountStats(acct.id);
                      const isBreached = stats.drawdown >= acct.max_drawdown && acct.max_drawdown > 0;
                      
                      return (
                        <div
                          key={acct.id}
                          onClick={() => setActiveAccount(acct)}
                          className={`p-5 rounded-2xl border transition-all cursor-pointer relative group ${
                            activeAccount?.id === acct.id
                              ? 'bg-zinc-550/5 dark:bg-zinc-900 border-orange-500/40 shadow-md'
                              : 'bg-white dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-850 hover:border-zinc-350 dark:hover:border-zinc-800'
                          }`}
                        >
                          {/* Breached Indicator */}
                          {isBreached && (
                            <div className="absolute top-4 right-12 text-red-500 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider animate-pulse">
                              <AlertTriangle size={12} /> Limit Hit
                            </div>
                          )}

                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase tracking-tight">{acct.name}</h4>
                              <p className="text-[9px] font-mono text-zinc-500 mt-0.5">{acct.account_id_input}</p>
                            </div>
                            <div className="flex gap-1.5 items-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                acct.type === 'Personal' 
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25' 
                                  : acct.type === 'Funded'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/25'
                              }`}>
                                {acct.type}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportAccountCSV(acct);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-emerald-500 transition-colors cursor-pointer"
                                title="Export Account CSV"
                              >
                                <Download size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAccount(acct.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-zinc-550 uppercase tracking-wider">
                            <div>
                              <span>Balance</span>
                              <p className="text-xs font-mono font-black text-zinc-900 dark:text-white mt-1">
                                ${stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <span>Drawdown</span>
                              <p className={`text-xs font-mono font-black mt-1 ${stats.drawdown > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                                ${stats.drawdown.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({stats.drawdownPercent.toFixed(1)}%)
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Active Account Overview Stats */}
              {activeAccount && activeStats && (
                <div className="glass-panel p-6 md:p-8 space-y-6 animate-fadeIn">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white pb-4 border-b border-zinc-200 dark:border-zinc-850 flex items-center gap-2">
                    <Activity size={16} className="text-orange-500" /> METRIC REPORT: {activeAccount.name}
                  </h3>
                  
                  <div className="space-y-4 text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-widest">
                    
                    <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-900/50">
                      <span>Initial Capital</span>
                      <span className="font-mono text-zinc-900 dark:text-white font-black">
                        ${Number(activeAccount.starting_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-900/50">
                      <span>Net Balance</span>
                      <span className="font-mono text-zinc-900 dark:text-white font-black">
                        ${activeStats.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-900/50">
                      <span>Drawdown Threshold</span>
                      <span className="font-mono text-red-500 font-black">
                        ${Number(activeAccount.max_drawdown).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-900/50">
                      <span>Trade Quantity</span>
                      <span className="font-mono text-zinc-900 dark:text-white font-black">{activeStats.tradesCount}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-900/50">
                      <span>Win Rate</span>
                      <span className="font-mono text-emerald-500 font-black">{activeStats.winRate.toFixed(1)}%</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span>Status</span>
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-black tracking-wider ${
                        activeAccount.status === 'Passed'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                          : activeAccount.status === 'Failed'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25'
                          : activeAccount.status === 'Payout Eligible'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-450 border border-blue-500/25'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {activeAccount.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Workstation containing Trades, Strategies, Daily Journal tabs */}
            <div className="lg:col-span-9 bg-white dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 min-h-[620px] flex flex-col overflow-hidden relative shadow-xl">
              
              {/* Tab Header */}
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-850 mb-6 text-[10px] text-zinc-550 uppercase tracking-widest shrink-0 flex-wrap gap-2">
                <div className="flex gap-4 sm:gap-6 flex-wrap">
                  <button 
                    onClick={() => setJournalTab('trades')} 
                    className={`font-black tracking-widest uppercase transition-all pb-1 cursor-pointer ${
                      journalTab === 'trades' ? 'text-orange-500 border-b-2 border-orange-500 font-bold' : 'text-zinc-550 hover:text-zinc-900 dark:hover:text-zinc-300'
                    }`}
                  >
                    📈 Trades Log
                  </button>
                  <button 
                    onClick={() => setJournalTab('strategies')} 
                    className={`font-black tracking-widest uppercase transition-all pb-1 cursor-pointer ${
                      journalTab === 'strategies' ? 'text-orange-500 border-b-2 border-orange-500 font-bold' : 'text-zinc-550 hover:text-zinc-900 dark:hover:text-zinc-300'
                    }`}
                  >
                    🎯 Strategies
                  </button>
                  <button 
                    onClick={() => setJournalTab('daily')} 
                    className={`font-black tracking-widest uppercase transition-all pb-1 cursor-pointer ${
                      journalTab === 'daily' ? 'text-orange-500 border-b-2 border-orange-500 font-bold' : 'text-zinc-550 hover:text-zinc-900 dark:hover:text-zinc-300'
                    }`}
                  >
                    📝 Daily Journal
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* CSV Export Option */}
                  {journalTab === 'trades' && activeTrades.length > 0 && (
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download size={11} /> Export CSV
                    </button>
                  )}

                  {/* Add Buttons based on active tab */}
                  {journalTab === 'trades' && activeAccount && (
                    <button
                      onClick={openNewTradeModal}
                      className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={11} /> Log Trade
                    </button>
                  )}

                  {journalTab === 'strategies' && (
                    <button
                      onClick={() => setShowStrategyModal(true)}
                      className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={11} /> Add Strategy
                    </button>
                  )}

                  {journalTab === 'daily' && (
                    <button
                      onClick={() => setShowDailyModal(true)}
                      className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={11} /> Write Entry
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Workspace Contents */}
              <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                
                {/* 1. Trades Log Tab */}
                {journalTab === 'trades' && (
                  <div className="space-y-4">
                    {!activeAccount ? (
                      <div className="py-24 flex flex-col items-center justify-center text-center">
                        <Wallet size={40} className="text-zinc-400 mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-wider text-zinc-550">Select or Create an Account</h4>
                        <p className="text-xs text-zinc-500 mt-1.5 max-w-sm leading-relaxed">
                          You need to select a configured account on the left before logging manual trades.
                        </p>
                      </div>
                    ) : activeTrades.length === 0 ? (
                      <div className="py-24 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl flex flex-col items-center justify-center text-center">
                        <HistoryIcon size={40} className="text-zinc-400 mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-wider text-zinc-550">No Trades Recorded</h4>
                        <p className="text-xs text-zinc-500 mt-1.5 max-w-sm leading-relaxed">
                          Log your manual executions to track strategy win-rates, emotion notes, and balance metrics.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto select-text">
                        <table className="w-full text-left border-collapse select-text">
                          <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-850 text-zinc-550 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                              <th className="pb-3 pr-4">Trade No</th>
                              <th className="pb-3 pr-4">Strategy</th>
                              <th className="pb-3 pr-4">TF</th>
                              <th className="pb-3 pr-4">Asset</th>
                              <th className="pb-3 pr-4">Direction</th>
                              <th className="pb-3 pr-4">Risk</th>
                              <th className="pb-3 pr-4">PnL</th>
                              <th className="pb-3 pr-4">Realized R:R</th>
                              <th className="pb-3 pr-4">Emotions</th>
                              <th className="pb-3 pr-4">Status</th>
                              <th className="pb-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900/50 text-[11px] font-mono leading-relaxed">
                            {activeTrades.map(t => {
                              const strat = strategies.find(s => s.id === t.strategy_id);
                              
                              return (
                                <tr key={t.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-900/10 transition-colors">
                                  <td className="py-3 pr-4 font-black">#{t.trade_no}</td>
                                  <td className="py-3 pr-4 font-bold text-zinc-900 dark:text-white uppercase">
                                    {strat ? strat.name : 'Custom'}
                                  </td>
                                  <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-405 font-bold uppercase">{t.timeframe || '---'}</td>
                                  <td className="py-3 pr-4 font-black text-zinc-850 dark:text-zinc-300 uppercase">{t.asset}</td>
                                  <td className="py-3 pr-4 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                      t.direction === 'BUY'
                                        ? 'bg-emerald-550/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    }`}>
                                      {t.direction}
                                    </span>
                                  </td>
                                  <td className="py-3 pr-4 font-black text-zinc-700 dark:text-zinc-400">
                                    ${Number(t.risk_amount).toFixed(2)}
                                  </td>
                                  <td className={`py-3 pr-4 font-black ${
                                    Number(t.total_pnl) > 0 
                                      ? 'text-emerald-600 dark:text-emerald-400' 
                                      : Number(t.total_pnl) < 0 
                                      ? 'text-red-500' 
                                      : 'text-zinc-500'
                                  }`}>
                                    {Number(t.total_pnl) >= 0 ? '+' : ''}${Number(t.total_pnl).toFixed(2)}
                                  </td>
                                  <td className="py-3 pr-4 font-black text-indigo-500">
                                    {Number(t.realized_rr).toFixed(1)}R
                                  </td>
                                  <td className="py-3 pr-4 text-zinc-550 dark:text-zinc-400 select-text max-w-[120px] truncate" title={t.emotions}>
                                    {t.emotions || '---'}
                                  </td>
                                  <td className="py-3 pr-4">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                      t.status === 'Win'
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : t.status === 'Loss'
                                        ? 'bg-red-500/15 text-red-655 dark:text-red-405 border border-red-500/20'
                                        : t.status === 'Break-Even'
                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700'
                                    }`}>
                                      {t.status}
                                    </span>
                                  </td>
                                  <td className="py-3 text-right whitespace-nowrap">
                                    <button
                                      onClick={() => handleEditTrade(t)}
                                      className="p-1.5 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 mr-1"
                                      title="Edit Trade"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTrade(t.id)}
                                      className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors cursor-pointer text-zinc-400"
                                      title="Delete Trade"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Strategies Setup Tab */}
                {journalTab === 'strategies' && (
                  <div className="space-y-6">
                    {strategies.length === 0 ? (
                      <div className="py-24 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl flex flex-col items-center justify-center text-center">
                        <Target size={40} className="text-zinc-400 mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-wider text-zinc-550">No Strategies Configured</h4>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {strategies.map(s => {
                          // Calculate performance metrics for this strategy
                          const stratTrades = activeAccount ? trades.filter(t => t.account_id === activeAccount.id && t.strategy_id === s.id && t.status !== 'Active') : [];
                          const wins = stratTrades.filter(t => t.status === 'Win');
                          const winrate = stratTrades.length > 0 ? (wins.length / stratTrades.length) * 100 : 0;
                          
                          return (
                            <div key={s.id} className="p-5 bg-white dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-850 rounded-2xl flex flex-col justify-between group hover:border-zinc-350 dark:hover:border-zinc-800 transition-colors">
                              <div>
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase tracking-tight">{s.name}</h4>
                                    <p className="text-[9px] font-mono text-zinc-500 mt-0.5">Timeframe: {s.timeframe}</p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteStrategy(s.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-450 hover:text-red-500 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-zinc-550 uppercase tracking-widest">
                                  <div>
                                    <span>Target WR</span>
                                    <p className="text-xs font-mono font-black text-zinc-900 dark:text-white mt-1">{s.win_rate_target}%</p>
                                  </div>
                                  <div>
                                    <span>Active Account WR</span>
                                    <p className={`text-xs font-mono font-black mt-1 ${winrate >= s.win_rate_target && stratTrades.length > 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                      {stratTrades.length > 0 ? `${winrate.toFixed(0)}%` : '---'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Daily Journal Tab */}
                {journalTab === 'daily' && (
                  <div className="space-y-4">
                    {dailyLogs.length === 0 ? (
                      <div className="py-24 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl flex flex-col items-center justify-center text-center">
                        <Calendar size={40} className="text-zinc-400 mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-wider text-zinc-550">No Journal Entries Written</h4>
                        <p className="text-xs text-zinc-500 mt-1.5 max-w-sm leading-relaxed">
                          Reflect on your EOD performance, bias accuracy, rules compliance, and emotional status daily.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dailyLogs.map(l => (
                          <div key={l.id} className="p-6 bg-white dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-850 rounded-2xl relative group hover:border-zinc-350 dark:hover:border-zinc-800 transition-colors select-text">
                            
                            <button
                              onClick={() => handleDeleteDaily(l.id)}
                              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>

                            <div className="flex items-center gap-4 mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-900/50 flex-wrap">
                              <span className="font-mono font-black text-xs text-zinc-900 dark:text-white uppercase flex items-center gap-1.5">
                                <Calendar size={12} className="text-orange-500" /> {new Date(l.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                l.htf_bias === 'Bullish'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                                  : l.htf_bias === 'Bearish'
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/25'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-550 border border-zinc-200 dark:border-zinc-700'
                              }`}>
                                Bias: {l.htf_bias}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-black uppercase tracking-wider">
                                Mind: {l.mental_state}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                l.rules_followed === 'Yes'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                                  : l.rules_followed === 'Partially'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/25'
                                  : 'bg-red-500/10 text-red-500 border border-red-500/25'
                              }`}>
                                Rules: {l.rules_followed}
                              </span>
                            </div>

                            {l.eod_review && (
                              <p className="text-[11px] text-zinc-650 dark:text-zinc-450 leading-relaxed font-sans mt-2 whitespace-pre-wrap select-text selection:bg-orange-500/30">
                                {l.eod_review}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODALS */}
        <AnimatePresence>
          
          {/* 1. Account Creation Modal */}
          {showAccountModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAccountModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-8 rounded-3xl max-w-md w-full shadow-2xl z-10 space-y-6">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white flex items-center gap-2">
                    <Plus className="text-orange-500" size={20} /> Create Exchange Account
                  </h3>
                  <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold mt-1">Platform: {activeExchange.toUpperCase()}</p>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Account ID / Login</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 5092837 or okx-main"
                      value={accountForm.accountIdInput}
                      onChange={e => setAccountForm(prev => ({ ...prev, accountIdInput: e.target.value }))}
                      className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Account Name / Tag</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Phase 1 Challenge"
                      value={accountForm.name}
                      onChange={e => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                      className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Account Type</label>
                      <select
                        value={accountForm.type}
                        onChange={e => setAccountForm(prev => ({ ...prev, type: e.target.value as any }))}
                        className="input-modern w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 px-3 py-3 outline-none cursor-pointer"
                      >
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Evaluation">Evaluation</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Funded">Funded</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Personal">Personal</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Account Status</label>
                      <select
                        value={accountForm.status}
                        onChange={e => setAccountForm(prev => ({ ...prev, status: e.target.value as any }))}
                        className="input-modern w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 px-3 py-3 outline-none cursor-pointer"
                      >
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Active">Active</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Passed">Passed</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Failed">Failed</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Payout Eligible">Payout Eligible</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Starting Capital ($)</label>
                      <input
                        required
                        type="number"
                        placeholder="100000"
                        value={accountForm.startingBalance}
                        onChange={e => setAccountForm(prev => ({ ...prev, startingBalance: e.target.value }))}
                        className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Max Drawdown Limit ($)</label>
                      <input
                        required
                        type="number"
                        placeholder="5000"
                        value={accountForm.maxDrawdown}
                        onChange={e => setAccountForm(prev => ({ ...prev, maxDrawdown: e.target.value }))}
                        className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowAccountModal(false)} className="btn-modern bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-850 px-6 py-3 text-[10px] font-black uppercase tracking-widest flex-1 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" className="btn-modern bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex-1 cursor-pointer">
                      Create Account
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* 2. Trade Logging Modal */}
          {showTradeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeTradeModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-8 rounded-3xl max-w-lg w-full shadow-2xl z-10 space-y-6">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white flex items-center gap-2">
                    {editingTradeId ? (
                      <Pencil className="text-orange-500" size={20} />
                    ) : (
                      <Plus className="text-orange-500" size={20} />
                    )}
                    {editingTradeId ? 'Edit Executed Trade' : 'Log Executed Trade'}
                  </h3>
                  <p className="text-[8px] uppercase tracking-widest text-zinc-550 font-bold mt-1">Account: {activeAccount?.name}</p>
                </div>

                <form onSubmit={handleSubmitTrade} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Trade Number</label>
                      <input
                        required
                        type="number"
                        placeholder="1"
                        value={tradeForm.tradeNo}
                        onChange={e => setTradeForm(prev => ({ ...prev, tradeNo: e.target.value }))}
                        className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Strategy Used</label>
                      <select
                        value={tradeForm.strategyId}
                        onChange={e => setTradeForm(prev => ({ ...prev, strategyId: e.target.value }))}
                        className="input-modern w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 px-3 py-3 outline-none cursor-pointer"
                      >
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="">Custom</option>
                        {strategies.map(s => (
                          <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Timeframe</label>
                      <select
                        value={tradeForm.timeframe}
                        onChange={e => setTradeForm(prev => ({ ...prev, timeframe: e.target.value }))}
                        className="input-modern w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 px-3 py-3 outline-none cursor-pointer"
                      >
                        {['1m', '3m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'].map(tf => (
                          <option key={tf} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value={tf}>{tf}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Asset Symbol</label>
                      <input
                        required
                        type="text"
                        placeholder="XAUUSD"
                        value={tradeForm.asset}
                        onChange={e => setTradeForm(prev => ({ ...prev, asset: e.target.value }))}
                        className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Direction</label>
                      <select
                        value={tradeForm.direction}
                        onChange={e => setTradeForm(prev => ({ ...prev, direction: e.target.value as any }))}
                        className="input-modern w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-xs text-zinc-850 dark:text-zinc-100 px-3 py-3 outline-none cursor-pointer"
                      >
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="BUY">BUY</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="SELL">SELL</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Win/Loss Status</label>
                      <select
                        value={tradeForm.status}
                        onChange={e => setTradeForm(prev => ({ ...prev, status: e.target.value as any }))}
                        className="input-modern w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 px-3 py-3 outline-none cursor-pointer"
                      >
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Active">Active</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Win">Win</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Loss">Loss</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Break-Even">Break-Even</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Risk Amount ($)</label>
                      <input
                        required
                        type="number"
                        placeholder="100"
                        value={tradeForm.riskAmount}
                        onChange={e => setTradeForm(prev => ({ ...prev, riskAmount: e.target.value }))}
                        className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Realized PnL ($)</label>
                      <input
                        required
                        type="number"
                        placeholder="250"
                        value={tradeForm.totalPnl}
                        onChange={e => setTradeForm(prev => ({ ...prev, totalPnl: e.target.value }))}
                        className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Realized R:R</label>
                      <input
                        required
                        type="number"
                        step="0.1"
                        placeholder="2.5"
                        value={tradeForm.realizedRr}
                        onChange={e => setTradeForm(prev => ({ ...prev, realizedRr: e.target.value }))}
                        className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Emotion / Notes Check</label>
                    <input
                      type="text"
                      placeholder="e.g. Patient, Confident, slightly FOMO"
                      value={tradeForm.emotions}
                      onChange={e => setTradeForm(prev => ({ ...prev, emotions: e.target.value }))}
                      className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={closeTradeModal} className="btn-modern bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-850 px-6 py-3 text-[10px] font-black uppercase tracking-widest flex-1 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" className="btn-modern bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex-1 cursor-pointer">
                      {editingTradeId ? 'Update Trade' : 'Log Trade'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* 3. Strategy Modal */}
          {showStrategyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStrategyModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-8 rounded-3xl max-w-md w-full shadow-2xl z-10 space-y-6">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white flex items-center gap-2">
                    <Plus className="text-orange-500" size={20} /> Add Trading Strategy
                  </h3>
                </div>

                <form onSubmit={handleCreateStrategy} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Strategy Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Order Block Displacement"
                      value={strategyForm.name}
                      onChange={e => setStrategyForm(prev => ({ ...prev, name: e.target.value }))}
                      className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Timeframe</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. 5m, 15m, 1H"
                        value={strategyForm.timeframe}
                        onChange={e => setStrategyForm(prev => ({ ...prev, timeframe: e.target.value }))}
                        className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-555 uppercase tracking-wider ml-1">Win Rate Target (%)</label>
                      <input
                        required
                        type="number"
                        placeholder="60"
                        value={strategyForm.winRateTarget}
                        onChange={e => setStrategyForm(prev => ({ ...prev, winRateTarget: e.target.value }))}
                        className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowStrategyModal(false)} className="btn-modern bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-850 px-6 py-3 text-[10px] font-black uppercase tracking-widest flex-1 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" className="btn-modern bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex-1 cursor-pointer">
                      Add Strategy
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* 4. Daily Entry Modal */}
          {showDailyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDailyModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-8 rounded-3xl max-w-lg w-full shadow-2xl z-10 space-y-6">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white flex items-center gap-2">
                    <Plus className="text-orange-500" size={20} /> Daily Journal Review
                  </h3>
                </div>

                <form onSubmit={handleCreateDaily} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Review Date</label>
                      <input
                        required
                        type="date"
                        value={dailyForm.date}
                        onChange={e => setDailyForm(prev => ({ ...prev, date: e.target.value }))}
                        className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">HTF Bias Alignment</label>
                      <select
                        value={dailyForm.htfBias}
                        onChange={e => setDailyForm(prev => ({ ...prev, htfBias: e.target.value }))}
                        className="input-modern w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 px-3 py-3 outline-none cursor-pointer"
                      >
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Bullish">Bullish</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Bearish">Bearish</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Range">Range</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Mental State</label>
                      <select
                        value={dailyForm.mentalState}
                        onChange={e => setDailyForm(prev => ({ ...prev, mentalState: e.target.value }))}
                        className="input-modern w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 px-3 py-3 outline-none cursor-pointer"
                      >
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Focused">Focused / Calibrated</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Anxious">Anxious / Alert</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="FOMO">FOMO / Impatient</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Fatigued">Fatigued / Unfocused</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">Rules Followed?</label>
                      <select
                        value={dailyForm.rulesFollowed}
                        onChange={e => setDailyForm(prev => ({ ...prev, rulesFollowed: e.target.value }))}
                        className="input-modern w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 px-3 py-3 outline-none cursor-pointer"
                      >
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Yes">Yes (100% compliant)</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="Partially">Partially (Minor slippage)</option>
                        <option className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100" value="No">No (Discipline breach)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider ml-1">End of Day (EOD) Review Notes</label>
                    <textarea
                      rows={4}
                      placeholder="Reflect on key setups, mistakes made, lessons learned, or details regarding the psychological state during session execution..."
                      value={dailyForm.eodReview}
                      onChange={e => setDailyForm(prev => ({ ...prev, eodReview: e.target.value }))}
                      className="input-modern w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-foreground px-4 py-3 outline-none font-sans"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowDailyModal(false)} className="btn-modern bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-850 px-6 py-3 text-[10px] font-black uppercase tracking-widest flex-1 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" className="btn-modern bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex-1 cursor-pointer">
                      Save Entry
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

        </AnimatePresence>
      </div>
    </AccessGuard>
  );
}
