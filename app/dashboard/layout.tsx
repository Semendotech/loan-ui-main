"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, PlusCircle, CreditCard, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // close sidebar after navigation on small screens
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-[80vh] md:min-h-[70vh] flex bg-gray-100">
      <aside className={`fixed z-10 top-16 bottom-0 left-0 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-200 ease-in-out w-72 bg-white shadow-lg`}>
        <div className="h-full flex flex-col">
          <div className="px-6 py-5 flex items-center justify-between border-b">
            <div className="flex items-center gap-3">
              <Home className="w-6 h-6 text-green-600" />
              <span className="text-lg font-bold">Dashboard</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="px-4 py-6 flex-1 overflow-y-auto">
            <ul className="space-y-2">
              <li>
                <NavLink href="/dashboard" active={pathname === "/dashboard"}>
                  <Home className="w-5 h-5" />
                  <span>Overview</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/dashboard/add-loan" active={pathname?.startsWith("/dashboard/add-loan") ?? false}>
                  <PlusCircle className="w-5 h-5" />
                  <span>Add Loan</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/dashboard/active-loans" active={pathname?.startsWith("/dashboard/active-loans") ?? false}>
                  <CreditCard className="w-5 h-5" />
                  <span>Active Loans</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/dashboard/pay-installments" active={pathname?.startsWith("/dashboard/pay-installments") ?? false}>
                  <CreditCard className="w-5 h-5" />
                  <span>Pay Installments</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/dashboard/overdue" active={pathname?.startsWith("/dashboard/overdue") ?? false}>
                  <CreditCard className="w-5 h-5" />
                  <span>Clear Overdue</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/dashboard/customers" active={pathname?.startsWith("/dashboard/customers") ?? false}>
                  <Users className="w-5 h-5" />
                  <span>Manage Customers</span>
                </NavLink>
              </li>
            </ul>
          </nav>

          <div className="px-6 py-4 border-t">
            <button className="w-full text-sm text-gray-600 hover:text-gray-800">Settings</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 md:pl-72 w-full">
        <header className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded md:hidden">
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold">Dashboard</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Signed in as <span className="font-medium">{user?.username || "User"}</span>
              </div>
            </div>
          </div>
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`w-full flex items-center gap-3 px-4 py-3 rounded ${active ? "bg-green-50 text-green-700" : "text-gray-700 hover:bg-gray-50"}`}>
      {children}
    </Link>
  );
}


