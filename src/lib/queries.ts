import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const today = () => new Date().toISOString().slice(0, 10);
const n = (v: unknown) => Number(v ?? 0);

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
      return data;
    },
  });
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, clients(id,name,company_name,email)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, clients(name), invoices(invoice_number)")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAiActions() {
  return useQuery({
    queryKey: ["ai_actions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_policies").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClientMemory(clientId?: string) {
  return useQuery({
    queryKey: ["client_memory", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data } = await supabase.from("client_memory").select("*").eq("client_id", clientId!);
      return data ?? [];
    },
  });
}

export function useReminders(invoiceId?: string) {
  return useQuery({
    queryKey: ["reminders", invoiceId],
    queryFn: async () => {
      let q = supabase.from("reminders").select("*").order("created_at", { ascending: false });
      if (invoiceId) q = q.eq("invoice_id", invoiceId);
      const { data } = await q;
      return data ?? [];
    },
  });
}

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  remaining_balance: number;
  currency: string;
  status: string;
  due_date: string;
  issue_date: string;
  client_id: string;
  clients?: { id: string; name: string; company_name: string | null } | null;
};

export function isOverdue(inv: { status: string; due_date: string }) {
  return inv.status === "overdue" || (!["paid", "cancelled", "draft"].includes(inv.status) && inv.due_date < today());
}

export function summarize(invoices: InvoiceRow[], payments: { amount: number; payment_date: string }[]) {
  const open = invoices.filter((i) => !["paid", "cancelled", "draft"].includes(i.status));
  const overdue = open.filter(isOverdue);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  return {
    outstanding: open.reduce((s, i) => s + n(i.remaining_balance), 0),
    overdueTotal: overdue.reduce((s, i) => s + n(i.remaining_balance), 0),
    overdueCount: overdue.length,
    paidThisMonth: payments
      .filter((p) => new Date(p.payment_date) >= monthStart)
      .reduce((s, p) => s + n(p.amount), 0),
    expectedThisMonth: open
      .filter((i) => new Date(i.due_date) < monthEnd)
      .reduce((s, i) => s + n(i.remaining_balance), 0),
    overdue,
  };
}