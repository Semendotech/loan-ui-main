export function calculateDailyInstalment(
  amount: number,
  interestRate: number
): number {
  if (!Number.isFinite(amount) || !Number.isFinite(interestRate)) {
    return NaN;
  }
  return (amount + (amount * interestRate) / 100) / 30;
}

export function formatKesCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return "KES 0.00";
  }

  return `KES ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function isValidDailyInstalment(amount: number, interestRate: number): boolean {
  const daily = calculateDailyInstalment(amount, interestRate);
  return Number.isFinite(daily) && daily > 0;
}

export type LoanFormFields = {
  amount: string;
  interest_rate: string;
  start_date: string;
};

export function validateLoanForm(form: LoanFormFields): Partial<Record<keyof LoanFormFields, string>> {
  const errors: Partial<Record<keyof LoanFormFields, string>> = {};

  if (!form.amount.trim()) {
    errors.amount = "Loan amount is required.";
  } else {
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = "Loan amount must be greater than zero.";
    }
  }

  if (!form.start_date) {
    errors.start_date = "Start date is required.";
  }

  const amount = parseFloat(form.amount);
  const rate = parseFloat(form.interest_rate);
  if (!isValidDailyInstalment(amount, rate)) {
    errors.amount = errors.amount || "Enter a valid loan amount to calculate daily instalment.";
  }

  return errors;
}
