import requests

BASE_URL = "http://localhost:8000"
API_KEY = "your_api_key_here"  # Replace with a valid API key if needed

def test_submit_essay_with_invalid_wpm_and_paste_count():
    url = f"{BASE_URL}/submit"
    headers = {
        "Content-Type": "application/json",
        "apiKey": API_KEY
    }

    test_payloads = [
        {
            "student_id": "student123",
            "assignment_title": "History Essay",
            "content": "This is a sample essay content.",
            "wpm": -10,
            "paste_count": 2
        },
        {
            "student_id": "student123",
            "assignment_title": "Science Essay",
            "content": "This is a sample essay content.",
            "wpm": 3000,
            "paste_count": 0
        },
        {
            "student_id": "student123",
            "assignment_title": "Math Essay",
            "content": "This is a sample essay content.",
            "wpm": 50,
            "paste_count": -5
        },
        {
            "student_id": "student123",
            "assignment_title": "English Essay",
            "content": "This is a sample essay content.",
            "wpm": 60,
            "paste_count": 99999
        }
    ]

    for payload in test_payloads:
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
        except requests.RequestException as e:
            assert False, f"Request failed: {e}"

        # Expecting an error or warning about invalid wpm or paste_count
        assert response.status_code in (400, 422), f"Expected client error status for payload {payload}, got {response.status_code}"

        # Check response body for error or warning message keys or descriptions
        try:
            data = response.json()
        except ValueError:
            assert False, "Response is not valid JSON"

        error_detected = False
        if isinstance(data, dict):
            # Typical error response might have keys like 'error', 'message', or 'detail'
            for key in ('error', 'message', 'detail'):
                if key in data and ("invalid" in str(data[key]).lower() or "anomaly" in str(data[key]).lower() or "error" in str(data[key]).lower()):
                    error_detected = True
                    break

        assert error_detected, f"Expected error or warning message in response body for payload {payload}, got: {data}"

test_submit_essay_with_invalid_wpm_and_paste_count()