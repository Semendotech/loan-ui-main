content = open('app/dashboard/unmatched-payments/page.tsx', 'r', encoding='utf-8').read()
content_lf = content.replace('\r\n', '\n')

old = '  const handlePrint = async () => {\n    setDownloading(true);\n    try {\n      const token = localStorage.getItem("token");\n      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/c2b/unmatched-payments-pdf", {\n        headers: { Authorization: `Bearer ${token}` },\n      });\n      const blob = await res.blob();\n      const url = URL.createObjectURL(blob);\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = `unmatched_payments_${new Date().toISOString().slice(0,10)}.pdf`;\n      a.click();\n      URL.revokeObjectURL(url);\n    } catch { window.print(); }\n    setDownloading(false);\n  };'
new = '  const handlePrint = async () => {\n    setDownloading(true);\n    try {\n      const res = await apiRequest<Response>("/c2b/unmatched-payments-pdf", { rawResponse: true });\n      const blob = await (res as unknown as globalThis.Response).blob();\n      const url = URL.createObjectURL(blob);\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = `unmatched_payments_${new Date().toISOString().slice(0,10)}.pdf`;\n      a.click();\n      URL.revokeObjectURL(url);\n    } catch { window.print(); }\n    setDownloading(false);\n  };'

if old in content_lf:
    print("FOUND - replacing")
    content_lf = content_lf.replace(old, new)
else:
    print("NOT FOUND")

open('app/dashboard/unmatched-payments/page.tsx', 'w', encoding='utf-8', newline='\n').write(content_lf)
print("Done")
