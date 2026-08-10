import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Focus = { type: "client" | "invoice"; id: string; summary: string } | null;

type Ctx = {
  focus: Focus;
  setFocus: (f: Focus) => void;
  page: string;
  setPage: (p: string) => void;
  aiOpen: boolean;
  setAiOpen: (v: boolean) => void;
  prefill: string;
  setPrefill: (v: string) => void;
};

const DuelyContext = createContext<Ctx | null>(null);

export function DuelyProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<Focus>(null);
  const [page, setPage] = useState("dashboard");
  const [aiOpen, setAiOpen] = useState(false);
  const [prefill, setPrefill] = useState("");
  const value = useMemo(
    () => ({ focus, setFocus, page, setPage, aiOpen, setAiOpen, prefill, setPrefill }),
    [focus, page, aiOpen, prefill],
  );
  return <DuelyContext.Provider value={value}>{children}</DuelyContext.Provider>;
}

export function useDuely() {
  const ctx = useContext(DuelyContext);
  if (!ctx) throw new Error("useDuely must be used inside DuelyProvider");
  return ctx;
}