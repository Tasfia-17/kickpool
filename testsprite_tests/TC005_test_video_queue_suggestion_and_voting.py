import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_video_queue_suggestion_and_voting():
    """
    Verify that users can add videos to the room queue by URL or search,
    see the queued items, upvote queue items, and observe vote counts and queue reordering.
    """
    # Assumptions:
    # - There is an API to create and delete a watch room (POST /api/rooms, DELETE /api/rooms/{id})
    # - There is an API to add video to queue (POST /api/rooms/{room_id}/queue)
    # - There is an API to get the queue list (GET /api/rooms/{room_id}/queue)
    # - There is an API to upvote a queue item (POST /api/rooms/{room_id}/queue/{queue_id}/vote)
    # - Search API for videos (GET /api/videos/search?q=)
    # - Voting increments vote count and reorders queue (descending by votes)

    headers = {
        "Content-Type": "application/json"
    }

    # Step 1: Create a new room to test with to isolate test case
    room_data = {
        "name": "Test Room for Queue Voting",
        "public": True
    }
    room = None
    try:
        create_room_resp = requests.post(
            f"{BASE_URL}/api/rooms",
            json=room_data,
            headers=headers,
            timeout=TIMEOUT
        )
        assert create_room_resp.status_code == 201, f"Room creation failed: {create_room_resp.text}"
        room = create_room_resp.json()
        room_id = str(room.get("id"))
        assert room_id, "Room ID missing in creation response"

        # Step 2: Add video to queue by URL
        video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        add_url_payload = {
            "type": "url",
            "value": video_url
        }
        add_video_url_resp = requests.post(
            f"{BASE_URL}/api/rooms/{room_id}/queue",
            json=add_url_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert add_video_url_resp.status_code == 201, f"Failed to add video by URL: {add_video_url_resp.text}"
        queued_url_item = add_video_url_resp.json()
        queued_url_id = queued_url_item.get("id")
        assert queued_url_id, "Queue item ID missing for URL video"

        # Step 3: Search for videos and add one to queue by search result
        search_query = "nature documentary"
        search_resp = requests.get(
            f"{BASE_URL}/api/videos/search",
            params={"q": search_query},
            headers=headers,
            timeout=TIMEOUT
        )
        assert search_resp.status_code == 200, f"Video search failed: {search_resp.text}"
        search_results = search_resp.json()
        assert isinstance(search_results, list) and len(search_results) > 0, "No search results found"

        video_to_add = search_results[0]
        # Assuming search result has an ID or URL to add
        add_search_payload = {
            "type": "search",
            "value": video_to_add.get("id") or video_to_add.get("url")
        }
        add_video_search_resp = requests.post(
            f"{BASE_URL}/api/rooms/{room_id}/queue",
            json=add_search_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert add_video_search_resp.status_code == 201, f"Failed to add video by search: {add_video_search_resp.text}"
        queued_search_item = add_video_search_resp.json()
        queued_search_id = queued_search_item.get("id")
        assert queued_search_id, "Queue item ID missing for search video"

        # Step 4: Retrieve queue list and verify items present
        get_queue_resp = requests.get(
            f"{BASE_URL}/api/rooms/{room_id}/queue",
            headers=headers,
            timeout=TIMEOUT
        )
        assert get_queue_resp.status_code == 200, f"Failed to get queue list: {get_queue_resp.text}"
        queue_list = get_queue_resp.json()
        found_url_item = next((item for item in queue_list if item.get("id") == queued_url_id), None)
        found_search_item = next((item for item in queue_list if item.get("id") == queued_search_id), None)
        assert found_url_item is not None, "Queued URL video not found in queue list"
        assert found_search_item is not None, "Queued search video not found in queue list"

        # Step 5: Upvote the URL video queue item and verify vote count increases
        # Get initial vote count
        initial_vote_count_url = found_url_item.get("votes", 0)

        upvote_resp = requests.post(
            f"{BASE_URL}/api/rooms/{room_id}/queue/{queued_url_id}/vote",
            headers=headers,
            timeout=TIMEOUT
        )
        assert upvote_resp.status_code == 200, f"Failed to upvote queue item: {upvote_resp.text}"

        # Pause briefly to allow processing and reordering
        time.sleep(1)

        # Step 6: Verify vote count incremented and queue reordered accordingly
        updated_queue_resp = requests.get(
            f"{BASE_URL}/api/rooms/{room_id}/queue",
            headers=headers,
            timeout=TIMEOUT
        )
        assert updated_queue_resp.status_code == 200, f"Failed to get updated queue list: {updated_queue_resp.text}"
        updated_queue = updated_queue_resp.json()

        updated_url_item = next((item for item in updated_queue if item.get("id") == queued_url_id), None)
        assert updated_url_item is not None, "Upvoted queue item not found after voting"
        updated_vote_count_url = updated_url_item.get("votes", 0)
        assert updated_vote_count_url == initial_vote_count_url + 1, (
            f"Vote count did not increment correctly: before={initial_vote_count_url}, after={updated_vote_count_url}"
        )

        # Verify reordering: item with higher votes is before lower votes
        # Sort local copy descending by votes to check order
        sorted_queue = sorted(updated_queue, key=lambda x: x.get("votes", 0), reverse=True)
        assert updated_queue == sorted_queue, "Queue not reordered correctly by vote counts"

    finally:
        # Cleanup: Delete the created room to not pollute test environment
        if room:
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}/api/rooms/{room_id}",
                    headers=headers,
                    timeout=TIMEOUT
                )
                # Allow delete to succeed or already deleted - no assert here
            except Exception:
                pass


test_video_queue_suggestion_and_voting()
