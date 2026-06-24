"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
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

  return (
    <div>
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
                  <tr key={item.id} className="border-b hover:bg-gray-50">
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
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
