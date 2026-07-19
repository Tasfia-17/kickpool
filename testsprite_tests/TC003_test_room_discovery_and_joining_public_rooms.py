import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_room_discovery_and_joining_public_rooms():
    # Step 1: Browse public watch rooms on homepage
    try:
        response = requests.get(f"{BASE_URL}/api/rooms/public", timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Failed to get public rooms: {e}"

    rooms_data = response.json()
    assert isinstance(rooms_data, list), "Public rooms response should be a list"
    assert len(rooms_data) > 0, "No public rooms available to join"

    # Step 2: Filter for public rooms that are joinable - assuming rooms have 'public' and 'active' flags
    filtered_rooms = [
        room for room in rooms_data
        if room.get("isPublic", True) and room.get("isActive", True)
    ]
    assert len(filtered_rooms) > 0, "No active public rooms found after filtering"

    # Step 3: Sort rooms by trending or recent - assume rooms have 'trendingScore' and 'createdAt'
    sorted_rooms = sorted(
        filtered_rooms,
        key=lambda r: r.get("trendingScore", 0),
        reverse=True
    )
    room_to_join = sorted_rooms[0]
    room_id = room_to_join.get("id")
    assert room_id, "Selected room does not have an ID"

    # Step 4: Join the selected room (GET room detail to simulate joining)
    try:
        join_response = requests.get(f"{BASE_URL}/api/rooms/{room_id}", timeout=TIMEOUT)
        join_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Failed to join room {room_id}: {e}"

    room_detail = join_response.json()
    assert "videoPlayback" in room_detail, "Room detail missing video playback info"
    assert "chat" in room_detail, "Room detail missing chat info"
    assert room_detail.get("id") == room_id, "Joined room ID mismatch"

    # Step 5: Verify synchronized video playback and chat interface presence
    video_playback = room_detail.get("videoPlayback")
    chat = room_detail.get("chat")

    assert isinstance(video_playback, dict), "videoPlayback should be a dict"
    assert "currentTime" in video_playback, "videoPlayback missing currentTime"
    assert "isPlaying" in video_playback, "videoPlayback missing isPlaying"

    assert isinstance(chat, dict), "chat should be a dict"
    assert "messages" in chat, "chat missing messages list"
    assert isinstance(chat["messages"], list), "chat messages should be a list"

test_room_discovery_and_joining_public_rooms()
