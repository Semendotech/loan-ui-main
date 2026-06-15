"use client";

import { AuthProvider } from "@/lib/auth";
import ClientToaster from "@/components/ClientToaster";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ClientToaster />
    </AuthProvider>
  );
}


