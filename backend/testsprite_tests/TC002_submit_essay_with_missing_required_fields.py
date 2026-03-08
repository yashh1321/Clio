import requests

def test_submit_essay_missing_required_fields():
    base_url = "http://localhost:8000"
    endpoint = f"{base_url}/submit"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": "your_api_key_here"
    }
    # Creating payload missing 'student_id' and 'wpm' fields
    payload = {
        "assignment_title": "Test Assignment",
        "content": "This is a test essay content.",
        "paste_count": 1
    }

    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
        # Expecting 4xx error for missing required fields, so status_code should not be 200
        assert response.status_code != 200, f"Expected error status code for missing fields but got 200. Response: {response.text}"
        json_resp = response.json()
        # The exact error response format is not specified, check that it indicates missing required fields
        error_message = json_resp.get("detail") or json_resp.get("error") or json_resp.get("message") or ""
        assert ("missing" in error_message.lower() or "required" in error_message.lower()), \
            f"Expected error indicating missing required fields, got: {json_resp}"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_submit_essay_missing_required_fields()