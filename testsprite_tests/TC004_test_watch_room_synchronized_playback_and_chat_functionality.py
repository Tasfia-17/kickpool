import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30


def test_watch_room_synchronized_playback_and_chat_functionality():
    """
    Verify that users joining a watch room experience synchronized video playback controlled by the host,
    can send chat messages, see typing indicators, and view recent chat history.
    """
    session = requests.Session()
    # Step 1: Discover available public watch rooms (assuming there's an endpoint to list rooms)
    try:
        rooms_resp = session.get(f"{BASE_URL}/api/rooms/public", timeout=TIMEOUT)
        assert rooms_resp.status_code == 200, f"Failed to fetch public rooms: {rooms_resp.text}"
        rooms_data = rooms_resp.json()
        assert isinstance(rooms_data, list), "Expected a list of rooms"

        if not rooms_data:
            # No public rooms available - fail the test because can't join a watch room
            assert False, "No public watch rooms available to join for testing"

        # Choose the first room
        room = rooms_data[0]
        room_id = room.get("id")
        assert room_id is not None, "Room does not have an ID"

        # Step 2: Join the watch room (assuming GET /api/room/{room_id}/join returns session info)
        join_resp = session.get(f"{BASE_URL}/api/room/{room_id}/join", timeout=TIMEOUT)
        assert join_resp.status_code == 200, f"Failed to join room {room_id}: {join_resp.text}"
        join_data = join_resp.json()

        # Validate room join response contains playback state, chat history, typing indicators state
        playback_state = join_data.get("playback_state")
        assert playback_state is not None, "Missing playback state on join"
        chat_history = join_data.get("chat_history")
        assert isinstance(chat_history, list), "Chat history should be a list"
        typing_indicators = join_data.get("typing_indicators")
        assert isinstance(typing_indicators, list), "Typing indicators should be a list"

        # Step 3: Simulate sending a chat message to the room
        chat_message = {
            "user": "test_user",
            "message": "Hello from automated test",
            "timestamp": int(time.time() * 1000)
        }
        # Assuming a POST endpoint to send chat message to room: /api/room/{room_id}/chat
        chat_send_resp = session.post(
            f"{BASE_URL}/api/room/{room_id}/chat",
            json=chat_message,
            timeout=TIMEOUT,
            headers={"Content-Type": "application/json"},
        )
        assert chat_send_resp.status_code == 200, f"Failed to send chat message: {chat_send_resp.text}"
        chat_send_data = chat_send_resp.json()
        assert chat_send_data.get("status") == "success", "Chat message was not acknowledged as successful"

        # Step 4: Confirm that the message appears in recent chat history by fetching recent chat history again
        chat_history_resp = session.get(f"{BASE_URL}/api/room/{room_id}/chat/history", timeout=TIMEOUT)
        assert chat_history_resp.status_code == 200, f"Failed to get chat history: {chat_history_resp.text}"
        recent_chat = chat_history_resp.json()
        assert any(
            msg.get("message") == chat_message["message"] and msg.get("user") == chat_message["user"]
            for msg in recent_chat
        ), "Sent chat message not found in recent chat history"

        # Step 5: Check typing indicators - simulate "user is typing" indicator
        typing_start_payload = {
            "user": "test_user",
            "typing": True
        }
        typing_start_resp = session.post(
            f"{BASE_URL}/api/room/{room_id}/typing",
            json=typing_start_payload,
            timeout=TIMEOUT,
            headers={"Content-Type": "application/json"},
        )
        assert typing_start_resp.status_code == 200, f"Failed to send typing indicator: {typing_start_resp.text}"
        typing_state_resp = session.get(f"{BASE_URL}/api/room/{room_id}/typing", timeout=TIMEOUT)
        assert typing_state_resp.status_code == 200, f"Failed to get typing indicators: {typing_state_resp.text}"
        typing_users = typing_state_resp.json()
        assert any(user.get("user") == "test_user" for user in typing_users), "Typing indicator for test_user not present"

        # Step 6: Simulate stopping typing indicator
        typing_stop_payload = {
            "user": "test_user",
            "typing": False
        }
        typing_stop_resp = session.post(
            f"{BASE_URL}/api/room/{room_id}/typing",
            json=typing_stop_payload,
            timeout=TIMEOUT,
            headers={"Content-Type": "application/json"},
        )
        assert typing_stop_resp.status_code == 200, f"Failed to stop typing indicator: {typing_stop_resp.text}"

        # Step 7: Verify synchronized playback state info (e.g., play/pause, timestamp)
        playback_state_resp = session.get(f"{BASE_URL}/api/room/{room_id}/playback", timeout=TIMEOUT)
        assert playback_state_resp.status_code == 200, f"Failed to get playback state: {playback_state_resp.text}"
        playback_info = playback_state_resp.json()
        assert "status" in playback_info and playback_info["status"] in {"playing", "paused", "buffering"}, \
            "Unexpected playback status"
        assert "timestamp" in playback_info and isinstance(playback_info["timestamp"], (int, float)), \
            "Playback timestamp missing or invalid"

    finally:
        session.close()


test_watch_room_synchronized_playback_and_chat_functionality()
