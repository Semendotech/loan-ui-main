"use client";

import { useEffect } from "react";
import AddLoanForm from "@/components/AddLoanForm";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function DashboardAddLoan() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Auth guard: redirect to login if session expired
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return <AddLoanForm />;
}


