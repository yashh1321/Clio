import requests

def test_submit_essay_missing_required_fields():
    base_url = "http://localhost:8000"
    endpoint = "/submit"
    url = base_url + endpoint
    headers = {"Content-Type": "application/json"}
    timeout = 30

    # Base valid payload with all required fields
    valid_payload = {
        "student_id": "student123",
        "assignment_title": "History Essay",
        "content": "This is the content of the essay.",
        "wpm": 40,
        "paste_count": 1
    }

    required_fields = ["student_id", "assignment_title", "content", "wpm", "paste_count"]

    for field in required_fields:
        # Create payload missing one required field
        payload = valid_payload.copy()
        payload.pop(field)

        response = requests.post(url, json=payload, headers=headers, timeout=timeout)
        try:
            json_response = response.json()
        except Exception:
            json_response = None

        # Validate that the API returns a client error (likely 422 Unprocessable Entity) for missing required field
        assert response.status_code >= 400 and response.status_code < 500, \
            f"Expected 4xx status code for missing field '{field}', got {response.status_code}"

        # Validate the response contains validation error details mentioning the missing field
        assert json_response and isinstance(json_response, dict), "Response JSON body expected"
        error_str = str(json_response).lower()
        assert field.replace("_", "") in error_str or field in error_str or "required" in error_str or "missing" in error_str, \
            f"Expected validation error mentioning missing field '{field}'. Response: {json_response}"

test_submit_essay_missing_required_fields()