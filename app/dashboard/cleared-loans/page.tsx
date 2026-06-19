"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatKesCurrency } from "@/lib/loanCalculations";
import toast from "react-hot-toast";
import { Download } from "lucide-react";

interface ClearedLoanItem {
  id: number;
  amount: number;
  status: string;
  start_date: string;
  completed_at: string | null;
  days_to_repay: number | null;
  customer: {
    name: string | null;
    id_number: string;
    phone: string | null;
  };
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const datePart = value.includes("T") ? value.split("T")[0] : value;
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return datePart;
  return `${day}/${month}/${year}`;
}

export default function ClearedLoansPage() {
  const [loans, setLoans] = useState<ClearedLoanItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [period, setPeriod] = useState<"today" | "this_week" | "this_month" | "this_year" | "custom">("today");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const getDatesForPeriod = (selectedPeriod: typeof period) => {
    const today = new Date();
    const outputDate = (date: Date) => date.toISOString().slice(0, 10);

    if (selectedPeriod === "today") {
      return { startDate: outputDate(today), endDate: outputDate(today) };
    }

    if (selectedPeriod === "this_week") {
      const dayIndex = today.getDay();
      const monday = new Date(today);
      const diff = dayIndex === 0 ? 6 : dayIndex - 1;
      monday.setDate(today.getDate() - diff);
      return { startDate: outputDate(monday), endDate: outputDate(today) };
    }

    if (selectedPeriod === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: outputDate(firstDay), endDate: outputDate(today) };
    }

    if (selectedPeriod === "this_year") {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      return { startDate: outputDate(firstDay), endDate: outputDate(today) };
    }

    return { startDate: outputDate(today), endDate: outputDate(today) };
  };

  useEffect(() => {
    if (period !== "custom") {
      const dates = getDatesForPeriod(period);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
    }
  }, [period]);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (period !== "custom") {
      params.set("period", period);
    } else {
      params.set("start_date", startDate);
      params.set("end_date", endDate);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/loans/cleared${buildQueryString()}`);
      const response = (data as { data?: { items?: ClearedLoanItem[] }; items?: ClearedLoanItem[] })?.data ?? data;
      const items = (response as { items?: ClearedLoanItem[] })?.items;
      setLoans(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load cleared loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const response = await api.get<Response>(`/dashboard/cleared-loans-report${buildQueryString()}`, {
        rawResponse: true,
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = startDate === endDate ? startDate : `${startDate}_${endDate}`;
      a.download = `cleared_loans_report_${suffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Cleared loans report downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download cleared loans report");
    } finally {
      setDownloading(false);
    }
  };

  const displayLoans = loading
    ? Array.from({ length: 5 }, (_, idx) => ({ id: idx } as ClearedLoanItem))
    : loans;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-lg border shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="text-sm text-gray-600">Cleared loans report</div>
              <div className="text-base font-semibold text-gray-900 mt-1">Filter cleared loans by completion date range</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end">
              <div className="sm:col-span-2">
                <label htmlFor="period" className="block text-xs font-semibold text-gray-600 mb-1">
                  Period
                </label>
                <select
                  id="period"
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
                <label htmlFor="start_date" className="block text-xs font-semibold text-gray-600 mb-1">
                  Start Date
                </label>
                <input
                  id="start_date"
                  type="date"
                  value={startDate}
                  disabled={period !== "custom"}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPeriod("custom");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                />
              </div>
              <div>
                <label htmlFor="end_date" className="block text-xs font-semibold text-gray-600 mb-1">
                  End Date
                </label>
                <input
                  id="end_date"
                  type="date"
                  value={endDate}
                  disabled={period !== "custom"}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPeriod("custom");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <button onClick={load} className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md text-sm">
                  Search
                </button>
                <button
                  onClick={handleDownloadReport}
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-gray-900 text-white rounded-md disabled:opacity-60 text-sm"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? "Generating…" : "Download PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Customer Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  ID Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Phone Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Loan Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Date Loan Taken
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Date Loan Cleared
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Days Taken to Repay
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && loans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No cleared loans found.
                  </td>
                </tr>
              ) : (
                displayLoans.map((loan, idx) => (
                  <tr key={loan.id ?? idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {loan.customer?.name ?? "…"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {loan.customer?.id_number ?? "…"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {loan.customer?.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-700">
                      {loan.amount != null ? formatKesCurrency(loan.amount) : "…"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {formatDisplayDate(loan.start_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {formatDisplayDate(loan.completed_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {loan.days_to_repay != null ? `${loan.days_to_repay} days` : "—"}
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
