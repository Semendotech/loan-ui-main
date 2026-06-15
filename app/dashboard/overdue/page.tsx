"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function ClearOverduePage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Auth guard: redirect to login if session expired
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <section>
      <h3 className="text-lg font-semibold mb-4">Clear Overdue Balances</h3>
      <div className="bg-white p-6 rounded shadow-sm">
        <OverdueManager />
      </div>
    </section>
  );
}

function OverdueManager() {
  const router = useRouter();
  const [overdue, setOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/arrears?only_active=true&limit=100");
      const data = (res as any).data ?? res;
      setOverdue(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pay = async (arrearsId: number) => {
    const amt = parseFloat(amounts[arrearsId] || "0");
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    try {
      await api.post(`/arrears/${arrearsId}/installments`, { amount: amt });
      toast.success("Overdue payment recorded");
      router.push("/dashboard");
      setAmounts((s) => ({ ...s, [arrearsId]: "" }));
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || "Failed");
    }
  };

  const clear = async (arrearsId: number) => {
    try {
      await api.post(`/arrears/${arrearsId}/clear`, {});
      toast.success("Overdue cleared");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || "Failed");
    }
  };

  const summary = React.useMemo(() => {
    const active = overdue.filter((o) => !o.is_cleared);
    const cleared = overdue.filter((o) => o.is_cleared);
    const totalOutstanding = active.reduce((sum, o) => sum + Number(o.remaining_amount ?? 0), 0);
    return {
      activeCount: active.length,
      clearedCount: cleared.length,
      totalOutstanding,
    };
  }, [overdue]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-green-700 font-semibold">Overdue portfolio</p>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">Track and clear outstanding balances</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review overdue loans, collect weekly arrears, or clear the balance entirely.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={load}
            className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300"
          >
            Refresh list
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-full bg-green-600 text-white text-sm font-semibold shadow-sm hover:bg-green-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active Overdues" value={summary.activeCount} accent="bg-rose-50" color="text-rose-700" />
        <StatCard label="Cleared Overdues" value={summary.clearedCount} accent="bg-emerald-50" color="text-emerald-700" />
        <StatCard
          label="Outstanding Amount"
          value={summary.totalOutstanding}
          prefix="KSh "
          accent="bg-blue-50"
          color="text-blue-800"
        />
      </div>

      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
            Loading overdue balances...
          </div>
        ) : overdue.length === 0 ? (
          <div className="text-sm text-gray-600">No overdue balances 🎉</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {overdue.map((a) => (
              <div
                key={a.id}
                className="group relative p-5 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-lg transition"
              >
                <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-red-500/70 to-orange-400/70 opacity-0 group-hover:opacity-100 transition" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">Overdue #{a.id}</div>
                    <div className="text-xl font-semibold text-gray-900 mt-1">KSh {a.remaining_amount}</div>
                    {a.customer_name && (
                      <div className="text-sm font-medium text-gray-700 mt-1">Customer: {a.customer_name}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">Customer ID: {a.customer_id}</div>
                    <div className="text-xs text-gray-500">Loan ID: {a.loan_id}</div>
                    <div className="text-xs text-gray-400 mt-2">Overdue since {a.arrears_date}</div>
                  </div>
                  <span
                    className={`text-xs h-fit px-3 py-1 rounded-full ${
                      a.is_cleared ? "bg-gray-100 text-gray-600" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {a.is_cleared ? "Cleared" : "Active"}
                  </span>
                </div>

                {!a.is_cleared && (
                  <div className="mt-4 space-y-3">
                    <label className="text-xs font-medium text-gray-600">Amount to apply</label>
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Enter amount"
                        value={amounts[a.id] || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow numbers and decimal point
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setAmounts((s) => ({ ...s, [a.id]: value }));
                          }
                        }}
                        className="w-full sm:flex-[2] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:flex-[3]">
                        <button
                          onClick={() => pay(a.id)}
                          className="w-full sm:flex-1 px-5 py-3 rounded-lg bg-green-600 text-white text-sm font-semibold shadow hover:bg-green-700"
                        >
                          Apply Payment
                        </button>
                        <button
                          onClick={() => clear(a.id)}
                          className="w-full sm:flex-1 px-5 py-3 rounded-lg bg-gray-900 text-white text-sm font-semibold shadow hover:bg-gray-800"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  prefix = "",
  color = "text-gray-900",
  accent = "bg-gray-50",
}: {
  label: string;
  value: number;
  prefix?: string;
  color?: string;
  accent?: string;
}) {
  return (
    <div className={`p-4 rounded-2xl border border-gray-100 shadow-sm ${accent}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>
        {prefix}
        {new Intl.NumberFormat().format(value ?? 0)}
      </p>
    </div>
  );
}

