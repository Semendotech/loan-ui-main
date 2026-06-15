"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import dynamic from 'next/dynamic'

const PaymentHistory = dynamic(() => import('@/components/PaymentHistory'), { ssr: false })
const LoanStatusBadge = dynamic(() => import('@/components/LoanStatusBadge'), { ssr: false })

export default function LoanDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const loanId = params?.id as string;
	const [loan, setLoan] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const load = async () => {
			try {
				const data = await api.get(`/loans/${encodeURIComponent(loanId)}`);
				setLoan((data as any).data ?? data);
			} finally {
				setLoading(false);
			}
		};
		if (loanId) load();
	}, [loanId]);

	if (loading) return <div className="p-6">Loading…</div>;
	if (!loan) return <div className="p-6">Loan not found</div>;

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold">Loan #{loan.id}</h1>
				<button onClick={() => router.back()} className="px-3 py-2 bg-gray-200 rounded">Back</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="p-4 rounded-lg bg-white border shadow-sm">
					<div className="font-semibold mb-2">Loan Summary</div>
					<div className="text-sm text-gray-700 space-y-1">
						<div>Status: <span className="font-medium">{loan.status}</span></div>
						<div>Amount: <span className="font-medium">KSh {loan.amount?.toLocaleString?.()}</span></div>
						<div>Total: <span className="font-medium">KSh {loan.total_amount?.toLocaleString?.()}</span></div>
						<div>Remaining: <span className="font-medium">KSh {loan.remaining_amount?.toLocaleString?.()}</span></div>
						<div>Interest: {loan.interest_rate}%</div>
						<div>Start: {loan.start_date} · Due: {loan.due_date}</div>
					</div>
				</div>

				<div className="p-4 rounded-lg bg-white border shadow-sm">
					<div className="font-semibold mb-2">Customer</div>
					<div className="text-sm text-gray-700 space-y-1">
						<div>Name: {loan.customer?.name ?? "-"}</div>
						<div>ID Number: {loan.customer?.id_number ?? "-"}</div>
						<div>Phone: {loan.customer?.phone ?? "-"}</div>
						<div>Location: {loan.customer?.location ?? "-"}</div>
					</div>
				</div>

				<div className="p-4 rounded-lg bg-white border shadow-sm">
					<div className="font-semibold mb-2">Guarantor</div>
					{loan.guarantor ? (
						<div className="text-sm text-gray-700 space-y-1">
							<div>Name: {loan.guarantor.name}</div>
							<div>ID Number: {loan.guarantor.id_number}</div>
							<div>Phone: {loan.guarantor.phone}</div>
							<div>Relationship: {loan.guarantor.relationship ?? "-"}</div>
							<div>Location: {loan.guarantor.location ?? "-"}</div>
						</div>
					) : (
						<div className="text-sm text-gray-500">No guarantor</div>
					)}
				</div>
			</div>
		</div>
		
		<div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
			<div>
				{/* Payment history and status */}
				{/* @ts-ignore */}
				<PaymentHistory loanId={loan.id} />
			</div>
			<div className="p-4 rounded-lg bg-white border shadow-sm">
				<div className="font-semibold mb-2">Loan Details</div>
				<div className="text-sm text-gray-700 space-y-1">
					<div>Total Loan: <span className="font-medium">KSh {loan.total_amount?.toLocaleString?.()}</span></div>
					<div>Amount Paid: <span className="font-medium">KSh {(loan.total_amount - loan.remaining_amount)?.toLocaleString?.()}</span></div>
					<div>Remaining: <span className="font-medium">KSh {loan.remaining_amount?.toLocaleString?.()}</span></div>
					<div>Due Date: <span className="font-medium">{loan.due_date}</span></div>
					<div>Status: <span className="font-medium"><LoanStatusBadge status={loan.status} /></span></div>
				</div>
			</div>
		</div>
	);
}









