import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_progress_tracking_daily_quests_and_leaderboards():
    # Step 1: Register a new user to test with
    register_url = f"{BASE_URL}/api/register"
    unique_suffix = str(uuid.uuid4())[:8]
    username = f"testuser_{unique_suffix}"
    email = f"{username}@example.com"
    password = "TestPass123!"

    register_payload = {
        "username": username,
        "email": email,
        "password": password
    }
    headers = {"Content-Type": "application/json"}

    # Register user
    register_resp = requests.post(register_url, json=register_payload, headers=headers, timeout=TIMEOUT)
    assert register_resp.status_code == 201 or register_resp.status_code == 200, f"Registration failed: {register_resp.text}"

    try:
        # Step 2: Login to get authentication token/session cookie
        login_url = f"{BASE_URL}/api/auth/callback/credentials"
        login_payload = {
            "email": email,
            "password": password
        }

        login_resp = requests.post(login_url, json=login_payload, headers=headers, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"

        # Assuming server returns a session token or sets cookies for auth
        auth_cookies = login_resp.cookies
        auth_headers = {"Content-Type": "application/json"}

        # Step 3: Access the homepage user progress (XP, daily quests) - assuming /api/user/progress endpoint
        progress_url = f"{BASE_URL}/api/user/progress"
        progress_resp = requests.get(progress_url, headers=auth_headers, cookies=auth_cookies, timeout=TIMEOUT)
        assert progress_resp.status_code == 200, f"Failed to get user progress: {progress_resp.text}"
        progress_data = progress_resp.json()

        # Validate expected fields: XP, daily quests (list), progress updates
        assert "xp" in progress_data and isinstance(progress_data["xp"], int), "XP data missing or invalid"
        assert "dailyQuests" in progress_data and isinstance(progress_data["dailyQuests"], list), "Daily quests data missing or invalid"
        assert "progressUpdates" in progress_data, "Progress updates data missing"

        # Step 4: Complete a daily quest - assuming endpoint /api/quests/complete with questId
        if progress_data["dailyQuests"]:
            quest_to_complete = progress_data["dailyQuests"][0]
            assert "id" in quest_to_complete, "Quest ID missing"

            complete_quest_url = f"{BASE_URL}/api/quests/complete"
            complete_payload = {"questId": quest_to_complete["id"]}
            complete_resp = requests.post(complete_quest_url, json=complete_payload, headers=auth_headers, cookies=auth_cookies, timeout=TIMEOUT)

            assert complete_resp.status_code == 200, f"Failed to complete quest: {complete_resp.text}"
            complete_result = complete_resp.json()
            assert complete_result.get("success") is True, "Quest completion response indicates failure"
            assert "rewardXp" in complete_result and isinstance(complete_result["rewardXp"], int), "Reward XP missing or invalid"

            # Step 5: Verify XP updated on progress
            updated_progress_resp = requests.get(progress_url, headers=auth_headers, cookies=auth_cookies, timeout=TIMEOUT)
            assert updated_progress_resp.status_code == 200, f"Failed to get updated progress: {updated_progress_resp.text}"
            updated_progress_data = updated_progress_resp.json()
            assert updated_progress_data["xp"] >= progress_data["xp"], "XP did not increase after quest completion"

        # Step 6: Retrieve leaderboard data - assuming /api/leaderboards
        leaderboard_url = f"{BASE_URL}/api/leaderboards"
        leaderboard_resp = requests.get(leaderboard_url, headers=auth_headers, cookies=auth_cookies, timeout=TIMEOUT)
        assert leaderboard_resp.status_code == 200, f"Failed to get leaderboards: {leaderboard_resp.text}"
        leaderboard_data = leaderboard_resp.json()

        # Validate leaderboard structure: list of users with stats and profiles
        assert isinstance(leaderboard_data, list) and len(leaderboard_data) > 0, "Leaderboard data missing or empty"
        user_entry = leaderboard_data[0]
        required_fields = ["username", "watchTime", "level", "streak", "messagesSent", "profileUrl"]
        for field in required_fields:
            assert field in user_entry, f"Leaderboard user entry missing field '{field}'"

        # Optionally, access a user profile from leaderboard
        profile_url = f"{BASE_URL}/api/profile/{user_entry['username']}"
        profile_resp = requests.get(profile_url, headers=auth_headers, cookies=auth_cookies, timeout=TIMEOUT)
        assert profile_resp.status_code == 200, f"Failed to get user profile for {user_entry['username']}: {profile_resp.text}"
        profile_data = profile_resp.json()
        assert "username" in profile_data and profile_data["username"] == user_entry["username"], "User profile data mismatch"

    finally:
        # Cleanup: delete the test user if an API exists - assuming DELETE /api/user/{username}
        delete_user_url = f"{BASE_URL}/api/user/{username}"
        try:
            del_resp = requests.delete(delete_user_url, headers=auth_headers, cookies=auth_cookies, timeout=TIMEOUT)
            assert del_resp.status_code == 200 or del_resp.status_code == 204, f"User cleanup failed: {del_resp.text}"
        except Exception:
            pass

test_progress_tracking_daily_quests_and_leaderboards()
