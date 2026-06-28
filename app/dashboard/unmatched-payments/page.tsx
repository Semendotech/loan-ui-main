"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface UnmatchedPayment {
  id: number;
  trans_id: string;
  amount: number;
  phone: string;
  created_at: string;
}

function formatKes(n: number | null | undefined) {
  if (n == null) return "\u2014";
  return `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function UnmatchedPaymentsPage() {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <section className="p-6">
      <h3 className="text-lg font-semibold mb-4">Unmatched M-Pesa Payments</h3>
      <div className="bg-white p-6 rounded shadow-sm">
        <UnmatchedPaymentsView />
      </div>
    </section>
  );
}

function UnmatchedPaymentsView() {
  const [payments, setPayments] = useState<UnmatchedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get<UnmatchedPayment[]>("/c2b/unmatched-payments")
      .then(setPayments)
      .catch(() => setError("Failed to load unmatched payments."))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = async () => {
    setDownloading(true);
    window.print();
    setDownloading(false);
  };

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return <div className="text-gray-600 text-sm">Loading...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div>
      {/* Print header - only shown when printing */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-xl font-bold">Unmatched M-Pesa Payments Report</h1>
        <p className="text-sm text-gray-500 mt-1">Generated on {new Date().toLocaleString()}</p>
      </div>

      {/* Action bar - hidden when printing */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-gray-600">
          {payments.length === 0
            ? "No unmatched payments found."
            : `${payments.length} unmatched payment${payments.length !== 1 ? "s" : ""} · Total: ${formatKes(totalAmount)}`}
        </p>
  <div className="flex gap-2">
          <button
            onClick={() => { setLoading(true); api.get<UnmatchedPayment[]>("/c2b/unmatched-payments").then(setPayments).catch(() => setError("Failed to load.")).finally(() => setLoading(false)); }}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Refresh
          </button>
          <button
              onClick={handlePrint}
              disabled={downloading}
              className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 transition"
            >
              {downloading ? "Preparing..." : "Print / Download PDF"}
            </button>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-sm text-gray-600">No unmatched payments on record.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Transaction ID</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Phone</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Time</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => {
                  const dt = new Date(p.created_at);
                  return (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-800">{p.trans_id}</td>
                      <td className="px-4 py-2 text-sm">{p.phone}</td>
                      <td className="px-4 py-2 text-sm font-medium text-red-600">{formatKes(p.amount)}</td>
                      <td className="px-4 py-2 text-sm">{dt.toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-sm">{dt.toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td colSpan={3} className="px-4 py-2 text-sm font-semibold">Total</td>
                  <td className="px-4 py-2 text-sm font-bold text-red-600">{formatKes(totalAmount)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
