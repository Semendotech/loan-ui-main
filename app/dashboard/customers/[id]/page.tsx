"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";

export default function CustomerDetailsPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = params?.id as string;
  const AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [editingInstallmentId, setEditingInstallmentId] = useState<number | null>(null);
  const [installmentAmounts, setInstallmentAmounts] = useState<Record<number, string>>({});

  // Derived summary metrics
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  const loans = (data?.loans as any[]) || [];
  const overdueRecords = (data?.arrears as any[]) || [];
  const statusOf = (s: any) => String(s || "").toUpperCase();
  const isCompleted = (l: any) => statusOf(l.status) === "COMPLETED";
  const isActive = (l: any) => ["ACTIVE", "OVERDUE", "ARREARS"].includes(statusOf(l.status));
  const parseDate = (d: any) => (d ? new Date(d) : null);
  const within3M = (d: any) => {
    const dt = parseDate(d);
    return !!dt && dt >= threeMonthsAgo && dt <= now;
  };

  const completedLoans = loans.filter(isCompleted);
  const completedLast3M = completedLoans.filter((l) => within3M(l.due_date || l.start_date));
  const interestOfLoan = (l: any) => Math.max(0, Number(l.total_amount ?? 0) - Number(l.amount ?? 0));
  const interest3MCompleted = completedLast3M.reduce((sum, l) => sum + interestOfLoan(l), 0);
  const activeLoansCount = loans.filter(isActive).length;
  const totalOverdueRemaining = overdueRecords.reduce((sum, a) => sum + Number(a.remaining_amount ?? 0), 0);

  // Auth guard: redirect to login if session expired
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchCustomer = async () => {
    if (!customerId) return;
    try {
      const res = await api.get(`/customers/${customerId}`);
      setData((res as any).data ?? res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && customerId) {
      fetchCustomer();
    }
  }, [authLoading, isAuthenticated, customerId]);

  // Generate PDF Report
  const handleGeneratePDF = async () => {
    if (!customerId) return;
    try {
      setDownloading(true);
      const response = await api.get<Response>(`/customers/${customerId}/report`, {
        rawResponse: true, // 👈 tell the API to return the raw fetch response
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `customer_report_${customerId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to generate report");
    } finally {
      setDownloading(false);
    }
  };

  const handleEditInstallment = (inst: any) => {
    const loan = loans.find((l: any) => l.id === inst.loan_id);
    const status = String(loan?.status || "").toUpperCase();
    if (status !== "ACTIVE") {
      alert("Only installments for ACTIVE loans can be edited.");
      return;
    }
    setEditingInstallmentId(inst.id);
    setInstallmentAmounts((prev) => ({
      ...prev,
      [inst.id]: String(inst.amount ?? ""),
    }));
  };

  const handleSaveInstallment = async (inst: any) => {
    const raw = installmentAmounts[inst.id];
    const amt = parseFloat(raw);
    if (!amt || amt <= 0) {
      alert("Enter a valid amount");
      return;
    }
    try {
      await api.put(`/payments/installments/${inst.id}`, { amount: amt });
      await fetchCustomer();
      setEditingInstallmentId(null);
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || "Failed to update installment");
    }
  };

  const handleDeleteInstallment = async (inst: any) => {
    const loan = loans.find((l: any) => l.id === inst.loan_id);
    const status = String(loan?.status || "").toUpperCase();
    if (status !== "ACTIVE") {
      alert("Only installments for ACTIVE loans can be deleted.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this installment? This will adjust the loan balance.")) {
      return;
    }
    try {
      await api.delete(`/payments/installments/${inst.id}`);
      await fetchCustomer();
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || "Failed to delete installment");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (loading) return <div>Loading...</div>;
  if (!data) return <div>Customer not found.</div>;

  return (
    <section className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="3-Month Interest (Completed Loans)"
          value={interest3MCompleted}
          prefix="KSh "
          color="text-blue-600"
          accent="bg-blue-50"
        />
        <StatCard
          label="Active Loans"
          value={activeLoansCount}
          color="text-emerald-600"
          accent="bg-emerald-50"
        />
        <StatCard
          label="Total Overdue Remaining"
          value={totalOverdueRemaining}
          prefix="KSh "
          color="text-rose-600"
          accent="bg-rose-50"
        />
      </div>
      {/* Customer Info */}
      <div className="bg-white p-6 rounded shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Customer Details</h3>
        </div>
        <div className="mt-4 flex flex-col lg:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info label="Name" value={data.name} />
            <Info label="ID Number" value={data.id_number} />
            <Info label="Phone" value={data.phone} />
            <Info label="Email" value={data.email || "-"} />
            <Info label="Location" value={data.location || "-"} />
            <Info
              label="Joined"
              value={new Date(data.created_at).toLocaleDateString()}
            />
          </div>
          <div className="w-full lg:w-56 flex justify-center lg:justify-end">
            <div className="w-40 h-40 rounded-full border bg-gray-50 overflow-hidden flex items-center justify-center">
              <img
                src={data.profile_image_url || AVATAR_PLACEHOLDER}
                alt={`${data.name} avatar`}
                className={`w-full h-full object-cover ${data.profile_image_url ? "" : "p-6 opacity-70"}`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = AVATAR_PLACEHOLDER;
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loans Section */}
      <Section title="Loans" data={data.loans} render={(l: any) => (
        <div key={l.id} className="p-4 border rounded-lg hover:shadow">
          <div className="flex items-center justify-between">
          <div className="font-semibold text-gray-900">KSh {l.amount}</div>
            
            <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">
              {l.status}
            </span>
          </div>
          {(() => {
            const isCompleted = String(l.status || "").toUpperCase() === "COMPLETED";
            const interestGained = isCompleted ? (Number(l.total_amount ?? 0) - Number(l.amount ?? 0)) : 0;
            return (
              <>
                <div className="font-semibold text-green-600">
                  {isCompleted ? (
                    <>Returns (After Interest): KSh {l.total_amount}</>
                  ) : (
                    <>Returns (After Interest): -</>
                  )}
                </div>
                <div className="font-semibold text-blue-600">
                  {isCompleted ? (
                    <>Interest Gained: KSh {interestGained}</>
                  ) : (
                    <>Interest Gained: -</>
                  )}
                </div>
              </>
            );
          })()}
          <div className="font-semibold text-red-600">Unpaid: KSh {l.remaining_amount}</div>
          {(() => {
            const total = Number(l.total_amount ?? 0);
            const remaining = Number(l.remaining_amount ?? 0);
            const paid = Math.max(0, total - remaining);
            return (
              <div className="font-semibold text-emerald-600">
                Paid So Far: KSh {paid.toFixed(2)}
              </div>
            );
          })()}
          <div className="mt-2 text-sm text-gray-600">Interest Rate: {l.interest_rate}%</div>
          <div className="mt-1 text-xs text-gray-500">
            Start: {l.start_date} · Due: {l.due_date}
          </div>
        </div>
      )} />

      {/* Overdue Section */}
      <Section title="Overdue" data={data.arrears} render={(a: any) => (
        <div key={a.id} className="p-4 border rounded-lg hover:shadow">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-900">
              Remaining: KSh {a.remaining_amount}
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                a.is_cleared
                  ? "bg-gray-100 text-gray-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {a.is_cleared ? "Cleared" : "Active"}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Original: KSh {a.original_amount}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Overdue since: {a.arrears_date}
          </div>
        </div>
      )} />

      {/* Recent Installments + Generate PDF */}
      <div className="bg-white p-6 rounded shadow-sm">
        <h3 className="text-lg font-semibold flex justify-between items-center">
          <span>Recent Installments</span>
          <button
            onClick={handleGeneratePDF}
            disabled={downloading}
            className="bg-blue-600 text-white px-4 py-2 text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {downloading ? "Generating..." : "Download PDF Report"}
          </button>
        </h3>

        {(data.installments || []).length === 0 ? (
          <div className="mt-3 text-sm text-gray-600">No installments yet</div>
        ) : (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(data.installments || []).map((i: any) => {
              const loan = loans.find((l: any) => l.id === i.loan_id);
              const status = String(loan?.status || "").toUpperCase();
              const canModify = status === "ACTIVE";
              return (
                <div key={i.id} className="p-4 border rounded-lg hover:shadow">
                  <div className="flex items-center justify-between gap-2">
                    {editingInstallmentId === i.id ? (
                      <>
                        <input
                          type="number"
                          value={installmentAmounts[i.id] ?? ""}
                          onChange={(e) =>
                            setInstallmentAmounts((prev) => ({
                              ...prev,
                              [i.id]: e.target.value,
                            }))
                          }
                          className="px-2 py-1 border rounded text-sm w-28"
                        />
                        <button
                          onClick={() => handleSaveInstallment(i)}
                          className="text-xs px-2 py-1 rounded bg-green-600 text-white"
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="font-semibold text-gray-900">
                          Paid: KSh {i.amount}
                        </div>
                        <div className="flex items-center gap-2">
                          {canModify ? (
                            <>
                              <button
                                onClick={() => handleEditInstallment(i)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteInstallment(i)}
                                className="text-xs text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">
                              Linked to completed/overdue loan
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Date: {i.payment_date}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    Associated with Loan ID: {i.loan_id}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Section({ title, data, render }: any) {
  return (
    <div className="bg-white p-6 rounded shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      {(!data || data.length === 0) ? (
        <div className="mt-3 text-sm text-gray-600">No {title.toLowerCase()}</div>
      ) : (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map(render)}
        </div>
      )}
    </div>
  );
}

// Animated counter for summary stats
function StatCard({ label, value, prefix = "", color = "text-gray-900", accent = "bg-gray-50" }: { label: string; value: number; prefix?: string; color?: string; accent?: string; }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const from = 0;
    const to = Number(value || 0);
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const formatted = new Intl.NumberFormat().format(display);

  return (
    <div className={`p-5 rounded-lg border shadow-sm ${accent}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${color}`}>{prefix}{formatted}</div>
    </div>
  );
}
