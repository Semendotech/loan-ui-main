import json
import urllib.error
import urllib.request
import http.cookiejar

base = 'https://loan-backend-main.onrender.com'
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

login_data = json.dumps({'username': 'audit_user_001', 'password': 'TempP@ss123'}).encode()
req = urllib.request.Request(base + '/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
try:
    r = opener.open(req, timeout=20)
    login_result = json.loads(r.read().decode('utf-8'))
    print('login OK', login_result)
except urllib.error.HTTPError as e:
    print('login HTTPError', e.code, e.read().decode('utf-8'))
    raise SystemExit(1)

# Count active loans by paging through loans/active with limit=100
active_total = 0
active_items = []
for offset in range(0, 300, 100):
    url = f'{base}/loans/active?limit=100&offset={offset}'
    req = urllib.request.Request(url, headers={'User-Agent':'AuditClient/1.0'})
    try:
        r = opener.open(req, timeout=60)
        page = json.loads(r.read().decode('utf-8'))
        items = page.get('items', [])
        active_total += len(items)
        active_items.extend(items)
        print('active page', offset, 'count', len(items))
        if len(items) < 100:
            break
    except Exception as e:
        print('active error', offset, type(e).__name__, e)
        break

print('active_total', active_total)

# Count unpaid arrears by fetching arrears page with only_active=true and high limit
url = f'{base}/arrears?only_active=true&limit=2000&offset=0'
req = urllib.request.Request(url, headers={'User-Agent':'AuditClient/1.0'})
try:
    r = opener.open(req, timeout=60)
    arrears = json.loads(r.read().decode('utf-8'))
    print('arrears_count', len(arrears))
except Exception as e:
    print('arrears error', type(e).__name__, e)

# Capture customers total count
url = f'{base}/customers?limit=1&offset=0'
req = urllib.request.Request(url, headers={'User-Agent':'AuditClient/1.0'})
try:
    r = opener.open(req, timeout=60)
    customers = json.loads(r.read().decode('utf-8'))
    print('customers total', customers.get('total'))
except Exception as e:
    print('customers error', type(e).__name__, e)

# Print sample active loans statuses if needed
print('sample active loan ids', [item['id'] for item in active_items[:10]])
