import json
import urllib.request
import http.cookiejar

base = 'https://loan-backend-main.onrender.com'
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
login_data = json.dumps({'username': 'audit_user_001', 'password': 'TempP@ss123'}).encode()
req = urllib.request.Request(base + '/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
res = opener.open(req, timeout=20)
print('login status', res.status)

active = []
offset = 0
while True:
    url = f'{base}/loans/active?limit=100&offset={offset}'
    req = urllib.request.Request(url, headers={'User-Agent': 'AuditClient/1.0'})
    r = opener.open(req, timeout=60)
    page = json.loads(r.read().decode('utf-8'))
    active.extend(page['items'])
    print('offset', offset, 'page count', len(page['items']))
    if len(page['items']) < 100:
        break
    offset += 100

remaining_sum = sum(float(item['remaining_amount']) for item in active)
print('active total count', len(active))
print('active remaining sum', remaining_sum)
print('active status counts', {s: sum(1 for item in active if item['status'] == s) for s in set(item['status'] for item in active)})
print('due_date offset counts', sum(1 for item in active if ( __import__('datetime').datetime.fromisoformat(item['due_date']).date() - __import__('datetime').datetime.fromisoformat(item['start_date']).date()).days != 30 ))
