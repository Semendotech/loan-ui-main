import json
import urllib.error
import urllib.request
import http.cookiejar
from datetime import datetime

base = 'https://loan-backend-main.onrender.com'
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

login_data = json.dumps({'username': 'audit_user_001', 'password': 'TempP@ss123'}).encode()
req = urllib.request.Request(base + '/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
r = opener.open(req, timeout=20)
print('login', r.status)

active = []
offset = 0
while True:
    url = f'{base}/loans/active?limit=100&offset={offset}'
    req = urllib.request.Request(url, headers={'User-Agent': 'AuditClient/1.0'})
    r = opener.open(req, timeout=60)
    page = json.loads(r.read().decode('utf-8'))
    items = page.get('items', [])
    active.extend(items)
    print('active offset', offset, 'count', len(items))
    if len(items) < 100:
        break
    offset += 100

arrears_url = base + '/arrears?only_active=true&limit=200&offset=0'
req = urllib.request.Request(arrears_url, headers={'User-Agent': 'AuditClient/1.0'})
r = opener.open(req, timeout=60)
arrears = json.loads(r.read().decode('utf-8'))
print('arrears count', len(arrears))

summary_req = urllib.request.Request(base + '/dashboard/summary', headers={'User-Agent': 'AuditClient/1.0'})
r = opener.open(summary_req, timeout=60)
summary = json.loads(r.read().decode('utf-8'))
print('summary', summary)

metrics_req = urllib.request.Request(base + '/dashboard/metrics', headers={'User-Agent': 'AuditClient/1.0'})
r = opener.open(metrics_req, timeout=60)
metrics = json.loads(r.read().decode('utf-8'))
print('metrics', metrics)

# Analyze active loans
bad_active = []
for loan in active:
    amount = float(loan['amount'])
    rate = float(loan['interest_rate'])
    total = float(loan['total_amount'])
    remaining = float(loan['remaining_amount'])
    expected_total = round(amount * (1 + rate/100), 2)
    expected_daily = round(expected_total / 30, 2)
    daily = round(float(loan['daily_instalment']), 2)
    start = datetime.fromisoformat(loan['start_date']).date()
    due = datetime.fromisoformat(loan['due_date']).date()
    due_diff = (due - start).days
    if total != expected_total or daily != expected_daily or due_diff != 30 or remaining <= 0 or loan['status'] not in ['ACTIVE','ARREARS']:
        bad_active.append({
            'id': loan['id'],
            'status': loan['status'],
            'amount': amount,
            'interest_rate': rate,
            'total_amount': total,
            'expected_total': expected_total,
            'daily_instalment': daily,
            'expected_daily': expected_daily,
            'remaining_amount': remaining,
            'start_date': loan['start_date'],
            'due_date': loan['due_date'],
            'due_diff': due_diff,
        })

print('bad_active count', len(bad_active))
if bad_active:
    print(json.dumps(bad_active[:10], indent=2))

# Analyze arrears consistency
bad_arrears = []
for a in arrears:
    remaining = float(a['remaining_amount'])
    original = float(a['original_amount'])
    if remaining > original or remaining <= 0 or a['is_cleared'] == True:
        bad_arrears.append(a)

print('bad_arrears count', len(bad_arrears))
if bad_arrears:
    print(json.dumps(bad_arrears[:10], indent=2))

with open('audit_active_arrears_result.json', 'w', encoding='utf-8') as f:
    json.dump({'active_count': len(active), 'arrears_count': len(arrears), 'bad_active': bad_active, 'bad_arrears': bad_arrears, 'metrics': metrics, 'summary': summary}, f, indent=2)
print('DONE')
