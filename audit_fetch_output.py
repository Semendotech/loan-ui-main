import json
import urllib.error
import urllib.request
import http.cookiejar

base = 'https://loan-backend-main.onrender.com'
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

login_data = json.dumps({'username': 'audit_user_001', 'password': 'TempP@ss123'}).encode()
req = urllib.request.Request(base + '/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
output = []

try:
    r = opener.open(req, timeout=20)
    output.append({'path': '/auth/login', 'status': r.status, 'body': r.read().decode('utf-8')})
except urllib.error.HTTPError as e:
    output.append({'path': '/auth/login', 'status': e.code, 'body': e.read().decode('utf-8')})
    raise SystemExit(1)

paths = [
    '/dashboard/metrics',
    '/dashboard/summary',
    '/loans/active?limit=10000',
    '/arrears?only_active=true&limit=10000',
    '/customers?limit=10000'
]
for path in paths:
    try:
        req = urllib.request.Request(base + path, headers={'User-Agent': 'AuditClient/1.0'})
        r = opener.open(req, timeout=60)
        output.append({'path': path, 'status': r.status, 'body': r.read().decode('utf-8')})
    except urllib.error.HTTPError as e:
        output.append({'path': path, 'status': e.code, 'body': e.read().decode('utf-8')})
    except Exception as e:
        output.append({'path': path, 'status': None, 'body': str(e)})

with open('audit_fetch_result.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2)
print('DONE')
