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
  loan_balance: number;
  days_defaulted: number;
}

export default function DefaultersPage() {
  const [defaulters, setDefaulters] = useState<DefaulterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/dashboard/defaulters");
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
  }, []);

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const response = await api.get<Response>("/dashboard/defaulters-report", {
        rawResponse: true,
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `defaulters_report_${new Date().toISOString().split("T")[0]}.pdf`;
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
        <div className="flex gap-2">
          <button onClick={load} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            Refresh
          </button>
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Generating…" : "Print PDF"}
          </button>
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
                  Loan Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Days Defaulted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && defaulters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    No defaulters found.
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) => (
                  <tr key={row.loan_id ?? idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.customer_name ?? "…"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{row.id_number ?? "…"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{row.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-700">
                      {row.loan_balance != null ? formatKesCurrency(row.loan_balance) : "…"}
                    </td>
                    <td className="px-4 py-3 text-sm">
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
