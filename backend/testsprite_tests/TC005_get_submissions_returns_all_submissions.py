import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30
HEADERS = {"Accept": "application/json"}


def test_get_submissions_returns_all_submissions():
    try:
        response = requests.get(f"{BASE_URL}/submissions", headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Request failed: {e}")

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    try:
        submissions = response.json()
    except ValueError:
        raise AssertionError("Response is not a valid JSON")

    assert isinstance(submissions, list), "Response JSON is not a list"

    if submissions:
        submission = submissions[0]
        assert isinstance(submission, dict), "Submission item is not a dictionary"
        # Validate expected keys based on typical submission structure from the schema properties in PRD
        expected_keys = {"student_id", "assignment_title", "content", "wpm", "paste_count"}
        missing_keys = expected_keys - submission.keys()
        assert not missing_keys, f"Missing keys in submission item: {missing_keys}"

        # Validate types
        assert isinstance(submission["student_id"], str), "student_id is not a string"
        assert isinstance(submission["assignment_title"], str), "assignment_title is not a string"
        assert isinstance(submission["content"], str), "content is not a string"
        assert isinstance(submission["wpm"], int), "wpm is not an integer"
        assert isinstance(submission["paste_count"], int), "paste_count is not an integer"


test_get_submissions_returns_all_submissions()