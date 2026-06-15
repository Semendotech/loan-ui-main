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
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  const FALLBACK_AVATAR = "/avatar-placeholder.svg";
  const router = useRouter();

  const DISPLAY_LIMIT = 100; // Limit for initial display

  const loadCustomers = async (searchQuery: string = "") => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(DISPLAY_LIMIT),
      };
      
      // If searching, add query parameter (searches entire database)
      // If not searching, just load limited display list
      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
        // When searching, increase limit to show more results
        params.limit = "200";
      }

      const res = await api.get<Array<{
        id: number;
        name: string;
        id_number: string;
        phone: string | null;
        location: string | null;
        profile_image_url: string | null;
        created_at: string;
        has_active_loan: boolean;
      }>>("/customers", { params });
      
      const data = Array.isArray(res) ? res : [];
      setCustomers(data);
    } catch (error) {
      console.error("Failed to load customers:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(query);
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
            placeholder="Search by name / id / phone / location (searches entire database)"
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
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer({ id: c.id, name: c.name || "Customer" })}
                    disabled={deletingCustomerId === c.id}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingCustomerId === c.id ? "Deleting..." : "Delete"}
                  </button>
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
      )}
    </div>
  );
}
