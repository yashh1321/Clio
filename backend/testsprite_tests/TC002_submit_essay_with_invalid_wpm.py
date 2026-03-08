import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

def test_submit_essay_with_invalid_wpm():
    url = f"{BASE_URL}/submit"
    # Construct payload with invalid/anomalous wpm value (e.g., negative or excessively high)
    payload = {
        "student_id": "test_student_123",
        "assignment_title": "Test Assignment Invalid WPM",
        "content": "This is a test essay content for invalid wpm.",
        "wpm": -10,  # invalid typing speed (negative)
        "paste_count": 0
    }
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Request failed: {e}")

    # The API should reject invalid wpm or return an error indicating invalid typing speed.

    # It might respond with a status code other than 200 or with error message in 200.
    if response.status_code == 200:
        resp_json = {}
        try:
            resp_json = response.json()
        except ValueError:
            raise AssertionError("Response is not valid JSON")

        # Check for message indicating invalid typing speed or a rejection message
        message = resp_json.get("message", "").lower()
        # The API might still return 200 and a message indicating failure
        assert (
            "invalid" in message or "error" in message or "reject" in message or "invalid wpm" in message
        ), f"Unexpected success response message: {resp_json.get('message')}"
    else:
        # Non-200 status code expected for invalid wpm submissions
        assert response.status_code >= 400, f"Expected error status code but got {response.status_code}"

test_submit_essay_with_invalid_wpm()