"use client";

import { Toaster } from "react-hot-toast";

export default function ClientToaster() {
  return (
    <Toaster 
      position="top-center" 
      toastOptions={{
        duration: 8000,
        success: {
          style: {
            background: '#059669',
            color: 'white',
          },
        },
        error: {
          style: {
            background: '#EF4444',
            color: 'white',
          },
        },
      }}
    />
  );
}




















