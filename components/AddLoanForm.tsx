"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import config from "@/lib/config";
import { uploadCustomerImage } from "@/lib/cloudinary";
import toast from "react-hot-toast";

interface Customer {
  name: string;
  id_number: string;
  phone: string;
  location?: string;
  profile_image_url?: string | null;
}

interface CustomerCheckResponse {
  exists: boolean;
  has_active_loan: boolean;
  has_overdue_loans: boolean;
  customer: (Customer & { id: number; }) | null;
}

interface CreatedLoanResponse {
  id: number;
  document_url?: string;
}

export default function AddLoanForm() {
  const { isAuthenticated, loading } = useAuth();

  const router = useRouter();

  const [customerIdNumber, setCustomerIdNumber] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [customerExists, setCustomerExists] = useState(false);

  const [customerForm, setCustomerForm] = useState<Customer>({
    name: "",
    id_number: "",
    phone: "",
    location: "",
    profile_image_url: "",
  });

  const [loanForm, setLoanForm] = useState({
    amount: "",
    interest_rate: "20",
    start_date: new Date().toISOString().split("T")[0],
  });

  const [guarantorForm, setGuarantorForm] = useState({
    name: "",
    id_number: "",
    phone: "",
    location: "",
    relationship: "",
  });

  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [hasOverdueLoans, setHasOverdueLoans] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingLoans, setExistingLoans] = useState<any[]>([]);
  const [existingOverdue, setExistingOverdue] = useState<any[]>([]);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [useCamera, setUseCamera] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  const handleLookup = async () => {
    if (!customerIdNumber) {
      toast.error("Please enter ID Number");
      return;
    }
    setLookupStatus("loading");
    try {
      const data = await api.post<CustomerCheckResponse>("/customers/check", { id_number: customerIdNumber });
      setHasActiveLoan(!!data.has_active_loan);
      setHasOverdueLoans(!!data.has_overdue_loans);
      if (data.exists && data.customer) {
        setCustomerExists(true);
        setSelectedCustomerId(data.customer.id);
        setCustomerPhotoUrl(data.customer.profile_image_url || null);
        setCustomerForm({
          name: data.customer.name,
          id_number: data.customer.id_number,
          phone: data.customer.phone,
          location: (data.customer as any).location || "",
          profile_image_url: data.customer.profile_image_url || "",
        });
        toast.success("Customer found and loaded");
        // Load detailed loans/arrears for conditional UI display
        try {
          const detail = await api.get(`/customers/by-id-number/${encodeURIComponent(data.customer.id_number)}`);
          const d = (detail as any).data ?? detail;
          if (Array.isArray(d.loans)) {
            setExistingLoans(d.loans);
            const activeLoanExists = d.loans.some((l: any) => (l.status || "").toLowerCase() === "active");
            if (activeLoanExists) {
              setHasActiveLoan(true);
            }
          } else {
            setExistingLoans([]);
          }
          if (Array.isArray(d.arrears)) {
            setExistingOverdue(d.arrears);
            const overdueExists = d.arrears.some((a: any) => !a.is_cleared);
            if (overdueExists) {
              setHasOverdueLoans(true);
            }
          } else {
            setExistingOverdue([]);
          }
          if (d.profile_image_url) {
            setCustomerPhotoUrl(d.profile_image_url);
            setCustomerForm((prev) => ({ ...prev, profile_image_url: d.profile_image_url }));
          }
        } catch (_) {}
      } else {
        setCustomerExists(false);
        setSelectedCustomerId(null);
        setCustomerPhotoUrl(null);
        setCustomerForm({ name: "", id_number: "", phone: "", location: "", profile_image_url: "" });
        toast("Customer not found. Please add new customer details.");
        setExistingLoans([]);
        setExistingOverdue([]);
        setHasActiveLoan(false);
        setHasOverdueLoans(false);
      }
      setLookupStatus("success");
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.detail || "Something went wrong while checking customer";
      toast.error(message);
      setLookupStatus("error");
    }
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoanForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuarantorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGuarantorForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoButtonClick = (camera: boolean) => {
    setUseCamera(camera);
    // Small delay to ensure state is set before clicking
    setTimeout(() => {
    photoInputRef.current?.click();
    }, 0);
  };

  const handlePhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setUseCamera(null);
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const uploadedUrl = await uploadCustomerImage(file);
      setCustomerPhotoUrl(uploadedUrl);
      setCustomerForm((prev) => ({ ...prev, profile_image_url: uploadedUrl }));

      if (customerExists && selectedCustomerId) {
        await api.patch(`/customers/${selectedCustomerId}/photo`, {
          profile_image_url: uploadedUrl,
        });
        toast.success("Customer photo updated");
      } else {
        toast.success("Photo attached. Save the customer to persist it.");
      }
    } catch (error: any) {
      const message = error?.message || "Failed to upload image";
      toast.error(message);
    } finally {
      setIsUploadingPhoto(false);
      setUseCamera(null);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const photoPreviewSrc = customerPhotoUrl || "/avatar-placeholder.svg";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasActiveLoan || hasOverdueLoans) {
      toast.error("Customer has active loans or overdue balances that must be cleared first");
      return;
    }
    setIsSubmitting(true);
    try {
      if (!customerExists) {
        if (!customerForm.id_number) {
          toast.error("ID Number is required for new customers");
          setIsSubmitting(false);
          return;
        }
        const createdCustomer = await api.post<(Customer & { id: number })>("/customers", customerForm);
        setCustomerExists(true);
        setSelectedCustomerId(createdCustomer.id);
      }
      const loanData: any = {
        id_number: customerForm.id_number,
        amount: parseFloat(loanForm.amount),
        interest_rate: parseFloat(loanForm.interest_rate),
        start_date: loanForm.start_date,
      };

      // Always include guarantor (required)
      loanData.guarantor = {
        name: guarantorForm.name,
        id_number: guarantorForm.id_number,
        phone: guarantorForm.phone,
        location: guarantorForm.location || undefined,
        relationship: guarantorForm.relationship || undefined,
      };

      const createdLoan = await api.post<CreatedLoanResponse>("/loans", loanData);
      toast.success("Loan created successfully");
      if (typeof window !== "undefined" && createdLoan?.id) {
        const printablePath =
          createdLoan.document_url ?? `/loans/${createdLoan.id}/printable`;
        const pdfUrl = `${config.api.baseUrl}${printablePath}`;
        window.open(pdfUrl, "_blank", "noopener,noreferrer");
      }
      router.push("/dashboard");
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.detail || "Failed to create loan";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <input
        type="file"
        accept="image/*"
        ref={photoInputRef}
        className="hidden"
        onChange={handlePhotoSelected}
        capture={useCamera === true ? "environment" : undefined}
      />
      <h1 className="text-2xl font-bold mb-6">Add New Loan</h1>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Customer Lookup</h2>
        <div className="flex items-end gap-4">
          <div className="w-full md:w-1/2">
            <label htmlFor="customerIdNumber" className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
            <input type="text" id="customerIdNumber" value={customerIdNumber} onChange={(e) => setCustomerIdNumber(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-4 focus:ring-green-200 focus:border-green-500 shadow-sm" placeholder="Enter ID number" />
          </div>
          <button type="button" onClick={handleLookup} disabled={lookupStatus === "loading"} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50">
            {lookupStatus === "loading" ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {lookupStatus === "success" && (
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">{customerExists ? "Customer Information" : "New Customer Information"}</h2>
            {(hasActiveLoan || hasOverdueLoans) && (
              <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
                <p className="font-medium">Warning:</p>
                <ul className="list-disc list-inside">
                  {hasActiveLoan && (<li>Customer has an active loan that must be cleared first</li>)}
                  {hasOverdueLoans && (<li>Customer has overdue balances that must be cleared first</li>)}
                </ul>
              </div>
            )}
            <div className="mt-4 flex flex-col lg:flex-row gap-6">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" id="name" name="name" value={customerForm.name} onChange={handleCustomerChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:ring-green-500 focus:border-green-500" placeholder="Enter full name" required readOnly={customerExists} />
                </div>
                <div>
                  <label htmlFor="id_number" className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                  <input type="text" id="id_number" name="id_number" value={customerForm.id_number} onChange={handleCustomerChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:ring-green-500 focus:border-green-500" placeholder="Enter ID number" required readOnly={customerExists} />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="tel" id="phone" name="phone" value={customerForm.phone} onChange={handleCustomerChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:ring-green-500 focus:border-green-500" placeholder="Enter phone number" required readOnly={customerExists} />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" id="location" name="location" value={customerForm.location} onChange={handleCustomerChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:ring-green-500 focus:border-green-500" placeholder="Enter location" required readOnly={customerExists} />
                </div>
              </div>
              <div className="w-full lg:w-64">
                <div className="border rounded-lg p-4 bg-gray-50 flex flex-col items-center text-center gap-3">
                  <div className="w-32 h-32 rounded-full overflow-hidden border bg-white flex items-center justify-center">
                    <img
                      src={photoPreviewSrc}
                      alt="Customer avatar"
                      className={`w-full h-full object-cover ${customerPhotoUrl ? "" : "p-6 opacity-70"}`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/avatar-placeholder.svg";
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => handlePhotoButtonClick(true)}
                      disabled={isUploadingPhoto}
                      className="px-4 py-2 text-sm rounded-md border border-blue-600 text-blue-700 hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {isUploadingPhoto ? "Uploading..." : "Take Photo"}
                    </button>
                  <button
                    type="button"
                      onClick={() => handlePhotoButtonClick(false)}
                    disabled={isUploadingPhoto}
                      className="px-4 py-2 text-sm rounded-md border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {isUploadingPhoto ? "Uploading..." : customerPhotoUrl ? "Change Photo" : "Choose File"}
                  </button>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 5MB. Stored securely on Cloudinary.</p>
                </div>
              </div>
            </div>
          </div>

          {(hasActiveLoan || hasOverdueLoans) ? (
            <>
              <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
                This customer has an existing active loan or overdue balance and cannot be issued another loan.
              </div>
              {/* Existing details for context */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold mb-2">Existing Loans</div>
                  {existingLoans.length === 0 ? (
                    <div className="text-sm text-gray-600">No loans</div>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {existingLoans.map((l: any) => (
                        <li key={l.id} className="p-3 border rounded">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">KSh {l.amount}</div>
                            <span className={`text-xs px-2 py-1 rounded-full ${(l.status||'').toLowerCase()==='completed' ? 'bg-gray-100 text-gray-700' : 'bg-green-50 text-green-700'}`}>{l.status}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">Start: {l.start_date} · Due: {l.due_date}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold mb-2">Overdue</div>
                  {existingOverdue.length === 0 ? (
                    <div className="text-sm text-gray-600">No overdue balances</div>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {existingOverdue.map((a: any) => (
                        <li key={a.id} className="p-3 border rounded">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Remaining: KSh {a.remaining_amount}</div>
                            <span className={`text-xs px-2 py-1 rounded-full ${a.is_cleared ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-700'}`}>{a.is_cleared ? 'Cleared' : 'Active'}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">Overdue since: {a.arrears_date}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Loan Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
                    <input type="number" id="amount" name="amount" value={loanForm.amount} onChange={handleLoanChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:ring-green-500 focus:border-green-500" placeholder="Enter loan amount" required min="1" step="0.01" />
                  </div>
              <div>
                <label htmlFor="interest_rate" className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                <input
                  type="number"
                  id="interest_rate"
                  name="interest_rate"
                  value={loanForm.interest_rate}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-500 bg-gray-100 cursor-not-allowed"
                />
              </div>
                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input type="date" id="start_date" name="start_date" value={loanForm.start_date} onChange={handleLoanChange} className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:ring-green-500 focus:border-green-500" required />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Guarantor Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="guarantor_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      id="guarantor_name"
                      name="name"
                      value={guarantorForm.name}
                      onChange={handleGuarantorChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter guarantor full name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="guarantor_id_number" className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                    <input
                      type="text"
                      id="guarantor_id_number"
                      name="id_number"
                      value={guarantorForm.id_number}
                      onChange={handleGuarantorChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter guarantor ID number"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="guarantor_phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      id="guarantor_phone"
                      name="phone"
                      value={guarantorForm.phone}
                      onChange={handleGuarantorChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter guarantor phone number"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="guarantor_relationship" className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <select
                      id="guarantor_relationship"
                      name="relationship"
                      value={guarantorForm.relationship}
                      onChange={handleGuarantorChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Select relationship</option>
                      <option value="Family">Family</option>
                      <option value="Friend">Friend</option>
                      <option value="Colleague">Colleague</option>
                      <option value="Business Partner">Business Partner</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="guarantor_location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      id="guarantor_location"
                      name="location"
                      value={guarantorForm.location}
                      onChange={handleGuarantorChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-black focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter guarantor location (optional)"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50">
                  {isSubmitting ? "Creating Loan..." : "Create Loan"}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}


