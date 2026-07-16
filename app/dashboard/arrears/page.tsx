"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatKesCurrency } from "@/lib/loanCalculations";
import toast from "react-hot-toast";
import { AlertTriangle, Download, ChevronDown, ChevronRight, ChevronLeft, Search } from "lucide-react";

interface ArrearsItem {
  loan_id: number;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_id_number: string;
  backlog_amount: number;
  total_loan_amount: number;
  remaining_balance: number;
  start_date: string;
  due_date: string | null;
  skipped_days_count: number;
  skipped_dates: string[];
}

export default function ArrearsPage() {
  const [items, setItems] = useState<ArrearsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expandedLoanId, setExpandedLoanId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (query.trim()) params.set("q", query.trim());
      const data = await api.get(`/dashboard/arrears?${params.toString()}`);
      const response = (data as { data?: { items?: ArrearsItem[]; total?: number }; items?: ArrearsItem[]; total?: number })?.data ?? data;
      const list = (response as { items?: ArrearsItem[] })?.items;
      const count = (response as { total?: number })?.total;
      setItems(Array.isArray(list) ? list : []);
      setTotal(typeof count === "number" ? count : 0);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load arrears");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [offset, query]);

  // Debounce search input -> query, resetting to the first page on a new search
  useEffect(() => {
    const handle = setTimeout(() => {
      setOffset(0);
      setQuery(searchInput);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const response = await api.get<Response>(`/dashboard/arrears-report`, { rawResponse: true });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arrears_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Arrears report downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download arrears report");
    } finally {
      setDownloading(false);
    }
  };

  const toggleExpand = (loanId: number) => {
    setExpandedLoanId((prev) => (prev === loanId ? null : loanId));
  };

  const displayRows = loading
    ? Array.from({ length: 5 }, (_, idx) => ({ loan_id: idx } as ArrearsItem))
    : items;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-red-600" />
            Arrears
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            All customers with any cumulative payment backlog, from loan start to today
          </p>
        </div>
        <button
          onClick={handleDownloadReport}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 transition h-fit"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Generating..." : "Print PDF"}
        </button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, phone, or ID number..."
          className="w-full pl-9 pr-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-red-200"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Loan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Remaining Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date Taken</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Backlog</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    No customers currently in arrears.
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) => (
                  <>
                    <tr
                      key={row.loan_id ?? idx}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => !loading && toggleExpand(row.loan_id)}
                    >
                      <td className="px-2 py-3 text-gray-400">
                        {!loading && (expandedLoanId === row.loan_id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.customer_name ?? "..."}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{row.customer_phone ?? "-"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {row.total_loan_amount != null ? formatKesCurrency(row.total_loan_amount) : "..."}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {row.remaining_balance != null ? formatKesCurrency(row.remaining_balance) : "..."}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{row.start_date ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{row.due_date ?? "-"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-700">
                        {row.backlog_amount != null ? formatKesCurrency(row.backlog_amount) : "..."}
                      </td>
                    </tr>
                    {expandedLoanId === row.loan_id && (
                      <tr key={`${row.loan_id}-expanded`} className="bg-red-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                            Skipped Days ({row.skipped_days_count})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {row.skipped_dates.map((d) => (
                              <span key={d} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                {d}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <div>
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
              disabled={offset === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() => setOffset((prev) => (prev + limit < total ? prev + limit : prev))}
              disabled={offset + limit >= total}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
