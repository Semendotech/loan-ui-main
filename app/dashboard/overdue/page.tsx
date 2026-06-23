"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { AlertTriangle, TrendingDown, CheckCircle, Download, RefreshCw } from "lucide-react";
import { formatKesCurrency } from "@/lib/loanCalculations";

export default function ClearOverduePage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Auth guard: redirect to login if session expired
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

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

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50">
      <OverdueManager />
    </div>
  );
}

function OverdueManager() {
  const router = useRouter();
  const [overdue, setOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [downloading, setDownloading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const buildReportQuery = () => {
    const params = new URLSearchParams();
    params.set("start_date", startDate);
    params.set("end_date", endDate);
    return `?${params.toString()}`;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/arrears?only_active=true&limit=50");
      const data = (res as any).data ?? res;
      setOverdue(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadOverdueReport = async () => {
    try {
      setDownloading(true);
      const response = await api.get<Response>(`/dashboard/overdue-report${buildReportQuery()}`, {
        rawResponse: true,
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = startDate === endDate ? startDate : `${startDate}_${endDate}`;
      a.download = `overdue_report_${suffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Overdue report downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download overdue report");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pay = async (arrearsId: number) => {
    const amt = parseFloat(amounts[arrearsId] || "0");
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    try {
      setProcessingId(arrearsId);
      await api.post(`/arrears/${arrearsId}/installments`, { amount: amt });
      toast.success("Overdue payment recorded");
      setAmounts((s) => ({ ...s, [arrearsId]: "" }));
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || "Failed");
    } finally {
      setProcessingId(null);
    }
  };

  const clear = async (arrearsId: number) => {
    try {
      setProcessingId(arrearsId);
      await api.post(`/arrears/${arrearsId}/clear`, {});
      toast.success("Overdue cleared");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || "Failed");
    } finally {
      setProcessingId(null);
    }
  };

  const summary = React.useMemo(() => {
    const active = overdue.filter((o) => !o.is_cleared);
    const cleared = overdue.filter((o) => o.is_cleared);
    const totalOutstanding = active.reduce((sum, o) => sum + Number(o.remaining_amount ?? 0), 0);
    return {
      activeCount: active.length,
      clearedCount: cleared.length,
      totalOutstanding,
    };
  }, [overdue]);

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="space-y-6">
        {/* Page Title */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Overdue Management
              </h1>
            </div>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed ml-12">
              Monitor and collect outstanding overdue balances from active loans
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleDownloadOverdueReport}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Downloading..." : "Print PDF"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Overdues</p>
              <p className="text-xl font-bold text-red-600 mt-2">
                {summary.activeCount}
              </p>
            </div>
            <div className="p-1 bg-red-50 rounded-lg">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Cleared Overdues</p>
              <p className="text-xl font-bold text-green-600 mt-2">
                {summary.clearedCount}
              </p>
            </div>
            <div className="p-1 bg-green-50 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Outstanding Amount</p>
              <p className="text-xl font-bold text-blue-600 mt-2">
                {formatKesCurrency(summary.totalOutstanding)}
              </p>
            </div>
            <div className="p-1 bg-blue-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center gap-3 text-gray-600">
              <span className="h-5 w-5 animate-spin rounded-full border-3 border-gray-300 border-t-gray-600" />
              <span className="text-base font-medium">Loading overdue balances...</span>
            </div>
          </div>
        ) : overdue.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No Overdue Balances</h3>
            <p className="text-gray-600 mt-2">Great work! All loans are current.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="divide-y divide-gray-100">
              {/* Table Header */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 px-6 py-4 bg-gray-50 font-semibold text-gray-700 text-sm">
                <div>Customer</div>
                <div>Phone Number</div>
                <div>Outstanding</div>
                <div>Days Overdue</div>
                <div>Action</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-100">
                {overdue.map((a) => {
                  const overdueDays = a.arrears_date
                    ? Math.floor(
                        (new Date().getTime() - new Date(a.arrears_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0;
                  const overdueRowClass =
                    overdueDays >= 30
                      ? "bg-red-100 border-l-4 border-red-500"
                      : overdueDays >= 14
                      ? "bg-red-50 border-l-4 border-orange-400"
                      : "bg-white";
                  const amountTextClass = overdueDays >= 30 ? "text-red-700" : "text-red-600";

                  return (
                    <div
                      key={a.id}
                      className={`grid grid-cols-1 lg:grid-cols-5 gap-4 px-6 py-6 hover:bg-gray-50 transition ${overdueRowClass}`}
                    >
                      {/* Customer */}
                      <div>
                        <p className="font-semibold text-gray-900">{a.customer_name || "—"}</p>
                        <p className="text-sm text-gray-600 mt-1">Loan #{a.loan_id}</p>
                      </div>

                      {/* Phone Number */}
                      <div>
                        <p className="text-gray-900 font-medium">{a.customer_phone || "—"}</p>
                      </div>

                      {/* Outstanding */}
                      <div>
                        <p className={`text-lg font-bold ${amountTextClass}`}>
                          {formatKesCurrency(a.remaining_amount || 0)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Original: {formatKesCurrency(a.original_amount || 0)}
                        </p>
                      </div>

                      {/* Days Overdue */}
                      <div>
                        {a.arrears_date && (
                          <>
                            <p className="text-gray-900 font-medium">
                              {overdueDays} days
                            </p>
                            <p className="text-sm text-gray-600 mt-1">{a.arrears_date}</p>
                          </>
                        )}
                      </div>

                      {/* Action */}
                      <div>
                        {!a.is_cleared ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="number"
                                placeholder="Amount"
                                value={amounts[a.id] || ""}
                                onChange={(e) =>
                                  setAmounts((s) => ({
                                    ...s,
                                    [a.id]: e.target.value,
                                  }))
                                }
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => pay(a.id)}
                                disabled={processingId === a.id}
                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                              >
                                {processingId === a.id ? "..." : "Pay"}
                              </button>
                              <button
                                onClick={() => clear(a.id)}
                                disabled={processingId === a.id}
                                className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
                              >
                                {processingId === a.id ? "..." : "Clear"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <p className="text-sm text-gray-500">No action needed</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

