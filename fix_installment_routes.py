from pathlib import Path

path = Path("app/dashboard/customers/[id]/page.tsx")
text = path.read_text(encoding="utf-8")

text = text.replace(
    'await api.put(`/payments/installments/${inst.id}`, { amount: amt });',
    'await api.put(`/payments/installment/${inst.id}`, { amount: amt });',
)
text = text.replace(
    'await api.delete(`/payments/installments/${inst.id}`);',
    'await api.delete(`/payments/installment/${inst.id}`);',
)

path.write_text(text, encoding="utf-8")
print("Fixed installment routes (installments -> installment) in page.tsx")