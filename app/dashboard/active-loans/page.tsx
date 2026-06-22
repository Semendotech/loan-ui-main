"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { calculateDailyInstalment, formatKesCurrency } from "@/lib/loanCalculations";

interface LoanItem {
	id: number;
	amount: number;
	interest_rate: number;
	daily_instalment?: number;
	total_amount: number;
	remaining_amount: number;
	start_date: string;
	due_date: string;
	status: string;
	customer: { name: string | null; id_number: string; phone: string | null; location: string | null };
	guarantor: { id: number; name: string; id_number: string; phone: string; location: string | null; relationship: string | null } | null;
}

function getDailyInstalment(loan: LoanItem): number {
	if (typeof loan.daily_instalment === "number" && Number.isFinite(loan.daily_instalment)) {
		return loan.daily_instalment;
	}
	return calculateDailyInstalment(loan.amount, loan.interest_rate);
}

export default function ActiveLoansPage() {
	const { user } = useAuth();
	const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";
	const [loans, setLoans] = useState<LoanItem[]>([]);
	const [q, setQ] = useState("");
	const [loading, setLoading] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editAmount, setEditAmount] = useState<string>("");
	const [editRate, setEditRate] = useState<string>("");
	const [editStartDate, setEditStartDate] = useState<string>("");
	const [editDueDate, setEditDueDate] = useState<string>("");
	const [saving, setSaving] = useState(false);

	const load = async () => {
		setLoading(true);
		try {
			const data = await api.get(`/loans/active${q ? `?q=${encodeURIComponent(q)}` : ""}`);
			const response = (data as any).data ?? data;
			setLoans(Array.isArray(response) ? response : (response?.items ?? []));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const startEdit = (loan: LoanItem) => {
		if (!isAdmin) return;
		setEditingId(loan.id);
		setEditAmount(String(loan.amount ?? ""));
		setEditRate(String(loan.interest_rate ?? ""));
		const startDate = loan.start_date ? (loan.start_date.includes("T") ? loan.start_date.split("T")[0] : loan.start_date) : "";
		const dueDate = loan.due_date ? (loan.due_date.includes("T") ? loan.due_date.split("T")[0] : loan.due_date) : "";
		setEditStartDate(startDate);
		setEditDueDate(dueDate);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditAmount("");
		setEditRate("");
		setEditStartDate("");
		setEditDueDate("");
	};

	const saveEdit = async (loan: LoanItem) => {
		if (!isAdmin) return;
		setSaving(true);
		try {
			const loanPayload: Record<string, string | number> = {};

			if (editAmount.trim()) {
				const amount = parseFloat(editAmount);
				if (!amount || amount <= 0) {
					alert("Enter a valid amount");
					setSaving(false);
					return;
				}
				loanPayload.amount = amount;
			}
			if (editRate.trim()) {
				const rate = parseFloat(editRate);
				if (rate < 0) {
					alert("Interest rate cannot be negative");
					setSaving(false);
					return;
				}
				loanPayload.interest_rate = rate;
			}

			if (editStartDate) {
				loanPayload.start_date = editStartDate;
			}

			if (editDueDate) {
				loanPayload.due_date = editDueDate;
			}

			if (Object.keys(loanPayload).length > 0) {
				await api.patch(`/loans/${loan.id}`, loanPayload);
			}

			await load();
			cancelEdit();
		} catch (e: any) {
			console.error("Update error:", e);
			alert(e?.response?.data?.detail || e?.message || "Failed to update loan");
		} finally {
			setSaving(false);
		}
	};

	const displayLoans = loading ? Array.from({ length: 5 }, (_, idx) => ({ id: idx } as LoanItem)) : loans;

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
				<h1 className="text-2xl font-bold">Active Loans</h1>
				<div className="flex gap-2 w-full md:w-auto">
					<input
						type="text"
						placeholder="Search by Loan ID or Customer ID Number"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="flex-1 md:flex-none md:w-72 px-4 py-2 border border-gray-300 rounded-md text-black text-sm"
					/>
					<button onClick={load} className="px-5 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">
						Search
					</button>
				</div>
			</div>

			<div className="bg-white rounded-lg shadow-sm border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full divide-y divide-gray-200">
						<colgroup>
							<col className="w-[8%]" />
							<col className="w-[13%]" />
							<col className="w-[14%]" />
							<col className="w-[13%]" />
							<col className="w-[24%]" />
							<col className="w-[14%]" />
							<col className="w-[14%]" />
						</colgroup>
						<thead className="bg-gray-50 sticky top-0 z-10">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Loan #</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Daily Instalment</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Remaining</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Timeline</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{!loading && loans.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-4 py-10 text-center text-gray-500">
										No active loans found.
									</td>
								</tr>
							) : (
								displayLoans.map((loan, idx) => (
									<Fragment key={loan.id ?? idx}>
										<tr className="hover:bg-gray-50 even:bg-gray-50/40">
											<td className="px-4 py-3 text-sm font-medium text-gray-900">{loan.id ?? "…"}</td>
											<td className="px-4 py-3 text-sm text-gray-800 text-right tabular-nums">
												{loan.amount != null ? formatKesCurrency(loan.amount) : "…"}
											</td>
											<td className="px-4 py-3 text-sm font-semibold text-green-700 text-right tabular-nums">
												{loan.amount != null && loan.interest_rate != null
													? formatKesCurrency(getDailyInstalment(loan))
													: "…"}
											</td>
											<td className="px-4 py-3 text-sm text-gray-800 text-right tabular-nums">
												{loan.remaining_amount != null ? formatKesCurrency(loan.remaining_amount) : "…"}
											</td>
											<td className="px-4 py-3 text-sm text-gray-800 leading-tight">
												<div className="font-medium">{loan.customer?.name ?? "Unknown"}</div>
												<div className="text-xs text-gray-500 mt-0.5">{loan.customer?.id_number ?? "…"}</div>
											</td>
											<td className="px-4 py-3 text-sm text-gray-600 leading-tight whitespace-nowrap">
												<div>Start: {loan.start_date ?? "…"}</div>
												<div className="mt-0.5">Due: {loan.due_date ?? "…"}</div>
											</td>
											<td className="px-4 py-3 text-sm text-right whitespace-nowrap">
												{loan.id ? (
													<div className="flex justify-end gap-2">
														{isAdmin ? (
															<button
																onClick={() => startEdit(loan)}
																className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 min-w-[60px]"
															>
																Edit
															</button>
														) : null}
														<Link
															href={`/dashboard/loans/${loan.id}`}
															className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-md min-w-[60px] text-center"
														>
															View
														</Link>
													</div>
												) : (
													<span className="text-gray-400">Loading…</span>
												)}
											</td>
										</tr>
										{editingId === loan.id && (
											<tr className="bg-gray-50">
												<td colSpan={7} className="px-4 py-4">
													<div className="space-y-3 border rounded-lg p-4 bg-white">
														<div className="text-xs font-semibold text-gray-700 mb-2">Loan Details</div>
														<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
															<div className="flex flex-col gap-1">
																<label className="text-xs text-gray-600">Principal Amount</label>
																<input
																	type="number"
																	step="0.01"
																	value={editAmount}
																	onChange={(e) => setEditAmount(e.target.value)}
																	className="px-2 py-1.5 border rounded text-sm"
																	placeholder="Amount"
																/>
															</div>
															<div className="flex flex-col gap-1">
																<label className="text-xs text-gray-600">Interest Rate (%)</label>
																<input
																	type="number"
																	step="0.1"
																	value={editRate}
																	onChange={(e) => setEditRate(e.target.value)}
																	className="px-2 py-1.5 border rounded text-sm"
																	placeholder="Rate"
																/>
															</div>
															<div className="flex flex-col gap-1">
																<label className="text-xs text-gray-600">Start Date</label>
																<input
																	type="date"
																	value={editStartDate}
																	onChange={(e) => setEditStartDate(e.target.value)}
																	className="px-2 py-1.5 border rounded text-sm"
																/>
															</div>
															<div className="flex flex-col gap-1">
																<label className="text-xs text-gray-600">Due Date</label>
																<input
																	type="date"
																	value={editDueDate}
																	onChange={(e) => setEditDueDate(e.target.value)}
																	className="px-2 py-1.5 border rounded text-sm"
																/>
															</div>
														</div>

														<div className="flex justify-end gap-2 mt-3">
															<button onClick={cancelEdit} className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">
																Cancel
															</button>
															<button
																onClick={() => saveEdit(loan)}
																disabled={saving}
																className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md disabled:opacity-60 hover:bg-blue-700"
															>
																{saving ? "Saving..." : "Save Changes"}
															</button>
														</div>
														<div className="text-[10px] text-gray-500 mt-2">
															Note: Already-paid installments are preserved; remaining amount is recalculated automatically.
														</div>
													</div>
												</td>
											</tr>
										)}
									</Fragment>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}