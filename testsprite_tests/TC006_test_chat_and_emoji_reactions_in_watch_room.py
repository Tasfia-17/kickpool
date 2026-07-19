import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_chat_and_emoji_reactions_in_watch_room():
    # Since no specific API schemas for chat, reactions, or room creation are given,
    # we will simulate the scenario with assumed endpoints and flows.
    # Assumptions:
    #  - There is an API to create a public watch room POST /api/rooms
    #  - Join room may be implicit / GET to /api/rooms/{room_id}/join returns 200
    #  - Send chat message POST /api/rooms/{room_id}/chat with {message: str}
    #  - React to a message POST /api/rooms/{room_id}/chat/{message_id}/reaction with {emoji: str}
    #  - Get chat messages GET /api/rooms/{room_id}/chat returns messages with reactions and counts
    #  - Floating video reactions appear after emoji reaction, confirmed by reaction presence in the chat message response
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # Step 1: Create a new public watch room (empty payload assumed)
    create_room_resp = requests.post(
        f"{BASE_URL}/api/rooms",
        json={"public": True, "name": "Test Room for Chat and Emoji"},
        headers=headers,
        timeout=TIMEOUT
    )
    assert create_room_resp.status_code == 201, f"Failed to create room: {create_room_resp.text}"
    room_data = create_room_resp.json()
    room_id = room_data.get("id")
    assert room_id, "Room ID missing in create room response"
    
    try:
        # Step 2: Join the created room (GET to join)
        join_resp = requests.get(
            f"{BASE_URL}/api/rooms/{room_id}/join",
            timeout=TIMEOUT
        )
        assert join_resp.status_code == 200, f"Failed to join room {room_id}: {join_resp.text}"
        
        # Step 3: Send chat message
        chat_message = "Hello from test_chat_and_emoji_reactions_in_watch_room"
        send_msg_resp = requests.post(
            f"{BASE_URL}/api/rooms/{room_id}/chat",
            json={"message": chat_message},
            headers=headers,
            timeout=TIMEOUT
        )
        assert send_msg_resp.status_code == 201, f"Failed to send chat message: {send_msg_resp.text}"
        msg_data = send_msg_resp.json()
        message_id = msg_data.get("id")
        assert message_id, "Message ID missing in send chat response"
        
        # Step 4: React to the sent message with an emoji (e.g., thumbs up "👍")
        emoji = "👍"
        react_resp = requests.post(
            f"{BASE_URL}/api/rooms/{room_id}/chat/{message_id}/reaction",
            json={"emoji": emoji},
            headers=headers,
            timeout=TIMEOUT
        )
        assert react_resp.status_code == 200, f"Failed to react to message: {react_resp.text}"
        
        # Wait briefly to allow reaction counts and floating reactions to update in system
        time.sleep(2)
        
        # Step 5: Retrieve chat messages to verify reaction count update and floating reaction presence
        get_chat_resp = requests.get(
            f"{BASE_URL}/api/rooms/{room_id}/chat",
            timeout=TIMEOUT
        )
        assert get_chat_resp.status_code == 200, f"Failed to get chat messages: {get_chat_resp.text}"
        chat_messages = get_chat_resp.json()
        assert isinstance(chat_messages, list), "Chat messages response is not a list"
        
        # Find the sent message by ID
        target_message = next((m for m in chat_messages if m.get("id") == message_id), None)
        assert target_message is not None, "Sent chat message not found in chat history"
        
        # Verify the reaction count for the emoji is updated and >= 1
        reactions = target_message.get("reactions", {})
        assert isinstance(reactions, dict), "Reactions field is not a dictionary"
        reaction_count = reactions.get(emoji)
        assert reaction_count is not None and reaction_count >= 1, f"Reaction count for emoji '{emoji}' not updated"
        
        # Verify floating video reactions info present (assuming a 'floatingReactions' field)
        floating_reactions = target_message.get("floatingReactions")
        assert floating_reactions and emoji in floating_reactions, "Floating video reaction not present for emoji"
        
    finally:
        # Clean up by deleting the created room
        del_resp = requests.delete(
            f"{BASE_URL}/api/rooms/{room_id}",
            timeout=TIMEOUT
        )
        # It's okay if deletion fails, but log status for awareness
        if not (del_resp.status_code == 200 or del_resp.status_code == 204):
            print(f"Warning: Failed to delete test room {room_id}, status: {del_resp.status_code}")

test_chat_and_emoji_reactions_in_watch_room()
