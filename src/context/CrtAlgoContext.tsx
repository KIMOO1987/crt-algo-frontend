"use client";
import React, { createContext, useContext, useState } from 'react';

interface Preferences {
  riskPerTrade: number;
  defaultRR: number;
  targetDailyGoal: number;
}

interface CrtAlgoContextType {
  risk: number;
  setRisk: React.Dispatch<React.SetStateAction<number>>;
  watchlist: string[];
  setWatchlist: React.Dispatch<React.SetStateAction<string[]>>;
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
}

const CrtAlgoContext = createContext<CrtAlgoContextType | null>(null);

export function CrtAlgoProvider({ children }: { children: React.ReactNode }) {
  const [risk, setRisk] = useState<number>(1);

  const [watchlist, setWatchlist] = useState<string[]>([
    'XAUUSD', 'NAS100', 'US30', 'EURUSD', 'BTCUSD', 'GBPUSD'
  ]);

  const [preferences, setPreferences] = useState<Preferences>({
    riskPerTrade: 1,
    defaultRR: 3.0,
    targetDailyGoal: 1000
  });

  return (
    <CrtAlgoContext.Provider value={{
      risk,
      setRisk,
      watchlist,
      setWatchlist,
      preferences,
      setPreferences
    }}>
      {children}
    </CrtAlgoContext.Provider>
  );
}

export const useCrtAlgo = () => {
  const context = useContext(CrtAlgoContext);
  if (!context) {
    throw new Error("useCrtAlgo must be used within a CrtAlgoProvider");
  }
  return context;
};
