content = open('app/dashboard/unmatched-payments/page.tsx', 'r', encoding='utf-8').read()
content_lf = content.replace('\r\n', '\n')

# Add sender_name to interface
old1 = 'interface UnmatchedPayment {\n  id: number;\n  trans_id: string;\n  amount: number;\n  phone: string;\n  created_at: string;\n}'
new1 = 'interface UnmatchedPayment {\n  id: number;\n  trans_id: string;\n  amount: number;\n  phone: string;\n  sender_name: string;\n  created_at: string;\n}'

# Add sender name column header
old2 = '                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">#</th>\n                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Transaction ID</th>\n                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Phone</th>\n                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Amount</th>\n                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Date</th>\n                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Time</th>'
new2 = '                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">#</th>\n                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Transaction ID</th>\n                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Sender Name</th>\n                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Phone</th>\n                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Amount</th>\n                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Date</th>\n                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Time</th>'

# Add sender name cell and fix phone display
old3 = '                      <td className="px-4 py-2 text-sm font-mono text-gray-800">{p.trans_id}</td>\n                      <td className="px-4 py-2 text-sm">{p.phone}</td>'
new3 = '                      <td className="px-4 py-2 text-sm font-mono text-gray-800">{p.trans_id}</td>\n                      <td className="px-4 py-2 text-sm">{p.sender_name || "-"}</td>\n                      <td className="px-4 py-2 text-sm">{p.phone.length === 64 ? "Unknown" : p.phone}</td>'

# Fix print to call backend PDF endpoint
old4 = '  const handlePrint = async () => {\n    setDownloading(true);\n    window.print();\n    setDownloading(false);\n  };'
new4 = '  const handlePrint = async () => {\n    setDownloading(true);\n    try {\n      const token = localStorage.getItem("token");\n      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/c2b/unmatched-payments-pdf", {\n        headers: { Authorization: `Bearer ${token}` },\n      });\n      const blob = await res.blob();\n      const url = URL.createObjectURL(blob);\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = `unmatched_payments_${new Date().toISOString().slice(0,10)}.pdf`;\n      a.click();\n      URL.revokeObjectURL(url);\n    } catch { window.print(); }\n    setDownloading(false);\n  };'

for old, new, label in [(old1,new1,"interface"),(old2,new2,"header"),(old3,new3,"cells"),(old4,new4,"print handler")]:
    if old in content_lf:
        print("FOUND - " + label)
        content_lf = content_lf.replace(old, new)
    else:
        print("NOT FOUND - " + label)

open('app/dashboard/unmatched-payments/page.tsx', 'w', encoding='utf-8', newline='\n').write(content_lf)
print("Done")
