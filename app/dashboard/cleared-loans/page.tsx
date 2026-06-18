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

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/loans/cleared${q ? `?q=${encodeURIComponent(q)}` : ""}`);
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
      const response = await api.get<Response>("/dashboard/cleared-loans-report", {
        rawResponse: true,
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cleared_loans_report_${new Date().toISOString().split("T")[0]}.pdf`;
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cleared Loans</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fully repaid loans and completed accounts
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Search by name, phone, or ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-black"
          />
          <button onClick={load} className="px-4 py-2 bg-green-600 text-white rounded-md">
            Search
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
