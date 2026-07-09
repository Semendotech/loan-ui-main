"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import config from "@/lib/config";
import { uploadCustomerImage } from "@/lib/cloudinary";
import toast from "react-hot-toast";
import {
  normalizePhone,
  validateCustomerForm,
  validateIdNumber,
  validateCustomerName,
  validateCustomerLocation,
  validatePhone,
} from "@/lib/customerValidation";
import {
  calculateDailyInstalment,
  formatKesCurrency,
  isValidDailyInstalment,
  validateLoanForm,
} from "@/lib/loanCalculations";
import {
  buildGuarantorPayload,
  validateGuarantorField,
  validateGuarantorForm,
} from "@/lib/guarantorValidation";

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

type CustomerIdType = "id_card" | "maisha_card";

interface CreatedLoanResponse {
  id: number;
  document_url?: string;
}

export default function AddLoanForm() {
  const { isAuthenticated, loading } = useAuth();

  const router = useRouter();

  const [customerIdNumber, setCustomerIdNumber] = useState("");
  const [customerIdType, setCustomerIdType] = useState<CustomerIdType | null>(null);
  const [customerIdError, setCustomerIdError] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [customerExists, setCustomerExists] = useState(false);

  const customerIdMinLength = customerIdType === "id_card" ? 7 : customerIdType === "maisha_card" ? 8 : 0;
  const customerIdMaxLength = customerIdType === "id_card" ? 8 : customerIdType === "maisha_card" ? 9 : 0;
  const isSearchEnabled =
    customerIdType !== null &&
    customerIdNumber.length >= customerIdMinLength &&
    customerIdNumber.length <= customerIdMaxLength &&
    !customerIdNumber.startsWith("0");
  const idNumberPlaceholder = "Enter ID number";

  const handleCustomerIdTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as CustomerIdType | "";
    setCustomerIdType(value === "" ? null : value);
    setCustomerIdNumber("");
    setCustomerIdError("");
  };

  const handleCustomerIdNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, "");
    setCustomerIdNumber(numericValue.slice(0, customerIdMaxLength || numericValue.length));
    if (customerIdError) {
      setCustomerIdError("");
    }
  };

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
  const [customerFieldErrors, setCustomerFieldErrors] = useState<
    Partial<Record<keyof Customer, string>>
  >({});
  const [loanFieldErrors, setLoanFieldErrors] = useState<
    Partial<Record<"amount" | "interest_rate" | "start_date", string>>
  >({});
  const [guarantorFieldErrors, setGuarantorFieldErrors] = useState<
    Partial<Record<keyof typeof guarantorForm, string>>
  >({});

  const dailyInstalment = useMemo(() => {
    const amount = parseFloat(loanForm.amount);
    const rate = parseFloat(loanForm.interest_rate);
    return calculateDailyInstalment(amount, rate);
  }, [loanForm.amount, loanForm.interest_rate]);

  const validateCustomerField = (name: string, value: string): string => {
    switch (name) {
      case "name":
        return validateCustomerName(value) || "";
      case "id_number":
        return validateIdNumber(value) || "";
      case "phone":
        return validatePhone(value) || "";
      case "location":
        return validateCustomerLocation(value) || "";
      default:
        return "";
    }
  };

  const fieldClassName = (field: keyof Customer, readOnly = false) => {
    const hasError = !!customerFieldErrors[field];
    return `w-full px-4 py-2 border rounded-md text-black focus:ring-green-500 focus:border-green-500 ${
      hasError ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-gray-300"
    } ${readOnly ? "bg-gray-50" : ""}`;
  };

  const loanFieldClassName = (field: "amount" | "interest_rate" | "start_date") => {
    const hasError = !!loanFieldErrors[field];
    return `w-full px-4 py-2 border rounded-md text-black focus:ring-green-500 focus:border-green-500 ${
      hasError ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-gray-300"
    }`;
  };

  const guarantorFieldClassName = (field: keyof typeof guarantorForm) => {
    const hasError = !!guarantorFieldErrors[field];
    return `w-full px-4 py-2 border rounded-md text-black focus:ring-green-500 focus:border-green-500 ${
      hasError ? "border-red-500 focus:ring-red-200 focus:border-red-500" : "border-gray-300"
    }`;
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  const handleLookup = async () => {
    if (!customerIdType) {
      setCustomerIdError("Enter correct ID number");
      return;
    }

    if (
      customerIdNumber.length < customerIdMinLength ||
      customerIdNumber.length > customerIdMaxLength ||
      customerIdNumber.startsWith("0")
    ) {
      setCustomerIdError("Enter correct ID number");
      return;
    }

    setCustomerIdError("");
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
        setCustomerForm({ name: "", id_number: customerIdNumber.trim(), phone: "", location: "", profile_image_url: "" });
        setCustomerFieldErrors({});
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
    const inputValue = name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setCustomerForm((prev) => ({ ...prev, [name]: inputValue }));
    if (!customerExists) {
      setCustomerFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCustomerBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (customerExists) return;
    const { name, value } = e.target;
    setCustomerFieldErrors((prev) => ({
      ...prev,
      [name]: validateCustomerField(name, value),
    }));
  };

  const handleLoanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoanForm((prev) => ({ ...prev, [name]: value }));
    setLoanFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleLoanBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const errors = validateLoanForm(loanForm);
    setLoanFieldErrors((prev) => ({
      ...prev,
      [name]: errors[name as keyof typeof errors] || "",
    }));
  };

  const handleGuarantorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGuarantorForm((prev) => ({ ...prev, [name]: value }));
    setGuarantorFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleGuarantorBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const guarantorHasData = Object.entries(guarantorForm).some(
      ([key, v]) => (key === name ? value : v).trim() !== ""
    );
    setGuarantorFieldErrors((prev) => ({
      ...prev,
      [name]: guarantorHasData ? validateGuarantorField(name, value) : "",
    }));
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
        const errors = validateCustomerForm(customerForm);
        if (Object.keys(errors).length > 0) {
          setCustomerFieldErrors(errors);
          toast.error("Please fix the customer form errors before submitting.");
          setIsSubmitting(false);
          return;
        }

        const customerPayload = {
          name: customerForm.name.trim(),
          id_number: customerForm.id_number.trim(),
          phone: normalizePhone(customerForm.phone),
          location: (customerForm.location || "").trim(),
          profile_image_url: customerForm.profile_image_url || undefined,
        };

        const createdCustomer = await api.post<(Customer & { id: number })>(
          "/customers",
          customerPayload
        );
        setCustomerExists(true);
        setSelectedCustomerId(createdCustomer.id);
        setCustomerForm((prev) => ({ ...prev, phone: customerPayload.phone }));
      }

      const loanErrors = validateLoanForm(loanForm);
      const guarantorHasData = Object.values(guarantorForm).some((v) => v.trim() !== "");
      const guarantorErrors = guarantorHasData ? validateGuarantorForm(guarantorForm) : {};
      const amount = parseFloat(loanForm.amount);
      const interestRate = parseFloat(loanForm.interest_rate);

      if (
        Object.keys(loanErrors).length > 0 ||
        Object.keys(guarantorErrors).length > 0 ||
        !isValidDailyInstalment(amount, interestRate)
      ) {
        setLoanFieldErrors(loanErrors);
        setGuarantorFieldErrors(guarantorErrors);
        toast.error("Please fix the loan and guarantor form errors before submitting.");
        setIsSubmitting(false);
        return;
      }

      const loanData: any = {
        id_number: customerForm.id_number.trim(),
        amount,
        interest_rate: interestRate,
        start_date: loanForm.start_date,
      };
      if (guarantorHasData) {
        loanData.guarantor = buildGuarantorPayload(guarantorForm);
      }

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
            <div className="grid gap-4">
              <div>
                <label htmlFor="customerIdType" className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                <select
                  id="customerIdType"
                  value={customerIdType ?? ""}
                  onChange={handleCustomerIdTypeChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-4 focus:ring-green-200 focus:border-green-500 shadow-sm"
                  required
                >
                  <option value="">Select ID type</option>
                  <option value="id_card">National ID Card</option>
                  <option value="maisha_card">Maisha Card</option>
                </select>
              </div>
              <div>
                <label htmlFor="customerIdNumber" className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                <input
                  type="text"
                  id="customerIdNumber"
                  value={customerIdNumber}
                  onChange={handleCustomerIdNumberChange}
                  disabled={!customerIdType}
                  maxLength={customerIdMaxLength || undefined}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:ring-4 focus:ring-green-200 focus:border-green-500 shadow-sm"
                  placeholder={idNumberPlaceholder}
                />
                {customerIdError && (
                  <p className="text-sm text-red-600 mt-1">{customerIdError}</p>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLookup}
            disabled={lookupStatus === "loading" || !isSearchEnabled}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
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
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" id="name" name="name" value={customerForm.name} onChange={handleCustomerChange} onBlur={handleCustomerBlur} className={fieldClassName("name", customerExists)} placeholder="Enter full name" required readOnly={customerExists} />
                  {!customerExists && customerFieldErrors.name && (
                    <p className="text-sm text-red-600 mt-1">{customerFieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="id_number" className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                  <input type="text" id="id_number" name="id_number" value={customerForm.id_number} onChange={handleCustomerChange} onBlur={handleCustomerBlur} className={fieldClassName("id_number", customerExists)} placeholder="Enter 8-digit ID number" required readOnly={customerExists} inputMode="numeric" pattern="\d{8}" maxLength={8} />
                  {!customerExists && customerFieldErrors.id_number && (
                    <p className="text-sm text-red-600 mt-1">{customerFieldErrors.id_number}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input type="tel" id="phone" name="phone" value={customerForm.phone} onChange={handleCustomerChange} onBlur={handleCustomerBlur} className={fieldClassName("phone", customerExists)} placeholder="e.g. 0712345678" required readOnly={customerExists} />
                  {!customerExists && customerFieldErrors.phone && (
                    <p className="text-sm text-red-600 mt-1">{customerFieldErrors.phone}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <input type="text" id="location" name="location" value={customerForm.location} onChange={handleCustomerChange} onBlur={handleCustomerBlur} className={fieldClassName("location", customerExists)} placeholder="Enter location" required readOnly={customerExists} />
                  {!customerExists && customerFieldErrors.location && (
                    <p className="text-sm text-red-600 mt-1">{customerFieldErrors.location}</p>
                  )}
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
                  <p className="text-xs text-gray-500">Optional. PNG, JPG, WEBP up to 5MB. Stored securely on Cloudinary.</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Loan Amount *</label>
                    <input type="number" id="amount" name="amount" value={loanForm.amount} onChange={handleLoanChange} onBlur={handleLoanBlur} className={loanFieldClassName("amount")} placeholder="Enter loan amount" required min="0.01" step="0.01" />
                    {loanFieldErrors.amount && (
                      <p className="text-sm text-red-600 mt-1">{loanFieldErrors.amount}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="interest_rate" className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%) *</label>
                    <input
                      type="number"
                      id="interest_rate"
                      name="interest_rate"
                      value={loanForm.interest_rate}
                      readOnly
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-500 bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label htmlFor="daily_instalment" className="block text-sm font-medium text-gray-700 mb-1">Daily Instalment</label>
                    <input
                      type="text"
                      id="daily_instalment"
                      name="daily_instalment"
                      value={formatKesCurrency(dailyInstalment)}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-800 bg-green-50 font-semibold cursor-not-allowed"
                    />
                    {!isValidDailyInstalment(parseFloat(loanForm.amount), parseFloat(loanForm.interest_rate)) && loanForm.amount && (
                      <p className="text-sm text-red-600 mt-1">Enter a valid loan amount to calculate daily instalment.</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input type="date" id="start_date" name="start_date" value={loanForm.start_date} onChange={handleLoanChange} onBlur={handleLoanBlur} className={loanFieldClassName("start_date")} required />
                    {loanFieldErrors.start_date && (
                      <p className="text-sm text-red-600 mt-1">{loanFieldErrors.start_date}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Guarantor Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="guarantor_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      id="guarantor_name"
                      name="name"
                      value={guarantorForm.name}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("name")}
                      placeholder="Enter guarantor full name"
                    />
                    {guarantorFieldErrors.name && (
                      <p className="text-sm text-red-600 mt-1">{guarantorFieldErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="guarantor_id_number" className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                    <input
                      type="text"
                      id="guarantor_id_number"
                      name="id_number"
                      value={guarantorForm.id_number}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("id_number")}
                      placeholder="Enter 8-digit ID number"
                      inputMode="numeric"
                      pattern="\d{8}"
                      maxLength={8}
                    />
                    {guarantorFieldErrors.id_number && (
                      <p className="text-sm text-red-600 mt-1">{guarantorFieldErrors.id_number}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="guarantor_phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      id="guarantor_phone"
                      name="phone"
                      value={guarantorForm.phone}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("phone")}
                      placeholder="e.g. 0712345678"
                    />
                    {guarantorFieldErrors.phone && (
                      <p className="text-sm text-red-600 mt-1">{guarantorFieldErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="guarantor_relationship" className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <select
                      id="guarantor_relationship"
                      name="relationship"
                      value={guarantorForm.relationship}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("relationship")}
                    >
                      <option value="">Select relationship</option>
                      <option value="Family">Family</option>
                      <option value="Friend">Friend</option>
                      <option value="Colleague">Colleague</option>
                      <option value="Business Partner">Business Partner</option>
                      <option value="Other">Other</option>
                    </select>
                    {guarantorFieldErrors.relationship && (
                      <p className="text-sm text-red-600 mt-1">{guarantorFieldErrors.relationship}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="guarantor_location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      id="guarantor_location"
                      name="location"
                      value={guarantorForm.location}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("location")}
                      placeholder="Enter guarantor location"
                    />
                    {guarantorFieldErrors.location && (
                      <p className="text-sm text-red-600 mt-1">{guarantorFieldErrors.location}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !isValidDailyInstalment(
                      parseFloat(loanForm.amount),
                      parseFloat(loanForm.interest_rate)
                    )
                  }
                  className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
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


