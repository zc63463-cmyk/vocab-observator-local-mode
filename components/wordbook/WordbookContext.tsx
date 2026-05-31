"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export interface WordbookItem {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  word_count: number;
  progress_count: number;
}

interface WordbookContextValue {
  activeWordbook: WordbookItem | null;
  wordbooks: WordbookItem[];
  isLoading: boolean;
  setActiveWordbookId: (id: string) => void;
  refreshWordbooks: () => Promise<void>;
}

const WordbookContext = createContext<WordbookContextValue | null>(null);

const STORAGE_KEY = "vocab-active-wordbook-id";

export function useWordbook() {
  const ctx = useContext(WordbookContext);
  if (!ctx) {
    throw new Error("useWordbook must be used within WordbookProvider");
  }
  return ctx;
}

export function WordbookProvider({ children }: { children: React.ReactNode }) {
  const [wordbooks, setWordbooks] = useState<WordbookItem[]>([]);
  const [activeWordbookId, setActiveWordbookIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWordbooks = useCallback(async () => {
    try {
      const res = await fetch("/api/wordbooks");
      if (!res.ok) throw new Error("Failed to fetch wordbooks");
      const data = await res.json();
      const list: WordbookItem[] = data.wordbooks ?? [];
      setWordbooks(list);

      // Validate stored active wordbook ID
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const valid = list.find((w) => w.id === stored);
      if (valid) {
        setActiveWordbookIdState(valid.id);
      } else if (list.length > 0) {
        const defaultWb = list.find((w) => w.is_default) ?? list[0];
        setActiveWordbookIdState(defaultWb.id);
        localStorage.setItem(STORAGE_KEY, defaultWb.id);
      }
    } catch (err) {
      console.error("[WordbookProvider] fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWordbooks();
  }, [fetchWordbooks]);

  const setActiveWordbookId = useCallback((id: string) => {
    setActiveWordbookIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
      // Also set a cookie so server components can read it
      document.cookie = `wordbook-id=${id};path=/;max-age=31536000`;
    }
  }, []);

  const activeWordbook = wordbooks.find((w) => w.id === activeWordbookId) ?? null;

  return (
    <WordbookContext.Provider
      value={{
        activeWordbook,
        wordbooks,
        isLoading,
        setActiveWordbookId,
        refreshWordbooks: fetchWordbooks,
      }}
    >
      {children}
    </WordbookContext.Provider>
  );
}
