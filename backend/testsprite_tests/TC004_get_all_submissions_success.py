import requests
import json

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_all_submissions_security():
    url = f"{BASE_URL}/submissions"
    headers = {
        "Accept": "application/json",
    }

    # Attempt 1: Normal request, expect 200 or 401/403 and list response if 200
    try:
        r = requests.get(url, headers=headers, timeout=TIMEOUT)
        assert r.status_code in (200, 401, 403), f"Expected status 200 or 401/403 but got {r.status_code}"
        if r.status_code == 200:
            data = r.json()
            assert isinstance(data, list), "Response is not a list"
            # Validate schema of each submission if available
            for sub in data:
                assert isinstance(sub, dict), "Submission item is not an object"
                # Check for expected fields (common in submissions)
                assert "student_id" in sub or "assignment_title" in sub or "content" in sub or "wpm" in sub or "paste_count" in sub, \
                    "Submission missing expected fields"
    except Exception as e:
        raise AssertionError(f"Normal GET /submissions request failed: {e}")

    # Attempt 2: Test for Authentication Bypass by injecting common auth bypass headers or cookies
    bypass_headers = headers.copy()
    bypass_headers["X-Forwarded-For"] = "127.0.0.1"
    bypass_headers["X-Remote-IP"] = "127.0.0.1"
    bypass_headers["X-Original-URL"] = "/admin"
    bypass_headers["X-Custom-Auth"] = "bypass"
    try:
        r = requests.get(url, headers=bypass_headers, timeout=TIMEOUT)
        assert r.status_code != 500, "Server error on bypass headers, potential vulnerability"
        assert r.status_code in (200, 401, 403), "Unexpected status code with bypass headers"
    except Exception as e:
        raise AssertionError(f"Auth bypass headers request failed: {e}")

    # Attempt 3: SQL Injection in query parameters (if any)
    # Since no query params defined, append classic injection in URL path
    injection_payloads = [
        "' OR '1'='1",
        '" OR "1"="1',
        "; DROP TABLE submissions; --",
        "'; WAITFOR DELAY '0:0:5' --",
        "' UNION SELECT null,null,null--"
    ]
    for payload in injection_payloads:
        inj_url = f"{url}?search={payload}"
        try:
            r = requests.get(inj_url, headers=headers, timeout=TIMEOUT)
            # Should not cause server errors or leak info, expect 200 or 4xx but no 500
            assert r.status_code != 500, f"Server error with injection payload: {payload}"
            # Response should be properly formed JSON or error handled gracefully
            try:
                _ = r.json()
            except json.JSONDecodeError:
                pass  # Accept if API returns non-JSON but no crash
        except Exception as e:
            raise AssertionError(f"SQLi injection test failed with payload {payload}: {e}")

    # Attempt 4: Broken Access Control - test access without auth or with forged tokens if applicable
    # No auth info provided in PRD, so test with invalid Authorization header
    invalid_auth_headers = headers.copy()
    invalid_auth_headers["Authorization"] = "Bearer invalidtoken"
    try:
        r = requests.get(url, headers=invalid_auth_headers, timeout=TIMEOUT)
        assert r.status_code in (200, 401, 403), f"Unexpected status code with invalid auth: {r.status_code}"
    except Exception as e:
        raise AssertionError(f"Invalid auth header request failed: {e}")

    # Attempt 5: IDOR test - although /submissions is to retrieve all, test /submissions?id=...
    idor_url = f"{url}?id=1 OR 1=1"
    try:
        r = requests.get(idor_url, headers=headers, timeout=TIMEOUT)
        assert r.status_code != 500, "Server error with IDOR-like injection"
    except Exception as e:
        raise AssertionError(f"IDOR-like injection test failed: {e}")

test_get_all_submissions_security()