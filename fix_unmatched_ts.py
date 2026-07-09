content = open('app/dashboard/unmatched-payments/page.tsx', 'r', encoding='utf-8').read()
content_lf = content.replace('\r\n', '\n')

old = 'api.get("/c2b/unmatched-payments").then(setPayments).catch(() => setError("Failed to load.")).finally(() => setLoading(false));'
new = 'api.get<UnmatchedPayment[]>("/c2b/unmatched-payments").then(setPayments).catch(() => setError("Failed to load.")).finally(() => setLoading(false));'

if old in content_lf:
    print("FOUND - replacing")
    content_lf = content_lf.replace(old, new)
else:
    print("NOT FOUND")

open('app/dashboard/unmatched-payments/page.tsx', 'w', encoding='utf-8', newline='\n').write(content_lf)
print("Done")
