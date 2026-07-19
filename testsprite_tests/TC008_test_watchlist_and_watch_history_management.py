import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_watchlist_and_watch_history_management():
    session = requests.Session()

    # 1. Register a new user
    unique_suffix = str(uuid.uuid4())
    username = f"testuser_{unique_suffix[:8]}"
    email = f"{unique_suffix[:8]}@example.com"
    password = "TestPassword123!"
    register_payload = {
        "username": username,
        "email": email,
        "password": password
    }
    try:
        resp = session.post(
            f"{BASE_URL}/api/register",
            json=register_payload,
            timeout=TIMEOUT
        )
        assert resp.status_code == 201 or resp.status_code == 200, f"Registration failed: {resp.text}"

        # 2. Log in with registered user
        login_payload = {
            "email": email,
            "password": password
        }
        login_resp = session.post(
            f"{BASE_URL}/api/auth/callback/credentials",
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_json = login_resp.json()
        # Assume the response has a field 'token' or session cookie for auth; here let's handle cookie auth
        # session should already keep cookies

        # 3. Search a TMDB movie or TV show using the API if available; if not, mock a TMDB result
        # Since PRD does not explicitly define TMDB search API, we simulate a TMDB result
        tmdb_result = {
            "id": 550,
            "title": "Fight Club",
            "media_type": "movie",
            "poster_path": "/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg"
        }

        # 4. Save TMDB result to personal watchlist
        # Assuming there is an API endpoint to manage watchlist: POST /api/watchlist with movie data
        add_watchlist_resp = session.post(
            f"{BASE_URL}/api/watchlist",
            json={"tmdbId": tmdb_result["id"], "mediaType": tmdb_result["media_type"]},
            timeout=TIMEOUT
        )
        assert add_watchlist_resp.status_code == 201, f"Adding to watchlist failed: {add_watchlist_resp.text}"

        # 5. Retrieve watchlist and verify saved item is present
        get_watchlist_resp = session.get(
            f"{BASE_URL}/api/watchlist",
            timeout=TIMEOUT
        )
        assert get_watchlist_resp.status_code == 200, f"Fetching watchlist failed: {get_watchlist_resp.text}"
        watchlist = get_watchlist_resp.json()
        assert any(item.get("tmdbId") == tmdb_result["id"] for item in watchlist), "Saved TMDB result not in watchlist"

        # 6. Remove the TMDB result from watchlist
        # Assuming endpoint to DELETE /api/watchlist/{tmdbId}
        delete_resp = session.delete(
            f"{BASE_URL}/api/watchlist/{tmdb_result['id']}",
            timeout=TIMEOUT
        )
        assert delete_resp.status_code == 200 or delete_resp.status_code == 204, f"Removing from watchlist failed: {delete_resp.text}"

        # Verify removal from watchlist
        get_watchlist_again_resp = session.get(
            f"{BASE_URL}/api/watchlist",
            timeout=TIMEOUT
        )
        assert get_watchlist_again_resp.status_code == 200, f"Fetching watchlist post-removal failed: {get_watchlist_again_resp.text}"
        watchlist_after_removal = get_watchlist_again_resp.json()
        assert all(item.get("tmdbId") != tmdb_result["id"] for item in watchlist_after_removal), "Watchlist item not removed"

        # 7. Simulate joining a room and auto-log a watch history entry
        # No explicit API for joining rooms in PRD or API calls given; simulate watch history entry creation:
        # Assuming POST /api/watch-history with roomId and video info to simulate auto-logged entry for test
        # Create a test room (simulated) - generate uuid for room id
        room_id = str(uuid.uuid4())
        history_payload = {
            "roomId": room_id,
            "tmdbId": tmdb_result["id"],
            "mediaType": tmdb_result["media_type"],
            "watchedAt": "2026-04-04T12:00:00Z"
        }
        add_history_resp = session.post(
            f"{BASE_URL}/api/watch-history",
            json=history_payload,
            timeout=TIMEOUT
        )
        assert add_history_resp.status_code == 201, f"Creating watch history entry failed: {add_history_resp.text}"

        # 8. Retrieve watch history and verify entry is present with a link to rejoin the room
        get_history_resp = session.get(
            f"{BASE_URL}/api/watch-history",
            timeout=TIMEOUT
        )
        assert get_history_resp.status_code == 200, f"Fetching watch history failed: {get_history_resp.text}"
        watch_history = get_history_resp.json()
        matched_entries = [entry for entry in watch_history if entry.get("roomId") == room_id and entry.get("tmdbId") == tmdb_result["id"]]
        assert matched_entries, "Watch history entry missing for joined room"
        # Check room link presence in entry (assuming a field 'roomLink' or similar)
        entry = matched_entries[0]
        assert "roomLink" in entry and entry["roomLink"].endswith(room_id), "Watch history entry missing rejoin room link"

    finally:
        # Clean up: delete user account if API for deletion exists (not in PRD)
        # Clean up watchlist items if any leftovers to maintain test isolation
        # Clean up watch history may also be needed
        # Since no user deletion API defined, skip explicit user deletion for now.
        try:
            session.delete(f"{BASE_URL}/api/watchlist/{tmdb_result['id']}", timeout=TIMEOUT)
        except Exception:
            pass
        try:
            session.delete(f"{BASE_URL}/api/watch-history/{room_id}", timeout=TIMEOUT)
        except Exception:
            pass

test_watchlist_and_watch_history_management()
