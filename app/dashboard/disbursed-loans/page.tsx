"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatKesCurrency } from "@/lib/loanCalculations";
import toast from "react-hot-toast";
import { Download } from "lucide-react";

interface DisbursedLoanItem {
  id: number;
  amount: number;
  total_amount: number;
  remaining_amount: number | null;
  status: string;
  start_date: string;
  due_date: string | null;
  daily_instalment: number | null;
  days_to_repay: number | null;
  customer: {
    name: string | null;
    id_number: string;
    phone: string | null;
  } | null;
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "\u2014";
  const datePart = value.includes("T") ? value.split("T")[0] : value;
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return datePart;
  return `${day}/${month}/${year}`;
}

export default function DisbursedLoansPage() {
  const [loans, setLoans] = useState<DisbursedLoanItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState<"today" | "this_week" | "this_month" | "this_year" | "custom">("today");

  const getDatesForPeriod = (p: typeof period) => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (p === "today") return { startDate: fmt(today), endDate: fmt(today) };
    if (p === "this_week") {
      const mon = new Date(today);
      const diff = today.getDay() === 0 ? 6 : today.getDay() - 1;
      mon.setDate(today.getDate() - diff);
      return { startDate: fmt(mon), endDate: fmt(today) };
    }
    if (p === "this_month") {
      return { startDate: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: fmt(today) };
    }
    if (p === "this_year") {
      return { startDate: fmt(new Date(today.getFullYear(), 0, 1)), endDate: fmt(today) };
    }
    return { startDate: fmt(today), endDate: fmt(today) };
  };

  useEffect(() => {
    if (period !== "custom") {
      const dates = getDatesForPeriod(period);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const buildQS = () => {
    const params = new URLSearchParams();
    params.set("start_date", startDate);
    params.set("end_date", endDate);
    if (q.trim()) params.set("q", q.trim());
    return `?${params.toString()}`;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/loans/disbursed${buildQS()}`);
      const response = (data as { data?: { items?: DisbursedLoanItem[] }; items?: DisbursedLoanItem[] })?.data ?? data;
      const items = (response as { items?: DisbursedLoanItem[] })?.items;
      setLoans(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load disbursed loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const response = await api.get<Response>(`/dashboard/disbursed-loans-report${buildQS()}`, { rawResponse: true });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = startDate === endDate ? startDate : `${startDate}_${endDate}`;
      a.download = `disbursed_loans_report_${suffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Disbursed loans report downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  const totalAmount = loans.reduce((sum, l) => sum + (l.amount ?? 0), 0);
  const displayLoans = loading ? Array.from({ length: 5 }, (_, i) => ({ id: i } as DisbursedLoanItem)) : loans;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Filter bar */}
      <div className="bg-slate-50 p-4 rounded-lg border shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-sm text-gray-600">Disbursed loans report</div>
            <div className="text-base font-semibold text-gray-900 mt-1">Filter loans by disbursement date range</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as typeof period)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="today">Today</option>
                <option value="this_week">This week</option>
                <option value="this_month">This month</option>
                <option value="this_year">This year</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                disabled={period !== "custom"}
                onChange={(e) => { setStartDate(e.target.value); setPeriod("custom"); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                disabled={period !== "custom"}
                onChange={(e) => { setEndDate(e.target.value); setPeriod("custom"); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
              <input
                type="text"
                value={q}
                placeholder="Name / ID / phone"
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={load} className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md text-sm">
                Search
              </button>
              <button
                onClick={handleDownloadReport}
                disabled={downloading}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-gray-900 text-white rounded-md disabled:opacity-60 text-sm"
              >
                <Download className="w-4 h-4" />
                {downloading ? "Generating\u2026" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      {!loading && loans.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Disbursed</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{loans.length}</div>
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Amount</div>
            <div className="text-2xl font-bold text-green-700 mt-1">{formatKesCurrency(totalAmount)}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">ID Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount (KES)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Total + Interest</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date Disbursed</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && loans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    No loans disbursed in this period.
                  </td>
                </tr>
              ) : (
                displayLoans.map((loan, idx) => (
                  <tr key={loan.id ?? idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{loading ? "\u2026" : idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{loan.customer?.name ?? "\u2026"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{loan.customer?.id_number ?? "\u2026"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{loan.customer?.phone ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-700 text-right">
                      {loan.amount != null ? formatKesCurrency(loan.amount) : "\u2026"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {loan.total_amount != null ? formatKesCurrency(loan.total_amount) : "\u2026"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDisplayDate(loan.start_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDisplayDate(loan.due_date)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        loan.status === "ACTIVE" ? "bg-blue-50 text-blue-700" :
                        loan.status === "COMPLETED" ? "bg-green-50 text-green-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {loan.status ?? "\u2026"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
