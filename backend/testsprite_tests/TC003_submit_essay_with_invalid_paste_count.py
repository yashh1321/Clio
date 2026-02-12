import requests

BASE_URL = "http://localhost:8000"
SUBMIT_ENDPOINT = f"{BASE_URL}/submit"
TIMEOUT = 30

def test_submit_essay_with_invalid_paste_count():
    headers = {"Content-Type": "application/json"}
    # Invalid paste_count values to test that are invalid types (string instead of integer)
    invalid_paste_counts = ["invalid", None, 12.34]
    for paste_count in invalid_paste_counts:
        payload = {
            "student_id": "test_student_123",
            "assignment_title": "Test Essay Invalid Paste Count",
            "content": "This is a test essay content to check invalid paste_count handling.",
            "wpm": 40,
            "paste_count": paste_count
        }
        try:
            response = requests.post(SUBMIT_ENDPOINT, json=payload, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            assert False, f"Request failed: {e}"

        # Expecting the API to reject with error, so non 200 status or error message in 200 response
        if response.status_code == 200:
            try:
                res_json = response.json()
            except Exception:
                assert False, "Response is 200 but not valid JSON"

            # If API accepts invalid paste_count and returns success, it is a failure.
            assert False, f"API incorrectly accepted invalid paste_count={paste_count} with message: {res_json.get('message')}"
        else:
            assert response.status_code >= 400, f"Unexpected status code {response.status_code} for paste_count={paste_count}"

test_submit_essay_with_invalid_paste_count()
