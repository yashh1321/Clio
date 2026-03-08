import requests

BASE_URL = "http://localhost:8000"
API_KEY = "your_api_key_here"  # Replace with the actual API key

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

def test_get_all_essay_submissions():
    # Prepare a sample submission to ensure there is at least one known submission
    submission_payload = {
        "student_id": "test_student_123",
        "assignment_title": "Test Assignment TC004",
        "content": "This is a test essay content for verifying retrieval.",
        "wpm": 40,
        "paste_count": 0
    }
    submission_id = None

    try:
        # Submit a known essay to ensure it can be retrieved later
        submit_resp = requests.post(f"{BASE_URL}/submit", headers=headers, json=submission_payload, timeout=30)
        assert submit_resp.status_code == 200, f"Submit failed with status code {submit_resp.status_code}"
        submit_data = submit_resp.json()
        assert "message" in submit_data and isinstance(submit_data["message"], str)
        assert "score" in submit_data and isinstance(submit_data["score"], int)

        # Get all submissions
        get_resp = requests.get(f"{BASE_URL}/submissions", headers=headers, timeout=30)
        assert get_resp.status_code == 200, f"Get submissions failed with status code {get_resp.status_code}"
        submissions = get_resp.json()
        assert isinstance(submissions, list), "Response is not a list"

        # Verify that our known submission is in the list with correct fields
        found = False
        for sub in submissions:
            # Each submission should have at least the fields student_id, assignment_title, content, wpm, paste_count
            assert isinstance(sub, dict), "Submission item is not a dict"
            for field in ["student_id", "assignment_title", "content", "wpm", "paste_count"]:
                assert field in sub, f"Submission missing field {field}"

            if (sub["student_id"] == submission_payload["student_id"] and
                sub["assignment_title"] == submission_payload["assignment_title"] and
                sub["content"] == submission_payload["content"] and
                sub["wpm"] == submission_payload["wpm"] and
                sub["paste_count"] == submission_payload["paste_count"]):
                found = True
                break

        assert found, "Submitted essay was not found in retrieved submissions"

    finally:
        # Cleanup: ideally delete the created submission if API supports it
        # Since no delete endpoint is specified, we skip cleanup.
        pass

test_get_all_essay_submissions()