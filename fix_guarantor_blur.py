path = "components/AddLoanForm.tsx"
text = open(path, encoding="utf-8").read()

old = """  const handleGuarantorBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setGuarantorFieldErrors((prev) => ({
      ...prev,
      [name]: validateGuarantorField(name, value),
    }));
  };"""

new = """  const handleGuarantorBlur = (
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
  };"""

count = text.count(old)
if count != 1:
    print(f"ABORTED - found {count} matches (expected 1)")
else:
    text = text.replace(old, new)
    open(path, "w", encoding="utf-8").write(text)
    print("Done. handleGuarantorBlur fixed.")
