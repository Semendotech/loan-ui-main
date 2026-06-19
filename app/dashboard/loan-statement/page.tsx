"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Search, Download, FileText } from "lucide-react";
import { formatKesCurrency } from "@/lib/loanCalculations";
import toast from "react-hot-toast";

interface CustomerSummary {
  id: number;
  name: string;
  id_number: string;
  phone: string | null;
  location: string | null;
  profile_image_url: string | null;
}

interface StatementRow {
  date: string;
  amount: number;
  balance: number;
}

interface StatementData {
  customer_name: string;
  customer_id: string;
  customer_phone: string;
  loan_amount: number;
  interest_rate: number;
  daily_instalment: number;
  opening_balance: number;
  closing_balance: number;
  total_paid: number;
  payments: StatementRow[];
}

export default function LoanStatementPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [statement, setStatement] = useState<StatementData | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    loadCustomers(query);
  }, [query]);

  const loadCustomers = async (search = "") => {
    setLoadingCustomers(true);
    try {
      const params: Record<string, string> = { limit: "50" };
      if (search.trim()) {
        params.q = search.trim();
      }
      const response = await api.get<CustomerSummary[]>("/customers", { params });
      const data = (response as any)?.data ?? response;
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load customers", error);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleGenerateStatement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error("Select a customer first");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please select a statement date range");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    setLoadingStatement(true);
    try {
      const response = await api.get<StatementData>(
        `/customers/${selectedCustomer.id}/loan-statement?start_date=${startDate}&end_date=${endDate}`
      );
      const data = (response as any)?.data ?? response;
      setStatement(data);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load loan statement");
      setStatement(null);
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!statement || !selectedCustomer || !startDate || !endDate) {
      toast.error("Generate a statement before downloading");
      return;
    }

    try {
      setDownloadingPdf(true);
      const response = await api.get<Response>(
        `/customers/${selectedCustomer.id}/loan-statement-pdf?start_date=${startDate}&end_date=${endDate}`,
        { rawResponse: true }
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `loan_statement_${selectedCustomer.id}_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (error) {
      console.error(error);
      toast.error("Failed to download statement PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSelectCustomer = (customer: CustomerSummary) => {
    setSelectedCustomer(customer);
    setStatement(null);
  };

  const selectedCustomerCard = useMemo(() => {
    if (!selectedCustomer) return null;
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Selected customer</div>
            <div className="mt-2 text-lg font-semibold text-gray-900">{selectedCustomer.name}</div>
            <div className="mt-1 text-sm text-gray-600">ID: {selectedCustomer.id_number}</div>
            <div className="mt-1 text-sm text-gray-600">Phone: {selectedCustomer.phone ?? "N/A"}</div>
            <div className="mt-1 text-sm text-gray-600">Location: {selectedCustomer.location ?? "N/A"}</div>
          </div>
          <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-green-700">
            <FileText className="w-7 h-7" />
          </div>
        </div>
      </div>
    );
  }, [selectedCustomer]);

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
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-700">Loan Statement</p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">Generate customer statement</h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600">
            Search customers, choose a period and preview the statement before downloading the PDF.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          <Search className="w-4 h-4" />
          Search powered by customer data
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Find customer</h2>
                <p className="text-sm text-gray-600">Search by name, ID number, phone or location.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                {customers.length} results
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Search customers</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type name, phone, ID, or location"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </label>
              <div className="flex items-end gap-3">
                <button
                  type="button"
                  onClick={() => loadCustomers(query)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  Refresh results
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSelectedCustomer(null);
                    setStatement(null);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  Clear selection
                </button>
              </div>
            </div>

            <div className="mt-6">
              {loadingCustomers ? (
                <div className="text-sm text-gray-600">Loading customer list...</div>
              ) : customers.length === 0 ? (
                <div className="text-sm text-gray-600">No customers found.</div>
              ) : (
                <div className="grid gap-3">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className={`rounded-3xl border p-4 text-left transition hover:border-green-500 hover:bg-green-50 ${selectedCustomer?.id === customer.id ? "border-green-600 bg-green-50" : "border-gray-200 bg-white"}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-base font-semibold text-gray-900">{customer.name}</div>
                          <div className="mt-1 text-sm text-gray-500">ID: {customer.id_number}</div>
                        </div>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                          {customer.phone ?? "No phone"}
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-gray-600">{customer.location || "No location"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedCustomer && (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Statement period</h2>
                  <p className="text-sm text-gray-600">Choose a date range for the loan statement.</p>
                </div>
                <div className="grid w-full gap-4 sm:grid-cols-2 md:w-auto md:flex-none">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Start date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">End date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  Choose another customer
                </button>
                <button
                  type="button"
                  onClick={(e) => handleGenerateStatement(e as any)}
                  disabled={loadingStatement}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingStatement ? "Generating..." : "Preview statement"}
                </button>
              </div>
            </div>
          )}

          {statement && (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Statement preview</h2>
                  <p className="text-sm text-gray-600">Review the statement details before downloading the PDF.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  {downloadingPdf ? "Downloading..." : "Download PDF"}
                </button>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                  <div className="text-sm text-gray-500">Customer</div>
                  <div className="mt-2 text-base font-semibold text-gray-900">{statement.customer_name}</div>
                  <div className="mt-1 text-sm text-gray-600">ID: {statement.customer_id}</div>
                  <div className="mt-1 text-sm text-gray-600">Phone: {statement.customer_phone}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                  <div className="text-sm text-gray-500">Loan summary</div>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>Loan amount</span>
                      <span className="font-semibold">{formatKesCurrency(statement.loan_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interest rate</span>
                      <span className="font-semibold">{statement.interest_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily instalment</span>
                      <span className="font-semibold">{formatKesCurrency(statement.daily_instalment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Opening balance</span>
                      <span className="font-semibold">{formatKesCurrency(statement.opening_balance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Closing balance</span>
                      <span className="font-semibold">{formatKesCurrency(statement.closing_balance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total paid</span>
                      <span className="font-semibold">{formatKesCurrency(statement.total_paid)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-100 text-left text-xs uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {statement.payments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-5 text-center text-gray-500">
                          No payments were made during this period.
                        </td>
                      </tr>
                    ) : (
                      statement.payments.map((payment, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{payment.date}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatKesCurrency(payment.amount)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatKesCurrency(payment.balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          {selectedCustomerCard}

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="rounded-full bg-green-50 p-2 text-green-700">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Statement details</p>
                <p>Use the preview to confirm loan figures before exporting the PDF file.</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-gray-700">
              <p>
                The statement includes customer details, the loan amount, interest rate, opening and closing balances, plus all payments within the selected date range.
              </p>
              <p>
                The PDF export is generated from our backend and downloaded directly for offline review.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
