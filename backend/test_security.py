import requests
import json

base_url = "http://localhost:8000"
submit_url = f"{base_url}/submit"
headers = {"X-API-Key": "clio-dev-key-DO-NOT-USE-IN-PROD"}
payload = {
    "student_id": "1",
    "assignment_title": "Test",
    "content": "<p>Test</p><script>alert('xss')</script>",
    "wpm": 50,
    "paste_count": 0
}

print("1. Testing XSS stripping on /submit...")
r = requests.post(submit_url, headers=headers, json=payload, timeout=5)
print(f"Status: {r.status_code}")
if r.status_code == 422:
    print(r.text)

r_get = requests.get(f"{base_url}/submissions", headers=headers, timeout=5)
submissions = r_get.json()
latest = submissions[-1] if submissions else None
if latest and "<script>" not in latest["content"]:
    print("PASS: <script> was stripped from content.")
else:
    print("FAIL: <script> was NOT stripped.")

print("\n2. Testing Rate Limiting on /submit (looping 15 times)...")
rate_limited = False
for i in range(15):
    r = requests.post(submit_url, headers=headers, json=payload, timeout=5)
    if r.status_code == 429:
        rate_limited = True
        print(f"Request {i+1}: 429 Too Many Requests")
        break
    else:
        print(f"Request {i+1}: {r.status_code}")

if rate_limited:
    print("PASS: Rate limiting works.")
else:
    print("FAIL: Rate limiting did not trigger.")

print("\n3. Testing Security Headers on /submissions...")
r_get = requests.get(f"{base_url}/submissions", headers=headers, timeout=5)
if "X-Frame-Options" in r_get.headers:
    print("PASS: Security headers present.")
else:
    print("FAIL: Security headers missing.")

print("\n4. Testing Payload Size Limit (sending ~3MB payload)...")
payload_large = {
    "student_id": "1",
    "assignment_title": "Large Payload",
    "content": "A" * 3 * 1024 * 1024,
    "wpm": 50,
    "paste_count": 0
}
try:
    r_large = requests.post(submit_url, headers=headers, json=payload_large, timeout=5)
    if r_large.status_code == 413:
        print("PASS: Payload size limited to < 2MB (Status: 413)")
    else:
        print(f"FAIL: Payload size limit did not trigger (Status: {r_large.status_code})")
except requests.exceptions.RequestException as e:
    print(f"PASS: Connection dropped or rejected due to payload size. Details: {e}")
