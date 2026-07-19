import requests

BASE_URL = "http://localhost:3000"
LOGIN_ENDPOINT = "/api/auth/callback/credentials"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

def test_user_login_with_valid_and_invalid_credentials():
    valid_credentials_tests = [
        {"identifier": "validuser@example.com", "password": "validpassword"},
        {"identifier": "validusername", "password": "validpassword"},
    ]
    invalid_credentials_tests = [
        {"identifier": "invaliduser@example.com", "password": "wrongpassword"},
        {"identifier": "invalidusername", "password": "wrongpassword"},
    ]

    # Test successful login with valid credentials
    for creds in valid_credentials_tests:
        try:
            payload = {
                "identifier": creds["identifier"],  # use 'identifier' key as per PRD
                "password": creds["password"]
            }
            response = requests.post(
                BASE_URL + LOGIN_ENDPOINT,
                json=payload,
                headers=HEADERS,
                timeout=TIMEOUT,
            )
            assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
            try:
                resp_json = response.json()
            except ValueError:
                assert False, "Response is not valid JSON"
            assert (
                "user" in resp_json or "token" in resp_json
            ), "Login response missing user or token data"
        except requests.exceptions.RequestException as e:
            assert False, f"Request failed: {e}"

    # Test failed login with invalid credentials
    for creds in invalid_credentials_tests:
        try:
            payload = {
                "identifier": creds["identifier"],
                "password": creds["password"],
            }
            response = requests.post(
                BASE_URL + LOGIN_ENDPOINT,
                json=payload,
                headers=HEADERS,
                timeout=TIMEOUT,
            )
            assert (
                response.status_code == 401 or response.status_code == 400
            ), f"Expected 401 or 400 for invalid credentials, got {response.status_code}"
            try:
                resp_json = response.json()
            except ValueError:
                assert False, "Response is not valid JSON"
            assert (
                "error" in resp_json or "message" in resp_json
            ), "Error message missing in response"
            error_msg = resp_json.get("error") or resp_json.get("message")
            assert (
                "invalid" in error_msg.lower()
                or "credential" in error_msg.lower()
                or "failed" in error_msg.lower()
            ), f"Unexpected error message content: {error_msg}"
        except requests.exceptions.RequestException as e:
            assert False, f"Request failed: {e}"


test_user_login_with_valid_and_invalid_credentials()
