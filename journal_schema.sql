-- Supabase SQL Schema Migration for Trade Journaling (Trade General)

-- 1. Accounts Table
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

-- Enable RLS
ALTER TABLE public.journal_accounts ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can manage their own journal accounts"
    ON public.journal_accounts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Strategies Table
CREATE TABLE IF NOT EXISTS public.journal_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    win_rate_target NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.journal_strategies ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can manage their own journal strategies"
    ON public.journal_strategies
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Trades Table
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

-- Enable RLS
ALTER TABLE public.journal_trades ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can manage their own journal trades"
    ON public.journal_trades
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Daily Journal Table
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

-- Enable RLS
ALTER TABLE public.journal_daily ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can manage their own daily journals"
    ON public.journal_daily
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_accounts_user ON public.journal_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_strategies_user ON public.journal_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_trades_user ON public.journal_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_trades_account ON public.journal_trades(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_daily_user ON public.journal_daily(user_id);
