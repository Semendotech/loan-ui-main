"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatKesCurrency } from "@/lib/loanCalculations";
import toast from "react-hot-toast";
import { AlertTriangle, Download } from "lucide-react";

interface DefaulterItem {
  loan_id: number;
  customer_name: string | null;
  id_number: string;
  phone: string | null;
  loan_amount?: number | null;
  amount?: number | null;
  total_amount?: number | null;
  date_loan_taken?: string | null;
  start_date?: string | null;
  loan?: {
    amount?: number | null;
    start_date?: string | null;
    date_loan_taken?: string | null;
  };
  loan_balance: number;
  days_defaulted: number;
}

export default function DefaultersPage() {
  const [defaulters, setDefaulters] = useState<DefaulterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set("date", selectedDate);
    return `?${params.toString()}`;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/dashboard/defaulters${buildQueryString()}`);
      const response = (data as { data?: { items?: DefaulterItem[] }; items?: DefaulterItem[] })?.data ?? data;
      const items = (response as { items?: DefaulterItem[] })?.items;
      setDefaulters(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load defaulters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedDate]);

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const response = await api.get<Response>(`/dashboard/defaulters-report${buildQueryString()}`, {
        rawResponse: true,
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `defaulters_report_${selectedDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Defaulters report downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download defaulters report");
    } finally {
      setDownloading(false);
    }
  };

  const displayRows = loading
    ? Array.from({ length: 5 }, (_, idx) => ({ loan_id: idx } as DefaulterItem))
    : defaulters;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-amber-600" />
            Defaulters
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Customers with 5 or more consecutive days without an instalment payment
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end w-full">
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm text-gray-600">Defaulters report</div>
                <div className="text-base font-semibold text-gray-900 mt-1">View defaulters as of a specific day</div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border rounded text-sm"
                />
                <button
                  onClick={handleDownloadReport}
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 transition"
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
          <table className="table-auto divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Customer Name
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  ID Number
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Phone Number
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Loan Amount
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Date Loan Taken
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Loan Balance
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Days Defaulted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && defaulters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No defaulters found.
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) => (
                  <tr key={row.loan_id ?? idx} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-sm font-medium text-gray-900">
                      {row.customer_name ?? "…"}
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-800">{row.id_number ?? "…"}</td>
                    <td className="px-2 py-2 text-sm text-gray-800">{row.phone ?? "—"}</td>
                    <td className="px-2 py-2 text-sm font-semibold text-gray-900">
                      {row.loan_amount != null
                        ? formatKesCurrency(row.loan_amount)
                        : row.amount != null
                        ? formatKesCurrency(row.amount)
                        : row.total_amount != null
                        ? formatKesCurrency(row.total_amount)
                        : row.loan?.amount != null
                        ? formatKesCurrency(row.loan.amount)
                        : "…"}
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-800">
                      {row.date_loan_taken ?? row.start_date ?? row.loan?.date_loan_taken ?? row.loan?.start_date ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-sm font-semibold text-red-700">
                      {row.loan_balance != null ? formatKesCurrency(row.loan_balance) : "…"}
                    </td>
                    <td className="px-2 py-2 text-sm">
                      {row.days_defaulted != null ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          {row.days_defaulted} days
                        </span>
                      ) : (
                        "…"
                      )}
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
