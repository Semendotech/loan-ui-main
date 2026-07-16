"use client";
// SINGLE_DATE_APPLIED

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
  due_date: string | null;
  paid: number;
}

export default function UncollectedDuesPage() {
  const [dues, setDues] = useState<UncollectedDueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [checkDate, setCheckDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/dashboard/uncollected-dues?date=${checkDate}`);
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
  }, [checkDate]);

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const response = await api.get<Response>(`/dashboard/uncollected-dues-report?date=${checkDate}`, {
        rawResponse: true,
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `uncollected_dues_report_${checkDate}.pdf`;
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
            Customers who have not paid their instalment for the selected date
          </p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
          </div>
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Generating..." : "Print PDF"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Due-date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Daily</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && dues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    All dues have been collected for this date.
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) => (
                  <tr key={row.loan_id ?? idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.customer_name ?? "..."}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{row.customer_phone ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{row.due_date ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {row.daily_instalment != null ? formatKesCurrency(row.daily_instalment) : "..."}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-700">
                      {row.loan_balance != null ? formatKesCurrency(row.loan_balance) : "..."}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {row.paid ? formatKesCurrency(row.paid) : "0"}
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
