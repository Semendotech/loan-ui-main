"use client"
import React, { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import LoanStatusBadge from './LoanStatusBadge'

type Installment = {
  id: number
  amount: number
  payment_date: string
  loan_id: number
  recorded_by?: string
}

export default function PaymentHistory({ loanId }: { loanId: number | string }) {
  const [installments, setInstallments] = useState<Installment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loan, setLoan] = useState<any>(null)
  const prevRemaining = useRef<number | null>(null)

  const fetchData = async () => {
    try {
      const loanRes = await api.get(`/loans/${loanId}`)
      const loanData = (loanRes as any).data ?? loanRes
      setLoan(loanData)

      const res = await api.get(`/customers/${loanData.customer?.id}/installments`)
      const installmentsData = (res as any).data ?? res
      setInstallments(installmentsData)

      // detect balance change
      if (prevRemaining.current != null && loanData.remaining_amount != null) {
        if (loanData.remaining_amount !== prevRemaining.current) {
          toast.success(`Payment received! New balance: KES ${loanData.remaining_amount?.toLocaleString?.()}`)
        }
      }
      prevRemaining.current = loanData.remaining_amount ?? null
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 30000)
    const onFocus = () => fetchData()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [loanId])

  if (loading) {
    return (
      <div className="p-4 bg-white rounded shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!installments || installments.length === 0) {
    return (
      <div className="p-4 bg-white rounded shadow-sm">
        <div className="font-semibold mb-2">Payment History</div>
        <div className="text-sm text-gray-500">No payments recorded yet.</div>
      </div>
    )
  }

  const amountPaid = (loan?.total_amount ?? 0) - (loan?.remaining_amount ?? 0)
  const percentPaid = loan?.total_amount ? Math.min(100, Math.round((amountPaid / loan.total_amount) * 100)) : 0

  return (
    <div className="p-4 bg-white rounded shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Payment History</div>
        <div>
          <LoanStatusBadge status={loan?.status ?? 'UNKNOWN'} />
        </div>
      </div>

      <div className="mb-3">
        <div className="text-sm text-gray-600">Total: KES {loan?.total_amount?.toLocaleString?.()}</div>
        <div className="text-sm text-gray-600">Paid: KES {amountPaid?.toLocaleString?.()}</div>
        <div className="text-sm text-gray-600">Remaining: KES {loan?.remaining_amount?.toLocaleString?.()}</div>
        <div className="w-full bg-gray-100 h-3 rounded mt-2 overflow-hidden">
          <div className="h-3 bg-green-500" style={{ width: `${percentPaid}%` }} />
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500">
            <th className="pb-2">Date</th>
            <th className="pb-2">Amount Paid</th>
            <th className="pb-2">Recorded By</th>
            <th className="pb-2">Remaining Balance</th>
          </tr>
        </thead>
        <tbody>
          {installments.map((it) => (
            <tr key={it.id} className="border-t">
              <td className="py-2">{new Date(it.payment_date).toLocaleString()}</td>
              <td className="py-2">KES {it.amount?.toLocaleString?.()}</td>
              <td className="py-2">{it.recorded_by || "System"}</td>
              <td className="py-2">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
