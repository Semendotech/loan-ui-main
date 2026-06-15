import React from 'react'

type Props = { status: string }

const colors: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  ARREARS: 'bg-orange-100 text-orange-800',
}

export default function LoanStatusBadge({ status }: Props) {
  const cls = colors[status] ?? 'bg-gray-100 text-gray-800'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}
