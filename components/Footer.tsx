import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-green-700 to-green-800 text-white py-8 mt-12 relative z-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Loan Management System</h3>
            <p className="text-green-100 text-sm">
              Your comprehensive solution for managing loans, tracking payments, and analyzing financial data.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-green-100">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <p className="text-green-100 text-sm">
              Have questions or need assistance? <br />
              <a href="mailto:support@loansystem.com" className="text-white hover:underline">
                support@loansystem.com
              </a>
            </p>
          </div>
        </div>
        
        <div className="border-t border-green-600 mt-8 pt-6 text-center text-green-100">
          <p>© {new Date().getFullYear()} Loan Management System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
