"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
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

function statusBadgeClass(status: string): string {
	const normalized = status.toUpperCase();
	if (normalized === "ACTIVE") return "bg-green-100 text-green-700";
	if (normalized === "ARREARS") return "bg-amber-100 text-amber-800";
	return "bg-gray-100 text-gray-700";
}

export default function ActiveLoansPage() {
	const [loans, setLoans] = useState<LoanItem[]>([]);
	const [q, setQ] = useState("");
	const [loading, setLoading] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editAmount, setEditAmount] = useState<string>("");
	const [editRate, setEditRate] = useState<string>("");
	const [editStartDate, setEditStartDate] = useState<string>("");
	const [editDueDate, setEditDueDate] = useState<string>("");
	const [editGuarantorName, setEditGuarantorName] = useState<string>("");
	const [editGuarantorId, setEditGuarantorId] = useState<string>("");
	const [editGuarantorPhone, setEditGuarantorPhone] = useState<string>("");
	const [editGuarantorLocation, setEditGuarantorLocation] = useState<string>("");
	const [editGuarantorRelationship, setEditGuarantorRelationship] = useState<string>("");
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
		setEditingId(loan.id);
		setEditAmount(String(loan.amount ?? ""));
		setEditRate(String(loan.interest_rate ?? ""));
		const startDate = loan.start_date ? (loan.start_date.includes("T") ? loan.start_date.split("T")[0] : loan.start_date) : "";
		const dueDate = loan.due_date ? (loan.due_date.includes("T") ? loan.due_date.split("T")[0] : loan.due_date) : "";
		setEditStartDate(startDate);
		setEditDueDate(dueDate);
		if (loan.guarantor) {
			setEditGuarantorName(loan.guarantor.name ?? "");
			setEditGuarantorId(loan.guarantor.id_number ?? "");
			setEditGuarantorPhone(loan.guarantor.phone ?? "");
			setEditGuarantorLocation(loan.guarantor.location ?? "");
			setEditGuarantorRelationship(loan.guarantor.relationship ?? "");
		} else {
			setEditGuarantorName("");
			setEditGuarantorId("");
			setEditGuarantorPhone("");
			setEditGuarantorLocation("");
			setEditGuarantorRelationship("");
		}
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditAmount("");
		setEditRate("");
		setEditStartDate("");
		setEditDueDate("");
		setEditGuarantorName("");
		setEditGuarantorId("");
		setEditGuarantorPhone("");
		setEditGuarantorLocation("");
		setEditGuarantorRelationship("");
	};

	const saveEdit = async (loan: LoanItem) => {
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

			if (loan.guarantor) {
				const guarantorPayload: Record<string, string> = {};

				if (editGuarantorName.trim()) guarantorPayload.name = editGuarantorName.trim();
				if (editGuarantorId.trim()) guarantorPayload.id_number = editGuarantorId.trim();
				if (editGuarantorPhone.trim()) guarantorPayload.phone = editGuarantorPhone.trim();
				if (editGuarantorLocation.trim()) guarantorPayload.location = editGuarantorLocation.trim();
				if (editGuarantorRelationship.trim()) guarantorPayload.relationship = editGuarantorRelationship.trim();

				if (Object.keys(guarantorPayload).length > 0) {
					await api.patch(`/loans/${loan.id}/guarantor/${loan.guarantor.id}`, guarantorPayload);
				}
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
		<div className="container mx-auto px-4 py-6">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
				<h1 className="text-2xl font-bold">Active Loans</h1>
				<div className="flex gap-2">
					<input
						type="text"
						placeholder="Search by Loan ID or Customer ID Number"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="px-4 py-2 border border-gray-300 rounded-md text-black"
					/>
					<button onClick={load} className="px-4 py-2 bg-green-600 text-white rounded-md">
						Search
					</button>
				</div>
			</div>

			<div className="bg-white rounded-lg shadow-sm border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-[1100px] table-auto divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Loan #</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Interest Rate</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Daily Instalment</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Remaining</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Guarantor</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Timeline</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{!loading && loans.length === 0 ? (
								<tr>
									<td colSpan={10} className="px-4 py-10 text-center text-gray-500">
										No active loans found.
									</td>
								</tr>
							) : (
								displayLoans.map((loan, idx) => (
									<Fragment key={loan.id ?? idx}>
										<tr className="hover:bg-gray-50">
											<td className="px-4 py-3 text-sm font-medium text-gray-900">{loan.id ?? "…"}</td>
											<td className="px-4 py-3 text-sm">
												<span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadgeClass(loan.status ?? "")}`}>
													{loan.status ?? "…"}
												</span>
											</td>
											<td className="px-4 py-3 text-sm text-gray-800">
												{loan.amount != null ? formatKesCurrency(loan.amount) : "…"}
											</td>
											<td className="px-4 py-3 text-sm text-gray-800">
												{loan.interest_rate != null ? `${loan.interest_rate}%` : "…"}
											</td>
											<td className="px-4 py-3 text-sm font-semibold text-green-700">
												{loan.amount != null && loan.interest_rate != null
													? formatKesCurrency(getDailyInstalment(loan))
													: "…"}
											</td>
											<td className="px-4 py-3 text-sm text-gray-800">
												{loan.remaining_amount != null ? formatKesCurrency(loan.remaining_amount) : "…"}
											</td>
											<td className="px-4 py-3 text-sm text-gray-800">
												<div className="font-medium">{loan.customer?.name ?? "Unknown"}</div>
												<div className="text-xs text-gray-500">{loan.customer?.id_number ?? "…"}</div>
											</td>
											<td className="px-4 py-3 text-sm text-gray-800">
												{loan.guarantor ? (
													<>
														<div className="font-medium">{loan.guarantor.name}</div>
														<div className="text-xs text-gray-500">{loan.guarantor.relationship || "-"}</div>
													</>
												) : (
													<span className="text-gray-400">—</span>
												)}
											</td>
											<td className="px-4 py-3 text-sm text-gray-600">
												<div>Start: {loan.start_date ?? "…"}</div>
												<div>Due: {loan.due_date ?? "…"}</div>
											</td>
											<td className="px-4 py-3 text-sm text-right whitespace-nowrap">
												{loan.id ? (
													<div className="flex justify-end gap-2">
														<button
															onClick={() => startEdit(loan)}
															className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
														>
															Edit
														</button>
														<Link
															href={`/dashboard/loans/${loan.id}`}
															className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-md"
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
												<td colSpan={10} className="px-4 py-4">
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

														{loan.guarantor && (
															<>
																<div className="text-xs font-semibold text-gray-700 mt-3 mb-2">Guarantor Details</div>
																<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
																	<div className="flex flex-col gap-1">
																		<label className="text-xs text-gray-600">Name</label>
																		<input
																			type="text"
																			value={editGuarantorName}
																			onChange={(e) => setEditGuarantorName(e.target.value)}
																			className="px-2 py-1.5 border rounded text-sm"
																		/>
																	</div>
																	<div className="flex flex-col gap-1">
																		<label className="text-xs text-gray-600">ID Number</label>
																		<input
																			type="text"
																			value={editGuarantorId}
																			onChange={(e) => setEditGuarantorId(e.target.value)}
																			className="px-2 py-1.5 border rounded text-sm"
																		/>
																	</div>
																	<div className="flex flex-col gap-1">
																		<label className="text-xs text-gray-600">Phone</label>
																		<input
																			type="text"
																			value={editGuarantorPhone}
																			onChange={(e) => setEditGuarantorPhone(e.target.value)}
																			className="px-2 py-1.5 border rounded text-sm"
																		/>
																	</div>
																	<div className="flex flex-col gap-1">
																		<label className="text-xs text-gray-600">Location</label>
																		<input
																			type="text"
																			value={editGuarantorLocation}
																			onChange={(e) => setEditGuarantorLocation(e.target.value)}
																			className="px-2 py-1.5 border rounded text-sm"
																		/>
																	</div>
																	<div className="flex flex-col gap-1 sm:col-span-2">
																		<label className="text-xs text-gray-600">Relationship</label>
																		<input
																			type="text"
																			value={editGuarantorRelationship}
																			onChange={(e) => setEditGuarantorRelationship(e.target.value)}
																			className="px-2 py-1.5 border rounded text-sm"
																		/>
																	</div>
																</div>
															</>
														)}

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
