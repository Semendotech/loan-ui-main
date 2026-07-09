"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ManageCustomersPage() {
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
      <h3 className="text-lg font-semibold mb-4">Manage Customers</h3>
      <div className="bg-white p-6 rounded shadow-sm">
        <ManageCustomers />
      </div>
    </section>
  );
}

function ManageCustomers() {
  const { user } = useAuth();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<{ id: number; name: string } | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editIdNumber, setEditIdNumber] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const FALLBACK_AVATAR = "/avatar-placeholder.svg";
  const router = useRouter();

  const DISPLAY_LIMIT = 50;

  const loadCustomers = async (searchQuery: string = "", pageNumber = 0) => {
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
        items: Array<{
          id: number;
          name: string;
          id_number: string;
          phone: string | null;
          location: string | null;
          profile_image_url: string | null;
          created_at: string;
          has_active_loan: boolean;
        }>;
        total: number;
      }>("/customers", { params });

      const items = Array.isArray((res as any)?.items) ? (res as any).items : [];
      setCustomers(items);
      setTotalCustomers((res as any)?.total ?? 0);
      setPage(pageNumber);
    } catch (error) {
      console.error("Failed to load customers:", error);
      setCustomers([]);
      setTotalCustomers(0);
    } finally {
      setLoading(false);
    }
  };

  const pageCount = totalCustomers > 0 ? Math.ceil(totalCustomers / DISPLAY_LIMIT) : 1;
  const canGoPrev = page > 0;
  const canGoNext = page + 1 < pageCount;

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 0 || pageNumber >= pageCount || pageNumber === page) return;
    loadCustomers(query, pageNumber);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(query, 0);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleDeleteCustomer = async (customer: { id: number; name: string }) => {
    const confirmed = window.confirm(
      `Delete customer "${customer.name}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingCustomerId(customer.id);
      await api.delete(`/customers/${customer.id}`);
      setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
      toast.success("Customer deleted successfully");
    } catch (error: any) {
      const message = error?.message || "Failed to delete customer";
      toast.error(message);
    } finally {
      setDeletingCustomerId(null);
    }
  };

  const openEditModal = (customer: { id: number; name: string; phone: string | null; id_number: string }) => {
    setEditingCustomer({ id: customer.id, name: customer.name });
    setEditPhone(customer.phone || "");
    setEditIdNumber(customer.id_number || "");
  };

  const closeEditModal = () => {
    setEditingCustomer(null);
    setEditPhone("");
    setEditIdNumber("");
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    try {
      setSavingEdit(true);
      const updated = await api.patch<{ id: number; phone: string; id_number: string }>(
        `/customers/${editingCustomer.id}`,
        { phone: editPhone.trim(), id_number: editIdNumber.trim() }
      );
      setCustomers((prev) =>
        prev.map((item) =>
          item.id === editingCustomer.id
            ? { ...item, phone: (updated as any)?.phone ?? editPhone, id_number: (updated as any)?.id_number ?? editIdNumber }
            : item
        )
      );
      toast.success("Customer updated successfully");
      closeEditModal();
    } catch (error: any) {
      const message = error?.message || "Failed to update customer";
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  };

  const highlightMatch = (text: string, q: string) => {
    if (!text) return "";
    if (!q) return text;
    const regex = new RegExp(`(${q})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark
              key={i}
              className="bg-yellow-200 text-gray-900 rounded-sm px-0.5"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded bg-green-100 text-green-700">
            <Users className="w-5 h-5" />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name / id / phone / location"
            className="flex-1 px-3 py-2 border rounded"
          />
        </div>
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
              Page {page + 1} of {pageCount} ({totalCustomers} total)
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {customers.map((c) => {
              const hasActiveLoan =
                typeof c.has_active_loan === "boolean"
                  ? c.has_active_loan
                  : Array.isArray(c.loans)
                  ? c.loans.some(
                      (l: any) => String(l.status || "").toUpperCase() === "ACTIVE"
                    )
                  : false;

              const statusLabel = hasActiveLoan ? "Active loan" : "No active loan";
              const badgeClasses = hasActiveLoan
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700";
              const cardClasses = hasActiveLoan
                ? "border-red-200 bg-red-50"
                : "border-emerald-200 bg-green-50";

              return (
                <div
                  key={c.id}
                  className={`group relative block rounded-lg border p-4 shadow-sm transition ${cardClasses}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border bg-gray-100 overflow-hidden">
                        <img
                          src={c.profile_image_url || FALLBACK_AVATAR}
                          alt={`${c.name || "Customer"} avatar`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_AVATAR;
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-gray-900">
                          {highlightMatch(c.name || "", query)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {highlightMatch(c.id_number?.toString() || "", query)}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs rounded-full px-2 py-1 ${badgeClasses}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    {highlightMatch(c.phone || "", query)}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {highlightMatch(c.location || "—", query)}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/customers/${c.id}`)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View details
                    </button>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => openEditModal({ id: c.id, name: c.name || "Customer", phone: c.phone, id_number: c.id_number })}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    ) : null}
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer({ id: c.id, name: c.name || "Customer" })}
                        disabled={deletingCustomerId === c.id}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingCustomerId === c.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>

                  <div className="pointer-events-none absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="rounded bg-gray-900 text-white text-xs px-2 py-1 shadow">
                      Joined: {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {editingCustomer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h4 className="text-base font-semibold text-gray-900 mb-1">Edit Customer</h4>
            <p className="text-xs text-gray-500 mb-4">{editingCustomer.name}</p>

            <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
            <input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm mb-3"
              placeholder="Phone number"
            />

            <label className="block text-xs font-medium text-gray-600 mb-1">ID Number</label>
            <input
              value={editIdNumber}
              onChange={(e) => setEditIdNumber(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm mb-4"
              placeholder="ID number"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="px-3 py-2 text-sm rounded border border-gray-300 text-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
