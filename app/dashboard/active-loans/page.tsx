"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface LoanItem {
	id: number;
	amount: number;
	interest_rate: number;
	total_amount: number;
	remaining_amount: number;
	start_date: string;
	due_date: string;
	status: string;
	customer: { name: string | null; id_number: string; phone: string | null; location: string | null };
	guarantor: { id: number; name: string; id_number: string; phone: string; location: string | null; relationship: string | null } | null;
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
			// Backend returns { items: [...], limit, offset, count, has_more }
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
		// Initialize dates - handle both date string formats
		const startDate = loan.start_date ? (loan.start_date.includes('T') ? loan.start_date.split('T')[0] : loan.start_date) : "";
		const dueDate = loan.due_date ? (loan.due_date.includes('T') ? loan.due_date.split('T')[0] : loan.due_date) : "";
		setEditStartDate(startDate);
		setEditDueDate(dueDate);
		// Initialize guarantor fields if exists
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
			// Build loan update payload
			const loanPayload: any = {};
			
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

			// Update loan if there are changes
			if (Object.keys(loanPayload).length > 0) {
				await api.patch(`/loans/${loan.id}`, loanPayload);
			}

			// Update guarantor details if loan has a guarantor and fields were changed
			if (loan.guarantor) {
				const guarantorPayload: any = {};
				
				if (editGuarantorName.trim()) {
					guarantorPayload.name = editGuarantorName.trim();
				}
				if (editGuarantorId.trim()) {
					guarantorPayload.id_number = editGuarantorId.trim();
				}
				if (editGuarantorPhone.trim()) {
					guarantorPayload.phone = editGuarantorPhone.trim();
				}
				if (editGuarantorLocation.trim()) {
					guarantorPayload.location = editGuarantorLocation.trim();
				}
				if (editGuarantorRelationship.trim()) {
					guarantorPayload.relationship = editGuarantorRelationship.trim();
				}

				// Only send guarantor update if there are changes
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

	const placeholders = Array.from({ length: 6 }, () => ({} as any));

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="flex items-center justify-between mb-6">
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

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{(loading ? placeholders : loans).map((l: any, idx: number) => (
					<div key={l?.id ?? idx} className="border rounded-lg p-4 bg-white shadow-sm">
						<div className="flex items-center justify-between mb-2">
							<div className="font-semibold">Loan #{l?.id ?? "…"}</div>
							<span className={`text-xs px-2 py-1 rounded ${l?.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"}`}>{l?.status ?? ""}</span>
						</div>
						<div className="text-sm text-gray-700">
							<div>Amount: <span className="font-medium">KSh {l?.amount?.toLocaleString?.() ?? "…"}</span></div>
							<div>Remaining: <span className="font-medium">KSh {l?.remaining_amount?.toLocaleString?.() ?? "…"}</span></div>
							<div>Customer: {l?.customer?.name ?? "Unknown"} ({l?.customer?.id_number ?? "…"})</div>
							{l?.guarantor && (<div>Guarantor: {l.guarantor.name} ({l.guarantor.relationship || "-"})</div>)}
							<div className="text-xs text-gray-500 mt-1">Start {l?.start_date ?? "…"} · Due {l?.due_date ?? "…"}</div>
						</div>
						{editingId === l?.id ? (
							<div className="mt-3 space-y-3 border-t pt-3">
								<div className="text-xs font-semibold text-gray-700 mb-2">Loan Details</div>
								<div className="grid grid-cols-2 gap-2">
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

								{l?.guarantor && (
									<>
										<div className="text-xs font-semibold text-gray-700 mt-3 mb-2">Guarantor Details</div>
										<div className="grid grid-cols-2 gap-2">
											<div className="flex flex-col gap-1">
												<label className="text-xs text-gray-600">Name</label>
												<input
													type="text"
													value={editGuarantorName}
													onChange={(e) => setEditGuarantorName(e.target.value)}
													className="px-2 py-1.5 border rounded text-sm"
													placeholder="Name"
												/>
											</div>
											<div className="flex flex-col gap-1">
												<label className="text-xs text-gray-600">ID Number</label>
												<input
													type="text"
													value={editGuarantorId}
													onChange={(e) => setEditGuarantorId(e.target.value)}
													className="px-2 py-1.5 border rounded text-sm"
													placeholder="ID Number"
												/>
											</div>
											<div className="flex flex-col gap-1">
												<label className="text-xs text-gray-600">Phone</label>
												<input
													type="text"
													value={editGuarantorPhone}
													onChange={(e) => setEditGuarantorPhone(e.target.value)}
													className="px-2 py-1.5 border rounded text-sm"
													placeholder="Phone"
												/>
											</div>
											<div className="flex flex-col gap-1">
												<label className="text-xs text-gray-600">Location</label>
												<input
													type="text"
													value={editGuarantorLocation}
													onChange={(e) => setEditGuarantorLocation(e.target.value)}
													className="px-2 py-1.5 border rounded text-sm"
													placeholder="Location"
												/>
											</div>
											<div className="flex flex-col gap-1 col-span-2">
												<label className="text-xs text-gray-600">Relationship</label>
												<input
													type="text"
													value={editGuarantorRelationship}
													onChange={(e) => setEditGuarantorRelationship(e.target.value)}
													className="px-2 py-1.5 border rounded text-sm"
													placeholder="e.g., Friend, Family, Colleague"
												/>
											</div>
										</div>
									</>
								)}

								<div className="flex justify-end gap-2 mt-3">
									<button onClick={cancelEdit} className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">Cancel</button>
									<button
										onClick={() => saveEdit(l)}
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
						) : (
							<div className="mt-3 flex justify-end gap-2">
								{l?.id ? (
									<>
										<button
											onClick={() => startEdit(l)}
											className="px-3 py-2 text-sm border rounded-md"
										>
											Edit
										</button>
										<Link href={`/dashboard/loans/${l.id}`} className="px-3 py-2 text-sm bg-gray-900 text-white rounded-md">View Details</Link>
									</>
								) : (
									<span className="px-3 py-2 text-sm bg-gray-200 text-gray-500 rounded-md">Loading…</span>
								)}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
