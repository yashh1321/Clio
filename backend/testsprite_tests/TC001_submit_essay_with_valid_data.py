import requests

BASE_ENDPOINT = "http://localhost:8000"
TIMEOUT = 30

def test_submit_essay_with_valid_data():
    url = f"{BASE_ENDPOINT}/submit"
    payload = {
        "student_id": "student123",
        "assignment_title": "The Impact of Climate Change",
        "content": "Climate change is a critical global issue that requires immediate attention.",
        "wpm": 40,
        "paste_count": 0
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    json_response = response.json()
    assert "message" in json_response, "Response missing 'message'"
    assert isinstance(json_response["message"], str), "'message' should be a string"
    assert "score" in json_response, "Response missing 'score'"
    assert isinstance(json_response["score"], int), "'score' should be an integer"
    assert response.status_code == 200, f"Unexpected status code {response.status_code}"
    assert "success" in json_response["message"].lower(), "Response message does not indicate success"

test_submit_essay_with_valid_data()