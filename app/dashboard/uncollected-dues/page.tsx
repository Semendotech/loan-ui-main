"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatKesCurrency } from "@/lib/loanCalculations";
import toast from "react-hot-toast";
import { AlertCircle, Download } from "lucide-react";

interface UncollectedDueItem {
  loan_id: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_id_number: string;
  daily_instalment: number;
  loan_balance: number;
  skipped_days: number;
  arrears: number;
}

export default function UncollectedDuesPage() {
  const [dues, setDues] = useState<UncollectedDueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set("start_date", fromDate);
    params.set("end_date", toDate);
    return `?${params.toString()}`;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/dashboard/uncollected-dues${buildQueryString()}`);
      const response = (data as { data?: { items?: UncollectedDueItem[] }; items?: UncollectedDueItem[] })?.data ?? data;
      const items = (response as { items?: UncollectedDueItem[] })?.items;
      setDues(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load uncollected dues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [fromDate, toDate]);

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const response = await api.get<Response>(`/dashboard/uncollected-dues-report${buildQueryString()}`, {
        rawResponse: true,
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `uncollected_dues_report_${fromDate}_to_${toDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Uncollected dues report downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download uncollected dues report");
    } finally {
      setDownloading(false);
    }
  };

  const displayRows = loading
    ? Array.from({ length: 5 }, (_, idx) => ({ loan_id: idx } as UncollectedDueItem))
    : dues;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="w-7 h-7 text-amber-500" />
            Uncollected Dues
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Active loans that are behind on payments within the selected date range
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end w-full">
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm text-gray-600">Uncollected dues report</div>
                <div className="text-base font-semibold text-gray-900 mt-1">View uncollected dues within a date range</div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 border rounded text-sm"
                  />
                </div>
                <button
                  onClick={handleDownloadReport}
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? "Generating…" : "Print PDF"}
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
                  Phone Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Daily Instalment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Loan Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Skipped Days
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Arrears
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && dues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    All dues have been collected for today.
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) => (
                  <tr key={row.loan_id ?? idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.customer_name ?? "…"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {row.customer_phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {row.daily_instalment != null ? formatKesCurrency(row.daily_instalment) : "…"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-700">
                      {row.loan_balance != null ? formatKesCurrency(row.loan_balance) : "…"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {row.skipped_days != null ? `${row.skipped_days}` : "…"}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-semibold ${
                        row.arrears == null
                          ? "text-gray-900"
                          : row.arrears > 0
                          ? "text-green-700"
                          : row.arrears < 0
                          ? "text-red-700"
                          : "text-gray-900"
                      }`}
                    >
                      {row.arrears == null
                        ? "…"
                        : row.arrears > 0
                        ? `+${formatKesCurrency(row.arrears)}`
                        : row.arrears < 0
                        ? `-${formatKesCurrency(Math.abs(row.arrears))}`
                        : formatKesCurrency(0)}
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
