"use client";
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AlertTriangle, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface UnmatchedPayment {
  id: number;
  trans_id: string;
  amount: number;
  phone: string;
  created_at: string;
}

export default function UnmatchedPaymentsPage() {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<UnmatchedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin) {
      api.get<UnmatchedPayment[]>("/c2b/unmatched-payments")
        .then(setPayments)
        .catch(() => setError("Failed to load unmatched payments."))
        .finally(() => setLoading(false));
    }
  }, [authLoading, isAuthenticated, isAdmin]);

  const handlePrint = () => window.print();

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><div className="text-gray-600">Loading...</div></div>;
  if (!isAuthenticated || !isAdmin) return null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Screen header - hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-800">Unmatched Payments</h1>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Report
        </button>
      </div>

      {/* Print header - only shown when printing */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-center">Unmatched M-Pesa Payments Report</h1>
        <p className="text-center text-gray-500 text-sm mt-1">Generated on {new Date().toLocaleString()}</p>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-yellow-400">
          <p className="text-sm text-gray-500">Total Unmatched</p>
          <p className="text-2xl font-bold text-gray-800">{payments.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-400">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-gray-800">KES {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No unmatched payments found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Transaction ID</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Phone</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Amount (KES)</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                  <td className="px-6 py-4 font-mono text-gray-800">{p.trans_id}</td>
                  <td className="px-6 py-4 text-gray-800">{p.phone}</td>
                  <td className="px-6 py-4 text-right font-medium text-red-600">
                    {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td colSpan={3} className="px-6 py-3 font-semibold text-gray-700">Total</td>
                <td className="px-6 py-3 text-right font-bold text-red-600">
                  {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          nav, aside, header, .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
