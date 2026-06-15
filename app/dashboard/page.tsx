"use client";

import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface DashboardMetrics {
  active_loans: number;
  active_loans_outstanding: number;
  overdue_loans?: number;
  overdue_outstanding?: number;
  active_arrears?: number;
  active_arrears_outstanding?: number;
}

interface TrendData {
  month: string;
  returns: number;
  interest: number;
}

interface SummaryMetrics {
  completed_loans_amount_this_month: number;
  active_loans_count_this_month: number;
  interest_last_three_months: number;
  overdue_count_last_three_months?: number;
  arrears_count_last_three_months?: number;
  total_paid_today?: number;
  total_paid_this_week?: number;
  total_paid_this_month?: number;
}

export default function DashboardOverviewPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState({ activeLoans: 0, loansOutstanding: 0, overdue: 0, overdueOutstanding: 0 });
  const [chartData, setChartData] = useState<TrendData[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Auth guard: redirect to login if session expired
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchDashboard();
    }
  }, [authLoading, isAuthenticated]);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const metricsRes = await api.get<DashboardMetrics>("/dashboard/metrics");
      const trendsRes = await api.get<TrendData[] | { trends: TrendData[] }>("/dashboard/trends?months=3");
      const summaryRes = await api.get<SummaryMetrics>("/dashboard/summary");

      const m = (metricsRes as any).data ?? metricsRes;
      const tAny = (trendsRes as any).data ?? trendsRes;
      const trends: TrendData[] = Array.isArray(tAny) ? tAny : (tAny?.trends ?? []);

      setMetrics({
        activeLoans: (m as any)?.active_loans ?? 0,
        loansOutstanding: (m as any)?.active_loans_outstanding ?? 0,
        overdue: (m as any)?.overdue_loans ?? (m as any)?.active_arrears ?? 0,
        overdueOutstanding: (m as any)?.overdue_outstanding ?? (m as any)?.active_arrears_outstanding ?? 0,
      });
      setChartData(trends);
      setSummary(((summaryRes as any).data ?? summaryRes) as SummaryMetrics);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPaymentsReport() {
    try {
      const response = await api.get<Response>(`/dashboard/payments-report?date_str=${selectedDate}`, {
        rawResponse: true,
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments_${selectedDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download payments report");
    }
  }

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

  const overdueSummaryCount = summary ? (summary.overdue_count_last_three_months ?? summary.arrears_count_last_three_months ?? 0) : 0;

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard label="Active Loans" value={metrics.activeLoans} color="text-blue-700" accent="bg-blue-50" />
        <StatCard label="Active Loans Outstanding" prefix="KSh " value={metrics.loansOutstanding} color="text-blue-900" accent="bg-blue-50" />
        <StatCard label="Overdue Loans" value={metrics.overdue} color="text-rose-700" accent="bg-rose-50" />
        <StatCard label="Overdue Remaining" prefix="KSh " value={metrics.overdueOutstanding} color="text-rose-900" accent="bg-rose-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="mb-3 font-semibold">Returns & Interest (Completed Loans, last 3 months)</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="returns" name="Returns" fill="#16a34a" />
                <Bar dataKey="interest" name="Interest Gained" fill="#065f46" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="mb-3 font-semibold">Summary</h3>
          {!summary ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard label="Total Paid (Today)" prefix="KSh " value={summary.total_paid_today ?? 0} color="text-purple-700" accent="bg-purple-50" />
              <StatCard label="Total Paid (This Week)" prefix="KSh " value={summary.total_paid_this_week ?? 0} color="text-green-700" accent="bg-green-50" />
              <StatCard label="Total Paid (This Month)" prefix="KSh " value={summary.total_paid_this_month ?? 0} color="text-teal-700" accent="bg-teal-50" />
              <StatCard label="Completed Loans (This Month)" prefix="KSh " value={summary.completed_loans_amount_this_month} color="text-emerald-700" accent="bg-emerald-50" />
              <StatCard label="Active Loans (Started This Month)" value={summary.active_loans_count_this_month} color="text-blue-700" accent="bg-blue-50" />
              <StatCard label="Interest (Completed, Last 3 Months)" prefix="KSh " value={summary.interest_last_three_months} color="text-indigo-700" accent="bg-indigo-50" />
              <StatCard label="Overdue (Last 3 Months)" value={overdueSummaryCount} color="text-rose-700" accent="bg-rose-50" />
              <div className="p-4 rounded-lg border shadow-sm bg-slate-50 md:col-span-2">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Payments report</div>
                    <div className="text-base font-semibold text-gray-900">Download payments for a specific day</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 border rounded text-sm"
                    />
                    <button
                      onClick={handleDownloadPaymentsReport}
                      className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Animated counter used in overview
function StatCard({ label, value, prefix = "", color = "text-gray-900", accent = "bg-gray-50" }: { label: string; value: number; prefix?: string; color?: string; accent?: string; }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const from = 0;
    const to = Number(value || 0);
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const formatted = new Intl.NumberFormat().format(display);

  return (
    <div className={`p-5 rounded-lg border shadow-sm ${accent}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${color}`}>{prefix}{formatted}</div>
    </div>
  );
}

