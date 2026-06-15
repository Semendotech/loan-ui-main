"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

type ActiveLoan = {
  id: number;
  amount: number;
  interest_rate: number;
  remaining_amount: number;
  start_date: string;
  due_date: string;
  status: string;
  customer: {
    name: string | null;
    id_number: string;
    phone: string | null;
    location?: string | null;
  };
};

type ActiveCustomer = {
  id_number: string;
  name: string;
  phone?: string | null;
  location?: string | null;
  loans: ActiveLoan[];
};

function normalizeStatus(value: string | undefined | null) {
  return (value || "").toLowerCase();
}

function useActiveCustomers() {
  const [customers, setCustomers] = useState<ActiveCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 50;

  const fetchActive = async (search = "", reset = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;

      const res = await api.get<{
        items: ActiveLoan[];
        limit: number;
        offset: number;
        count: number;
        has_more: boolean;
      }>("/loans/active", {
       params: {
  ...(search ? { q: search } : {}),
  limit: String(LIMIT),
  offset: String(currentOffset),
}
,
      });

      const data = res;

      const rows: ActiveLoan[] = data.items || [];

      const grouped = new Map<string, ActiveCustomer>();

      // When resetting, start with empty map. Otherwise, preserve existing customers.
      if (!reset) {
        customers.forEach(c => grouped.set(c.id_number, c));
      }

      rows.forEach((loan) => {
        const key = loan.customer?.id_number;
        if (!key) return;

        if (!grouped.has(key)) {
          grouped.set(key, {
            id_number: key,
            name: loan.customer?.name || "Unknown",
            phone: loan.customer?.phone,
            location: loan.customer?.location,
            loans: [],
          });
        }

        grouped.get(key)!.loans.push(loan);
      });

      setCustomers(Array.from(grouped.values()));
      // Update offset: if reset, set to LIMIT (since we loaded LIMIT items from offset 0)
      // Otherwise, increment by LIMIT
      setOffset(reset ? LIMIT : offset + LIMIT);
      setHasMore(data.has_more);
    } catch (error: any) {
      toast.error("Failed to load active loans");
    } finally {
      setLoading(false);
    }
  };

  const resetAndSearch = (search: string) => {
    setOffset(0);
    setHasMore(true);
    fetchActive(search, true);
  };

  const refetch = () => {
    // Refetch with current search (we'll need to track it)
    fetchActive("", true);
  };

  return {
    customers,
    loading,
    hasMore,
    loadMore: (search: string) => fetchActive(search, false),
    search: resetAndSearch,
    refetch,
  };
}


