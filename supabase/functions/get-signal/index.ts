import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Signal {
  symbol: string;
  side: string;
  sl: number;
  tp: number;
  tp_secondary: number;
  status: string;
  is_active: boolean;
  created_at: string;
  grade: string;
  category: string;
  tf_alignment: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  // --- ADD THESE 3 LINES TO KILL THE CACHE ---
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const botToken = url.searchParams.get('botId')

    if (!botToken) throw new Error("Missing botId parameter")

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --- STEP 1: VALIDATE USER (Switch to Profiles table for SaaS integration) ---
    const cleanToken = botToken.trim();
    let isAuthorized = false;

    // A. Check for Master SaaS Tokens
    if (cleanToken.toLowerCase() === "ultimate" || cleanToken.toLowerCase() === "pro") {
      isAuthorized = true;
    } else {
      // B. Check Profiles table for user license (UUID)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_pro, expiry_date')
        .eq('id', cleanToken)
        .maybeSingle();

      if (profileError) {
        return new Response(JSON.stringify({ error: "DB_ERROR", details: profileError.message }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (profile && profile.is_pro) {
        const expiry = profile.expiry_date ? new Date(profile.expiry_date) : null;
        if (!expiry || expiry > new Date()) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED_OR_EXPIRED", token_received: cleanToken }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- STEP 2: LOAD PLATFORM CONFIGURATION AND FILTER CHECKLIST ---
    const platform = url.searchParams.get('platform') || 'MT5'; // default to MT5 if not sent
    let allowedSymbols: any = null;
    let isPlatformEnabled = true;

    if (platform === 'MT5' || platform === 'cTrader') {
      const tableName = platform === 'MT5' ? 'mt5_auth' : 'ctrader_auth';
      const { data: authConfig, error: authError } = await supabase
        .from(tableName)
        .select('allowed_symbols, is_enabled')
        .eq('user_id', cleanToken)
        .maybeSingle();

      if (!authError && authConfig) {
        allowedSymbols = authConfig.allowed_symbols;
        isPlatformEnabled = authConfig.is_enabled ?? true;
      }
    }

    if (!isPlatformEnabled) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- STEP 3: FETCH GLOBAL ACTIVE SIGNALS (max 15 minutes old) ---
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: trades, error: tradesError } = await supabase
      .from('signals')
      .select('symbol, side, sl, tp, tp_secondary, status, is_active, created_at, grade, category, tf_alignment')
      .eq('is_active', true)
      .gte('created_at', fifteenMinsAgo)
      .order('created_at', { ascending: false });

    if (tradesError) throw tradesError;

    // Filter signals using Allowed Symbols checklist
    let filteredTrades = trades || [];
    if (allowedSymbols && typeof allowedSymbols === 'object' && Object.keys(allowedSymbols).length > 0) {
      filteredTrades = filteredTrades.filter((trade: Signal) => {
        const tradeSymbol = trade.symbol.toUpperCase().replace("/", "").replace("-", "").replace(".P", "").replace("-P", "").replace(".PERP", "").trim();
        
        let matchedKey = null;
        for (const key of Object.keys(allowedSymbols)) {
          const cleanKey = key.toUpperCase().replace("/", "").replace("-", "").replace(".P", "").replace("-P", "").replace(".PERP", "").trim();
          if (tradeSymbol === cleanKey) {
            matchedKey = key;
            break;
          }
        }

        if (!matchedKey) return false; // Not enabled on checklist

        const symConfig = allowedSymbols[matchedKey];
        let allowedTfs: string[] = [];
        let allowedGrades: string[] = ['ALL'];

        if (Array.isArray(symConfig)) {
          allowedTfs = symConfig;
        } else if (symConfig && typeof symConfig === 'object') {
          allowedTfs = symConfig.timeframes || [];
          allowedGrades = (symConfig.grades || ['ALL']).map((g: string) => g.toUpperCase());
        }

        // Timeframe alignment check
        const tradeTf = (trade.tf_alignment || "M5/H1").toUpperCase().replace("-", "/").trim();
        const allowedTfsUpper = allowedTfs.map(t => t.toUpperCase().replace("-", "/").trim());
        if (!allowedTfsUpper.includes(tradeTf)) return false;

        // Grade check
        const tradeGrade = (trade.grade || "A+").toUpperCase().trim();
        const gradeMatch = allowedGrades.includes('ALL') || allowedGrades.includes(tradeGrade);
        if (!gradeMatch) return false;

        return true;
      });
    }

    if (!filteredTrades || filteredTrades.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- STEP 3: MAP ACTIONS PER TRADE ---
    const responseBody = (filteredTrades as Signal[]).map((trade: Signal) => {
      let action = "none";
      const status = trade.status?.toUpperCase();

      if (status === "PENDING" || status === "ENTRY") {
        action = trade.side.toLowerCase();
      } else if (status === "TP1") {
        action = "partial_close";
      } else if (status === "TP2" || status === "SL" || status === "TP1 + SL (BE)") {
        action = "close_all";
      }

      const rawGrade = (trade.grade || "NORMAL").toUpperCase();
      const rawCategory = (trade.category || "FOREX").toUpperCase();

      return {
        action: action,
        symbol: trade.symbol,
        sl: trade.sl,
        tp: trade.tp,
        tp_secondary: trade.tp_secondary,
        status: trade.status,
        // Access directly from the trade object now
        grade: rawGrade,
        category: rawCategory,
        tf_alignment: trade.tf_alignment || "5m-1H",
        time: new Date(trade.created_at).getTime()
      };
    });

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
