"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

export default function HomePage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Optional: If you want to automatically redirect, keep this.
      // If you only want to change the button, remove this block.
      // router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden isolate">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 -z-10" />
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 text-white">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
              Manage Loans Effortlessly
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-10">
              Simplify your financial journey with comprehensive loan tracking, smart insights, and a beautiful, responsive experience.
            </p>
            <div className="flex flex-wrap gap-4">
              {!authLoading && (
                isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium transition-colors shadow-md"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium transition-colors shadow-md"
                  >
                    Login to Dashboard
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 mt-8 md:mt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="text-blue-600 text-2xl font-bold mb-2">Track Loans</div>
            <p className="text-slate-600">Monitor all loans in one place with detailed statuses and timelines.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="text-blue-600 text-2xl font-bold mb-2">Manage Payments</div>
            <p className="text-slate-600">Schedule and track payments, receive reminders, and keep history.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="text-blue-600 text-2xl font-bold mb-2">Financial Insights</div>
            <p className="text-slate-600">Gain insights with reports and analytics to guide better decisions.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
