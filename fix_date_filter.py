content = open('app/dashboard/payment-logs/page.tsx', 'r', encoding='utf-8').read()
content_lf = content.replace('\r\n', '\n')

old1 = "const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));\n  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));"
new1 = "const eatToday = () => new Date().toLocaleDateString(\"en-CA\", { timeZone: \"Africa/Nairobi\" });\n  const [startDate, setStartDate] = useState(eatToday);\n  const [endDate, setEndDate] = useState(eatToday);"

old2 = 'const fmt = (d: Date) => d.toISOString().slice(0, 10);'
new2 = 'const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });'

if old1 in content_lf:
    print("FOUND useState - replacing")
    content_lf = content_lf.replace(old1, new1)
else:
    print("NOT FOUND useState - check manually")

if old2 in content_lf:
    print("FOUND fmt - replacing")
    content_lf = content_lf.replace(old2, new2)
else:
    print("NOT FOUND fmt - check manually")

open('app/dashboard/payment-logs/page.tsx', 'w', encoding='utf-8', newline='\n').write(content_lf)
print("Done")
