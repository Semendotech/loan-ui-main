"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface PaymentLog {
  id: number;
  loan_id: number;
  customer_name: string;
  customer_id_number: string;
  customer_phone: string;
  amount: number;
  balance_after: number | null;
  payment_date: string;
  payment_method: string;
  recorded_by: string;
  reference_number: string | null;
}

export default function PaymentLogsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const eatToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  const [startDate, setStartDate] = useState(eatToday);
  const [endDate, setEndDate] = useState(eatToday);
  const [period, setPeriod] = useState<"today" | "this_week" | "this_month" | "this_year" | "custom">("today");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const today = new Date();
    const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
    if (period === "today") { setStartDate(fmt(today)); setEndDate(fmt(today)); }
    else if (period === "this_week") {
      const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1);
      setStartDate(fmt(mon)); setEndDate(fmt(today));
    } else if (period === "this_month") {
      setStartDate(fmt(new Date(today.getFullYear(), today.getMonth(), 1))); setEndDate(fmt(today));
    } else if (period === "this_year") {
      setStartDate(fmt(new Date(today.getFullYear(), 0, 1))); setEndDate(fmt(today));
    }
  }, [period]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("start_date", startDate);
      params.set("end_date", endDate);
      params.set("limit", "1000");
      const data = await api.get<any>(`/payments/all?${params.toString()}`);
      const res = (data as any)?.data ?? data;
      setLogs(Array.isArray(res.items) ? res.items : []);
      setTotal(res.total || 0);
    } catch (err) {
      toast.error("Failed to load payment logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [startDate, endDate]);

  const totalAmount = logs.reduce((sum, l) => sum + l.amount, 0);

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <h1 className="text-2xl font-bold mb-4">Payment Logs</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Period</label>
            <select value={period} onChange={e => setPeriod(e.target.value as typeof period)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
            <input type="date" value={startDate} disabled={period !== "custom"}
              onChange={e => { setStartDate(e.target.value); setPeriod("custom"); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
            <input type="date" value={endDate} disabled={period !== "custom"}
              onChange={e => { setEndDate(e.target.value); setPeriod("custom"); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
            <input type="text" value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load()}
              placeholder="Name, ID, phone..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <button onClick={load} className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm">Search</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">TOTAL PAYMENTS</div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">TOTAL COLLECTED</div>
          <div className="text-2xl font-bold text-green-700">KES {totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payments found for this period.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-3 text-left">#</th>
                <th className="px-3 py-3 text-left">Customer</th>
                <th className="px-3 py-3 text-left">ID Number</th>
                <th className="px-3 py-3 text-left">Phone</th>
                <th className="px-3 py-3 text-right">Amount (KES)</th>
                <th className="px-3 py-3 text-right">Balance After</th>
                <th className="px-3 py-3 text-left">Date & Time</th>
                <th className="px-3 py-3 text-left">Method</th>
                <th className="px-3 py-3 text-left">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log, idx) => (
                <tr key={log.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{log.customer_name}</td>
                  <td className="px-3 py-2 text-gray-600">{log.customer_id_number}</td>
                  <td className="px-3 py-2 text-gray-600">{log.customer_phone}</td>
                  <td className="px-3 py-2 text-right font-semibold text-green-700">{log.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{log.balance_after !== null && log.balance_after !== undefined ? log.balance_after.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "-"}</td>
                  <td className="px-3 py-2 text-gray-600">{log.payment_date ? fmt(log.payment_date) : "-"}</td>
                  <td className="px-3 py-2 text-gray-600">{log.payment_method}</td>
                  <td className="px-3 py-2 text-gray-600">{log.recorded_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
