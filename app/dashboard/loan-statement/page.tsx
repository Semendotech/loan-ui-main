"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface CustomerListItem {
  id: number;
  name: string;
  id_number: string;
  phone: string;
  location: string | null;
  status: "Active" | "Overdue" | "Defaulter" | "Clean";
}

interface InstallmentRow {
  installment_id: number;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference_number: string | null;
  balance_after: number;
}

interface LoanRow {
  loan_id: number;
  amount: number;
  interest_rate: number;
  total_amount: number;
  remaining_amount: number;
  start_date: string;
  due_date: string;
  completed_at: string | null;
  status: string;
  guarantor: { name: string; phone: string } | null;
  installments: InstallmentRow[];
}

interface StatementData {
  customer: {
    id: number;
    name: string;
    id_number: string;
    phone: string;
    location: string | null;
    registered_at: string;
  };
  summary: {
    total_loans: number;
    lifetime_borrowed: number;
    lifetime_paid: number;
  };
  loans: LoanRow[];
}

function formatKes(n: number | null | undefined) {
  if (n == null) return "\u2014";
  return `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-blue-100 text-blue-800",
  Overdue: "bg-orange-100 text-orange-800",
  Defaulter: "bg-red-100 text-red-800",
  Clean: "bg-green-100 text-green-800",
};

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
        <LoanStatementView />
      </div>
    </section>
  );
}

function LoanStatementView() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  if (selectedCustomerId) {
    return (
      <CustomerStatementDetail
        customerId={selectedCustomerId}
        onBack={() => setSelectedCustomerId(null)}
      />
    );
  }

  return <CustomerList onSelect={setSelectedCustomerId} />;
}

function CustomerList({ onSelect }: { onSelect: (id: number) => void }) {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");

  const DISPLAY_LIMIT = 50;

  const load = async (searchQuery: string = "", pageNumber = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(DISPLAY_LIMIT),
        offset: String(pageNumber * DISPLAY_LIMIT),
      };
      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
      }
      const res = await api.get<{ items: CustomerListItem[]; total: number }>("/customers/", { params });
      setCustomers(res.items || []);
      setTotal(res.total ?? 0);
      setPage(pageNumber);
    } catch (error) {
      console.error("Failed to load customers:", error);
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(query, 0);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const pageCount = total > 0 ? Math.ceil(total / DISPLAY_LIMIT) : 1;
  const canGoPrev = page > 0;
  const canGoNext = page + 1 < pageCount;

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 0 || pageNumber >= pageCount || pageNumber === page) return;
    load(query, pageNumber);
  };

  return (
    <div>
      <div className="mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, ID number, or phone"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {loading ? (
        <div className="text-gray-600 text-sm">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="text-sm text-gray-600">
          {query.trim() ? "No customers found matching your search" : "No customers found"}
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Page {page + 1} of {pageCount} ({total} total)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => handlePageChange(0)} disabled={!canGoPrev} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50">First</button>
              <button type="button" onClick={() => handlePageChange(page - 1)} disabled={!canGoPrev} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50">Prev</button>
              <button type="button" onClick={() => handlePageChange(page + 1)} disabled={!canGoNext} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50">Next</button>
              <button type="button" onClick={() => handlePageChange(pageCount - 1)} disabled={!canGoNext} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50">Last</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left text-sm font-semibold">Customer Name</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">ID Number</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Phone</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(c.id)}>
                    <td className="px-4 py-2 text-sm font-medium text-blue-700">{c.name}</td>
                    <td className="px-4 py-2 text-sm">{c.id_number}</td>
                    <td className="px-4 py-2 text-sm">{c.phone || "\u2014"}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${STATUS_STYLES[c.status] || "bg-gray-100 text-gray-700"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-blue-600">View Statement &rarr;</td>
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

function CustomerStatementDetail({ customerId, onBack }: { customerId: number; onBack: () => void }) {
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<StatementData>(`/customers/${customerId}/statement`)
      .then(setData)
      .catch((err) => {
        console.error("Failed to load statement:", err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await api.get<Response>(`/customers/${customerId}/statement/pdf`, { rawResponse: true });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `statement_${customerId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download statement:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600 text-sm">Loading statement...</div>;
  }

  if (!data) {
    return (
      <div>
        <button onClick={onBack} className="mb-4 text-sm text-blue-600">&larr; Back to customer list</button>
        <div className="text-sm text-gray-600">Failed to load statement.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-blue-600">&larr; Back to customer list</button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 transition"
        >
          {downloading ? "Generating..." : "Print / Download PDF"}
        </button>
      </div>

      <div className="mb-6 border rounded p-4 bg-gray-50">
        <h4 className="font-semibold text-lg">{data.customer.name}</h4>
        <p className="text-sm text-gray-600">ID: {data.customer.id_number} | Phone: {data.customer.phone} | Location: {data.customer.location || "\u2014"}</p>
        <p className="text-sm text-gray-600">Customer since: {new Date(data.customer.registered_at).toLocaleDateString()}</p>
        <p className="text-sm mt-2">
          Total Loans: <strong>{data.summary.total_loans}</strong> &nbsp;|&nbsp;
          Lifetime Borrowed: <strong>{formatKes(data.summary.lifetime_borrowed)}</strong> &nbsp;|&nbsp;
          Lifetime Paid: <strong>{formatKes(data.summary.lifetime_paid)}</strong>
        </p>
      </div>

      {data.loans.length === 0 ? (
        <div className="text-sm text-gray-600">No loans found for this customer.</div>
      ) : (
        data.loans.map((loan) => (
          <div key={loan.loan_id} className="mb-8 border rounded">
            <div className="bg-gray-100 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold">Loan #{loan.loan_id}</span>
                <span className="text-sm text-gray-600 ml-2">
                  Opened {new Date(loan.start_date).toLocaleDateString()} &middot; Status: {loan.status}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                Principal: {formatKes(loan.amount)} &nbsp;|&nbsp; Total Due: {formatKes(loan.total_amount)} &nbsp;|&nbsp; Remaining: {formatKes(loan.remaining_amount)}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Amount Paid</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.installments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm text-gray-500 text-center">No payments recorded</td>
                    </tr>
                  ) : (
                    loan.installments.map((inst) => {
                      const [datePart, timePart] = inst.payment_date.split(" ");
                      return (
                        <tr key={inst.installment_id} className="border-b">
                          <td className="px-4 py-2 text-sm">{datePart}</td>
                          <td className="px-4 py-2 text-sm">{timePart || "\u2014"}</td>
                          <td className="px-4 py-2 text-sm">{formatKes(inst.amount)}</td>
                          <td className="px-4 py-2 text-sm font-medium">{formatKes(inst.balance_after)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
