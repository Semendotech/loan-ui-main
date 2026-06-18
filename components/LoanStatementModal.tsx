import React, { useState } from "react";
import { X, Download } from "lucide-react";
import { api } from "@/lib/api";
import { formatKesCurrency } from "@/lib/loanCalculations";
import toast from "react-hot-toast";

interface LoanStatementModalProps {
  customerId: string;
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface StatementRow {
  date: string;
  amount: number;
  balance: number;
}

interface StatementData {
  customer_name: string;
  customer_id: string;
  customer_phone: string;
  loan_amount: number;
  interest_rate: number;
  daily_instalment: number;
  opening_balance: number;
  closing_balance: number;
  total_paid: number;
  payments: StatementRow[];
}

export default function LoanStatementModal({
  customerId,
  customerName,
  isOpen,
  onClose,
}: LoanStatementModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(
        `/customers/${customerId}/loan-statement?start_date=${startDate}&end_date=${endDate}`
      );
      const data = (response as any)?.data ?? response;
      setStatement(data);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load loan statement");
      setStatement(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!statement || !startDate || !endDate) {
      toast.error("Please generate statement first");
      return;
    }

    try {
      setDownloadingPdf(true);
      const response = await api.get<Response>(
        `/customers/${customerId}/loan-statement-pdf?start_date=${startDate}&end_date=${endDate}`,
        { rawResponse: true }
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `loan_statement_${customerId}_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Statement PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download statement PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleClose = () => {
    setStartDate("");
    setEndDate("");
    setStatement(null);
    setSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold">Loan Statement</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Generate Statement"}
                </button>
              </div>
            </form>
          ) : statement ? (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer Name:</span>
                  <span className="font-medium">{statement.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID Number:</span>
                  <span className="font-medium">{statement.customer_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone Number:</span>
                  <span className="font-medium">{statement.customer_phone}</span>
                </div>
              </div>

              {/* Loan Details */}
              <div className="bg-blue-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Loan Amount:</span>
                  <span className="font-medium">{formatKesCurrency(statement.loan_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest Rate:</span>
                  <span className="font-medium">{statement.interest_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Instalment:</span>
                  <span className="font-medium">{formatKesCurrency(statement.daily_instalment)}</span>
                </div>
              </div>

              {/* Payments Table */}
              <div>
                <h3 className="font-semibold mb-3">Payments Made</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {statement.payments.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                            No payments in this period
                          </td>
                        </tr>
                      ) : (
                        statement.payments.map((payment, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{payment.date}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatKesCurrency(payment.amount)}</td>
                            <td className="px-4 py-2 text-right text-gray-700">{formatKesCurrency(payment.balance)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm border-l-4 border-blue-600">
                <div className="flex justify-between font-semibold">
                  <span>Opening Balance:</span>
                  <span>{formatKesCurrency(statement.opening_balance)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Paid in Period:</span>
                  <span className="text-green-700">{formatKesCurrency(statement.total_paid)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
                  <span>Closing Balance:</span>
                  <span className="text-orange-700">{formatKesCurrency(statement.closing_balance)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4">
                <button
                  onClick={() => {
                    setStatement(null);
                    setSubmitted(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {downloadingPdf ? "Downloading..." : "Download PDF"}
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