function CustomerDetail({
  customer,
  onPaymentRecorded,
}: {
  customer: any | null;
  onPaymentRecorded: () => Promise<void>;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAmount("");
  }, [customer?.id_number]);

  const hasPayableLoan = useMemo(() => {
    if (!customer?.loans) return false;
    return customer.loans.some((loan: any) => normalizeStatus(loan.status) === "active");
  }, [customer]);

  const hasOverdueLoan = useMemo(() => {
    if (!customer?.loans) return false;
    return customer.loans.some((loan: any) => {
      const status = normalizeStatus(loan.status);
      return status === "overdue" || status === "arrears";
    });
  }, [customer]);

  const handlePay = async () => {
    if (!customer?.id_number || !amount) return;

    const activeLoan = customer.loans?.find(
      (loan: any) => normalizeStatus(loan.status) === "active"
    );
    const remaining = Number(activeLoan?.remaining_amount ?? 0);
    const numericAmount = parseFloat(amount);
    if (remaining > 0 && numericAmount > remaining) {
      toast.error(
        `Installment cannot exceed remaining balance. Remaining: KSh ${remaining}`
      );
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/payments", {
        id_number: customer.id_number,
        amount: numericAmount,
      });
      toast.success("Payment recorded");
      setAmount("");
      await onPaymentRecorded();
      router.refresh();
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.detail || "Failed to record payment";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
        Select a customer to view details
      </div>
    );
    }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border rounded-lg">
        <div className="font-semibold">
          {customer.name}{" "}
          <span className="text-xs text-gray-500">({customer.id_number})</span>
        </div>
        <div className="text-sm text-gray-600">
          {customer.phone || "No phone"}
          {customer.location ? ` · ${customer.location}` : ""}
        </div>
      </div>
      <div className="mt-4 flex-1 overflow-y-auto">
        <div className="p-4 border rounded-lg">
          <div className="font-semibold mb-2">Loans</div>
          {(customer.loans || []).length === 0 ? (
            <div className="text-sm text-gray-600">No loans found</div>
          ) : (
            <div className="space-y-3">
              {customer.loans.map((loan: any) => {
                const status = normalizeStatus(loan.status);
                const isOverdueOrArrears =
                  status === "overdue" || status === "arrears";
                const highlightClass = isOverdueOrArrears
                  ? "bg-yellow-50 border-yellow-200"
                  : status === "completed"
                  ? "bg-gray-50 border-gray-200"
                  : "bg-green-50 border-green-100";
                return (
                  <div
                    key={loan.id}
                    className={`p-3 border rounded ${highlightClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">KSh {loan.amount}</div>
                      <span className="text-xs px-2 py-1 rounded-full bg-white border text-gray-700">
                        {loan.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Start: {loan.start_date} · Due: {loan.due_date}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Remaining Amount: KSh {loan.remaining_amount}
                    </div>
                    {isOverdueOrArrears && (
                      <div className="mt-2 text-xs text-yellow-700 font-medium">
                        ⚠️ This loan must be paid through the Overdue page
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {hasPayableLoan ? (
            <div className="mt-4 max-w-sm">
              <label className="block text-sm font-medium text-gray-700">
                Installment Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded mt-1 mb-3"
              />
              <button
                onClick={handlePay}
                disabled={submitting || !amount}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
              >
                {submitting ? "Recording..." : "Record Payment"}
              </button>
            </div>
          ) : hasOverdueLoan ? (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800 font-medium mb-1">
                ⚠️ Overdue Loan Detected
              </div>
              <div className="text-xs text-yellow-700">
                Loans that are overdue must be paid through the{" "}
                <span className="font-semibold">Overdue</span> page, not here.
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-gray-600">
              All loans are completed. No further installments can be recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function PayInstallmentsWorkspace() {
  // const { customers, loading, refetch } = useActiveCustomers();
  // const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

const {
  customers: activeCustomers,
  loading,
  loadMore,
  search: backendSearch,
  hasMore,
  refetch
} = useActiveCustomers();


const [searchText, setSearchText] = useState("");

// Initial load on mount
useEffect(() => {
  backendSearch("");
}, []);

// Debounced search when searchText changes
useEffect(() => {
  const t = setTimeout(() => {
    backendSearch(searchText);
  }, 400);

  return () => clearTimeout(t);
}, [searchText]);


  const loadCustomerDetail = async (idNumber: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(
        `/customers/by-id-number/${encodeURIComponent(idNumber)}`
      );
      const data = (res as any).data ?? res;
      setDetail(data);
      setSelectedId(idNumber);
    } catch (error: any) {
      const message =
        error?.message ||
        error?.response?.data?.detail ||
        "Failed to load customer details";
      toast.error(message);
      setDetail(null);
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelectCustomer = async (idNumber: string) => {
    await loadCustomerDetail(idNumber);
  };

  const handleBackToList = () => {
    setDetail(null);
    setSelectedId(null);
  };

  const handlePaymentRecorded = async () => {
    await refetch();
    if (selectedId) {
      await loadCustomerDetail(selectedId);
    }
  };

  const isDetailView = Boolean(detail || detailLoading);

  if (isDetailView) {
    return (
      <div className="border rounded-lg p-4 space-y-4 w-full">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={handleBackToList}
              className="text-sm text-green-700 hover:text-green-900 font-semibold flex items-center gap-2"
            >
              ← Back to Active Borrowers
            </button>
            <h4 className="text-lg font-semibold mt-2">
              {detail?.name || "Borrower"} Installment
            </h4>
            <p className="text-xs text-gray-500">
              Record payments for the selected borrower
            </p>
          </div>
        </div>
        {detailLoading ? (
          <div className="py-12 text-center text-gray-500">
            Loading customer details...
          </div>
        ) : (
          <CustomerDetail
            customer={detail}
            onPaymentRecorded={handlePaymentRecorded}
          />
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h4 className="text-base font-semibold">Active Borrowers</h4>
          <p className="text-xs text-gray-500">
            Click a borrower to expand and capture a payment
          </p>
        </div>
        {loading && <span className="text-xs text-gray-500">Refreshing...</span>}
      </div>
      <input
  type="text"
  placeholder="Search by name, ID or phone"
  value={searchText}
  onChange={(e) => setSearchText(e.target.value)}
  className="w-full px-3 py-2 border rounded"
/>
      <div className="space-y-3">
        {activeCustomers.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-10">
            {loading
              ? "Loading customers..."
              : "No active loans found. When loans are issued they will appear here."}
          </div>
        ) : (
          activeCustomers.map((cust) => {
            return (
              <div
                key={cust.id_number}
                className="border rounded-lg border-gray-200 bg-white"
              >
                <button
                  onClick={() => handleSelectCustomer(cust.id_number)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{cust.name}</div>
                    <div className="text-xs text-gray-500">
                      {cust.id_number}
                      {cust.phone ? ` · ${cust.phone}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>
                      {cust.loans.length} loan{cust.loans.length > 1 ? "s" : ""}
                    </span>
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 011.08 1.04l-4.24 4.25a.75.75 0 01-1.08 0l-4.25-4.25a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function PayInstallmentsPage() {
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <section className="w-full">
      <h3 className="text-lg font-semibold mb-4">Pay Installment</h3>
      <div className="bg-white p-4 sm:p-6 rounded shadow-sm w-full">
        <PayInstallmentsWorkspace />
      </div>
    </section>
  );
}
