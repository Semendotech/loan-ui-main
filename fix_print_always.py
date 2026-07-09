content = open('app/dashboard/unmatched-payments/page.tsx', 'r', encoding='utf-8').read()
content_lf = content.replace('\r\n', '\n')

old = '          {payments.length > 0 && (\n            <button\n              onClick={handlePrint}\n              disabled={downloading}\n              className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 transition"\n            >\n              {downloading ? "Preparing..." : "Print / Download PDF"}\n            </button>\n          )}'
new = '          <button\n              onClick={handlePrint}\n              disabled={downloading}\n              className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 transition"\n            >\n              {downloading ? "Preparing..." : "Print / Download PDF"}\n            </button>'

if old in content_lf:
    print("FOUND - replacing")
    content_lf = content_lf.replace(old, new)
else:
    print("NOT FOUND")

open('app/dashboard/unmatched-payments/page.tsx', 'w', encoding='utf-8', newline='\n').write(content_lf)
print("Done")
