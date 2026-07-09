import sys

path = "components/AddLoanForm.tsx"
text = open(path, encoding="utf-8").read()

replacements = [
    (
        '''                    <label htmlFor="guarantor_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      id="guarantor_name"
                      name="name"
                      value={guarantorForm.name}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("name")}
                      placeholder="Enter guarantor full name"
                      required
                    />''',
        '''                    <label htmlFor="guarantor_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      id="guarantor_name"
                      name="name"
                      value={guarantorForm.name}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("name")}
                      placeholder="Enter guarantor full name"
                    />''',
    ),
    (
        '''                    <label htmlFor="guarantor_id_number" className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                    <input
                      type="text"
                      id="guarantor_id_number"
                      name="id_number"
                      value={guarantorForm.id_number}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("id_number")}
                      placeholder="Enter 8-digit ID number"
                      required
                      inputMode="numeric"
                      pattern="\d{8}"
                      maxLength={8}
                    />''',
        '''                    <label htmlFor="guarantor_id_number" className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
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
                    />''',
    ),
    (
        '''                    <label htmlFor="guarantor_phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      id="guarantor_phone"
                      name="phone"
                      value={guarantorForm.phone}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("phone")}
                      placeholder="e.g. 0712345678"
                      required
                    />''',
        '''                    <label htmlFor="guarantor_phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      id="guarantor_phone"
                      name="phone"
                      value={guarantorForm.phone}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("phone")}
                      placeholder="e.g. 0712345678"
                    />''',
    ),
    (
        '''                    <label htmlFor="guarantor_relationship" className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                    <select
                      id="guarantor_relationship"
                      name="relationship"
                      value={guarantorForm.relationship}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("relationship")}
                      required
                    >''',
        '''                    <label htmlFor="guarantor_relationship" className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <select
                      id="guarantor_relationship"
                      name="relationship"
                      value={guarantorForm.relationship}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("relationship")}
                    >''',
    ),
    (
        '''                    <label htmlFor="guarantor_location" className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                    <input
                      type="text"
                      id="guarantor_location"
                      name="location"
                      value={guarantorForm.location}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("location")}
                      placeholder="Enter guarantor location"
                      required
                    />''',
        '''                    <label htmlFor="guarantor_location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      id="guarantor_location"
                      name="location"
                      value={guarantorForm.location}
                      onChange={handleGuarantorChange}
                      onBlur={handleGuarantorBlur}
                      className={guarantorFieldClassName("location")}
                      placeholder="Enter guarantor location"
                    />''',
    ),
    (
        '''      const loanErrors = validateLoanForm(loanForm);
      const guarantorErrors = validateGuarantorForm(guarantorForm);
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
        guarantor: buildGuarantorPayload(guarantorForm),
      };''',
        '''      const loanErrors = validateLoanForm(loanForm);
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
      }''',
    ),
]

missing = []
for i, (old, new) in enumerate(replacements, start=1):
    count = text.count(old)
    if count != 1:
        missing.append((i, count))
    else:
        text = text.replace(old, new)

if missing:
    print("ABORTED - some blocks did not match exactly once:")
    for idx, count in missing:
        print(f"  Block {idx}: found {count} times (expected 1)")
    sys.exit(1)

open(path, "w", encoding="utf-8").write(text)
print("Done. All 6 blocks updated successfully.")
