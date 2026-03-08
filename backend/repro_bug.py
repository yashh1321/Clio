import requests

url = "http://localhost:8000/submit"
payload = {
    "student_id": "bug_repro",
    "assignment_title": "Bug Repro",
    "content": "Test content",
    "wpm": -10,
    "paste_count": 0
}
try:
    response = requests.post(url, json=payload, timeout=30)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
