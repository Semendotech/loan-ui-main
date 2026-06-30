"use client";
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function OverduePage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <section className="p-6">
      <h3 className="text-lg font-semibold mb-4">Overdue Loans</h3>
      <div className="bg-white p-6 rounded shadow-sm">
        <OverdueTable />
      </div>
    </section>
  );
}

function OverdueTable() {
  const [arrears, setArrears] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalArrears, setTotalArrears] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");

  const DISPLAY_LIMIT = 50;

  const loadArrears = async (pageNumber = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(DISPLAY_LIMIT),
        offset: String(pageNumber * DISPLAY_LIMIT),
      };

      const res = await api.get<{
        items?: any[];
        total?: number;
        count?: number;
      }>("/arrears", { params });

      const items = Array.isArray((res as any)?.items) ? (res as any).items : Array.isArray(res) ? res : [];
      setArrears(items);
      setTotalArrears((res as any)?.total ?? (res as any)?.count ?? items.length);
      setPage(pageNumber);
    } catch (error) {
      console.error("Failed to load arrears:", error);
      setArrears([]);
      setTotalArrears(0);
    } finally {
      setLoading(false);
    }
  };

  const pageCount = totalArrears > 0 ? Math.ceil(totalArrears / DISPLAY_LIMIT) : 1;
  const canGoPrev = page > 0;
  const canGoNext = page + 1 < pageCount;

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 0 || pageNumber >= pageCount || pageNumber === page) return;
    loadArrears(pageNumber);
  };

  useEffect(() => {
    loadArrears();
  }, []);

  const toggleRow = (item: any) => {
    if (item.is_cleared) return;
    if (expandedId === item.id) {
      setExpandedId(null);
      setAmount("");
    } else {
      setExpandedId(item.id);
      setAmount("");
    }
  };

  const handlePay = async (item: any) => {
    if (!amount) return;
    const remaining = Number(item.remaining_amount ?? 0);
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (remaining > 0 && numericAmount > remaining) {
      toast.error(`Payment cannot exceed remaining balance. Remaining: KES ${remaining}`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/payments/record", {
        loan_id: item.loan_id,
        amount: numericAmount,
      });
      toast.success("Payment recorded");
      setAmount("");
      setExpandedId(null);
      await loadArrears(page);
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.detail || "Failed to record payment";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReport = async () => {
    setPrinting(true);
    try {
      const params: Record<string, string> = {};
      if (reportStartDate) params.start_date = reportStartDate;
      if (reportEndDate) params.end_date = reportEndDate;

      const response = await api.get<Response>("/dashboard/overdue-report", {
        params,
        rawResponse: true,
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = reportStartDate || reportEndDate
        ? `_${reportStartDate || "start"}_to_${reportEndDate || "end"}`
        : `_${new Date().toISOString().slice(0, 10)}`;
      a.download = `overdue_report${suffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("Failed to download overdue report");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={reportStartDate}
            onChange={(e) => setReportStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input
            type="date"
            value={reportEndDate}
            onChange={(e) => setReportEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handlePrintReport}
          disabled={printing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {printing ? "Generating..." : "Print Report"}
        </button>
      </div>
      {loading ? (
        <div className="text-gray-600 text-sm">Loading...</div>
      ) : arrears.length === 0 ? (
        <div className="text-sm text-gray-600">No overdue loans found</div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Page {page + 1} of {pageCount} ({totalArrears} total)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(0)}
                disabled={!canGoPrev}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              >
                First
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={!canGoPrev}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={!canGoNext}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(pageCount - 1)}
                disabled={!canGoNext}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              >
                Last
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left text-sm font-semibold">Customer</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Loan ID</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Original Amount</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Remaining</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Arrears Date</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {arrears.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`border-b hover:bg-gray-50 ${item.is_cleared ? "" : "cursor-pointer"}`}
                      onClick={() => toggleRow(item)}
                    >
                      <td className="px-4 py-2 text-sm">{item.customer_name || "—"}</td>
                      <td className="px-4 py-2 text-sm">{item.loan_id}</td>
                      <td className="px-4 py-2 text-sm">KES {item.original_amount?.toLocaleString() || "—"}</td>
                      <td className="px-4 py-2 text-sm">KES {item.remaining_amount?.toLocaleString() || "—"}</td>
                      <td className="px-4 py-2 text-sm">{item.arrears_date ? new Date(item.arrears_date).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${item.is_cleared ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {item.is_cleared ? "Cleared" : "Active"}
                        </span>
                      </td>
                    </tr>
                    {expandedId === item.id && (
                      <tr className="border-b bg-gray-50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="flex flex-wrap items-end gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Payment Amount (KES)
                              </label>
                              <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount"
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePay(item)}
                              disabled={submitting || !amount}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                              {submitting ? "Recording..." : "Record Payment"}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setExpandedId(null); setAmount(""); }}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
