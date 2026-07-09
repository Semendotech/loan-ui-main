content = open('app/dashboard/unmatched-payments/page.tsx', 'r', encoding='utf-8').read()
content_lf = content.replace('\r\n', '\n')

old = '''      {payments.length > 0 && (
          <button
            onClick={handlePrint}
            disabled={downloading}
            className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 transition"
          >
            {downloading ? "Preparing..." : "Print / Download PDF"}
          </button>
        )}'''

new = '''<div className="flex gap-2">
          <button
            onClick={() => { setLoading(true); api.get("/c2b/unmatched-payments").then(setPayments).catch(() => setError("Failed to load.")).finally(() => setLoading(false)); }}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Refresh
          </button>
          {payments.length > 0 && (
            <button
              onClick={handlePrint}
              disabled={downloading}
              className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 transition"
            >
              {downloading ? "Preparing..." : "Print / Download PDF"}
            </button>
          )}
        </div>'''

if old in content_lf:
    print("FOUND - replacing")
    content_lf = content_lf.replace(old, new)
else:
    print("NOT FOUND")

open('app/dashboard/unmatched-payments/page.tsx', 'w', encoding='utf-8', newline='\n').write(content_lf)
print("Done")
