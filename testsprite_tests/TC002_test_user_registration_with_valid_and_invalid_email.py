import requests
import uuid

BASE_URL = "http://localhost:3000"
REGISTER_ENDPOINT = "/api/register"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

def test_user_registration_with_valid_and_invalid_email():
    valid_username = "testuser_" + str(uuid.uuid4())[:8]
    valid_email = f"{valid_username}@example.com"
    valid_password = "ValidPass123!"

    invalid_emails = [
        "plainaddress",
        "@missingusername.com",
        "username@.com",
        "username@com",
        "username@domain..com",
        "username@domain,com",
        "username@ domain.com",
    ]

    # Test registration with a valid email (expect success)
    valid_payload = {
        "username": valid_username,
        "email": valid_email,
        "password": valid_password,
    }
    response_valid = requests.post(
        BASE_URL + REGISTER_ENDPOINT, json=valid_payload, headers=HEADERS, timeout=TIMEOUT
    )
    try:
        assert response_valid.status_code == 201, f"Expected 201, got {response_valid.status_code}"
        json_resp = response_valid.json()
        # Adjusted assertion to check for either 'message' or 'username' keys in response
        assert "message" in json_resp or "username" in json_resp, "Successful registration response missing expected fields"
    finally:
        # Attempt to delete the created user to clean up
        if response_valid.ok and "id" in response_valid.json():
            user_id = response_valid.json().get("id")
            try:
                requests.delete(
                    f"{BASE_URL}/api/users/{user_id}",
                    timeout=TIMEOUT,
                )
            except Exception:
                pass

    # Test registrations with invalid emails (expect client error with validation messages)
    for invalid_email in invalid_emails:
        payload = {
            "username": valid_username + "_inv",
            "email": invalid_email,
            "password": valid_password,
        }
        response_invalid = requests.post(
            BASE_URL + REGISTER_ENDPOINT, json=payload, headers=HEADERS, timeout=TIMEOUT
        )
        assert response_invalid.status_code == 400 or response_invalid.status_code == 422, (
            f"Expected 400 or 422 for invalid email '{invalid_email}', got {response_invalid.status_code}"
        )
        try:
            error_json = response_invalid.json()
            # Check for validation error message related to email field
            email_errors = error_json.get("errors", {}).get("email") or error_json.get("email")
            assert email_errors is not None, f"Expected validation error for email format with '{invalid_email}'"
        except ValueError:
            assert False, f"Response for invalid email '{invalid_email}' is not a valid JSON"

test_user_registration_with_valid_and_invalid_email()

