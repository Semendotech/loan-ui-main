"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/60 text-slate-800 shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="font-semibold text-xl flex items-center text-slate-900 hover:opacity-80 transition-opacity">
            <img 
              src="/icon-192.png" 
              alt="Loan Management System" 
              className="w-8 h-8 mr-2 rounded"
            />
            <span>Loan System</span>
          </Link>

          {/* Mobile menu button */}
          <button 
            className="md:hidden focus:outline-none"
            onClick={toggleMenu}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="hover:text-green-600 transition-colors">Home</Link>
            
            {isAuthenticated && (
              <>
                <Link href="/dashboard" className="hover:text-green-600 transition-colors">Dashboard</Link>
                <Link href="/changepassword" className="hover:text-green-600 transition-colors">Change Password</Link>
                {user?.role === 'admin' && (
                  <Link href="/admin" className="hover:text-green-600 transition-colors">Admin</Link>
                )}
              </>
            )}
            
            {!isAuthenticated ? (
              <Link 
                href="/login" 
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors shadow"
              >
                Login
              </Link>
            ) : (
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium transition-colors text-white shadow"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 bg-white/80">
            <div className="flex flex-col space-y-3">
              <Link href="/" className="hover:bg-slate-100 py-2 px-3 rounded-md" onClick={toggleMenu}>Home</Link>
              <Link href="/about" className="hover:bg-slate-100 py-2 px-3 rounded-md" onClick={toggleMenu}>About</Link>
              
              {isAuthenticated && (
                <>
                  <Link href="/dashboard" className="hover:bg-slate-100 py-2 px-3 rounded-md" onClick={toggleMenu}>Dashboard</Link>
                  <Link href="/changepassword" className="hover:bg-slate-100 py-2 px-3 rounded-md" onClick={toggleMenu}>Change Password</Link>
                  {user?.role === 'admin' && (
                    <Link href="/admin" className="hover:bg-slate-100 py-2 px-3 rounded-md" onClick={toggleMenu}>Admin</Link>
                  )}
                </>
              )}
              
              {!isAuthenticated ? (
                <Link 
                  href="/login" 
                  className="bg-green-600 text-white py-2 px-3 rounded-md font-medium shadow"
                  onClick={toggleMenu}
                >
                  Login
                </Link>
              ) : (
                <button
                  onClick={() => {
                    logout();
                    toggleMenu();
                  }}
                  className="bg-red-500 hover:bg-red-600 py-2 px-3 rounded-md font-medium text-left text-white shadow"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

