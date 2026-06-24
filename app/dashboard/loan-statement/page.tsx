"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LoanStatementPage() {
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
      <h3 className="text-lg font-semibold mb-4">Loan Statement</h3>
      <div className="bg-white p-6 rounded shadow-sm">
        <LoanStatementTable />
      </div>
    </section>
  );
}

function LoanStatementTable() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalLoans, setTotalLoans] = useState(0);
  const [query, setQuery] = useState("");

  const DISPLAY_LIMIT = 50;

  const loadLoans = async (searchQuery: string = "", pageNumber = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(DISPLAY_LIMIT),
        offset: String(pageNumber * DISPLAY_LIMIT),
      };

      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
      }

      const res = await api.get<{
        items: any[];
        total?: number;
        count?: number;
      }>("/loans/cleared", { params });

      const items = Array.isArray((res as any)?.items) ? (res as any).items : [];
      setLoans(items);
      setTotalLoans((res as any)?.total ?? (res as any)?.count ?? 0);
      setPage(pageNumber);
    } catch (error) {
      console.error("Failed to load loan statement:", error);
      setLoans([]);
      setTotalLoans(0);
    } finally {
      setLoading(false);
    }
  };

  const pageCount = totalLoans > 0 ? Math.ceil(totalLoans / DISPLAY_LIMIT) : 1;
  const canGoPrev = page > 0;
  const canGoNext = page + 1 < pageCount;

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 0 || pageNumber >= pageCount || pageNumber === page) return;
    loadLoans(query, pageNumber);
  };

  useEffect(() => {
    loadLoans();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLoans(query, 0);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div>
      <div className="mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by loan ID or customer name"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {loading ? (
        <div className="text-gray-600 text-sm">Loading...</div>
      ) : loans.length === 0 ? (
        <div className="text-sm text-gray-600">
          {query.trim() ? "No loans found matching your search" : "No cleared loans found"}
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Page {page + 1} of {pageCount} ({totalLoans} total)
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
                  <th className="px-4 py-2 text-left text-sm font-semibold">Loan ID</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Customer</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Amount</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Days to Repay</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Completed</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{loan.id}</td>
                    <td className="px-4 py-2 text-sm">{loan.customer?.name || "—"}</td>
                    <td className="px-4 py-2 text-sm">KES {loan.amount?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-2 text-sm">{loan.days_to_repay || "—"}</td>
                    <td className="px-4 py-2 text-sm">{loan.completed_at ? new Date(loan.completed_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
