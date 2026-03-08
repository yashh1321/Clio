import requests

def test_submit_essay_with_valid_data():
    base_url = "http://localhost:8000"
    api_key = "your_api_key_here"  # Replace with valid API key
    url = f"{base_url}/submit"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"ApiKey {api_key}"
    }
    payload = {
        "student_id": "student123",
        "assignment_title": "The Impact of Climate Change",
        "content": "This essay discusses the impacts of climate change globally.",
        "wpm": 45,
        "paste_count": 0
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    json_resp = response.json()
    assert "message" in json_resp, "Response missing 'message'"
    assert "score" in json_resp, "Response missing 'score'"
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
    assert isinstance(json_resp["message"], str) and len(json_resp["message"]) > 0, "'message' should be a non-empty string"
    assert isinstance(json_resp["score"], int), "'score' should be an integer"

test_submit_essay_with_valid_data()