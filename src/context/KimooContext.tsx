"use client";
import React, { createContext, useContext, useState } from 'react';

interface Preferences {
  riskPerTrade: number;
  defaultRR: number;
  targetDailyGoal: number;
}

interface KimooContextType {
  risk: number;
  setRisk: React.Dispatch<React.SetStateAction<number>>;
  watchlist: string[];
  setWatchlist: React.Dispatch<React.SetStateAction<string[]>>;
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
}

const KimooContext = createContext<KimooContextType | null>(null);

export function KimooProvider({ children }: { children: React.ReactNode }) {
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
    <KimooContext.Provider value={{
      risk,
      setRisk,
      watchlist,
      setWatchlist,
      preferences,
      setPreferences
    }}>
      {children}
    </KimooContext.Provider>
  );
}

export const useKimoo = () => {
  const context = useContext(KimooContext);
  if (!context) {
    throw new Error("useKimoo must be used within a KimooProvider");
  }
  return context;
};
