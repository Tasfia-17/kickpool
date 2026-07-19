import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_video_search_and_addition_via_tmdb_and_youtube():
    session = requests.Session()
    headers = {"Content-Type": "application/json"}
    # Step 1: Search TMDB API via CinePurr backend (simulate search via API)
    search_query = "Inception"
    try:
        # Search movies and TV shows (assuming endpoint /api/videos/search supports query param 'q')
        search_resp = session.get(f"{BASE_URL}/api/videos/search", params={"q": search_query}, headers=headers, timeout=TIMEOUT)
        assert search_resp.status_code == 200, "Search request failed"
        search_results = search_resp.json()
        assert isinstance(search_results, list), "Search results should be a list"
        assert any("title" in item or "name" in item for item in search_results), "Results must include items with title or name"

        # Pick the first TMDB item to preview/add
        tmdb_item = search_results[0] if search_results else None
        assert tmdb_item is not None, "No TMDB search results found"
        # Preview likely just a GET detail in real app, here just simulate add to queue
        # Add to queue (assuming POST /api/queue with body containing tmdb id/type)
        queue_payload = {
            "source": "tmdb",
            "media_id": tmdb_item.get("id"),
            "media_type": tmdb_item.get("media_type", "movie")  # often 'movie' or 'tv'
        }
        add_resp = session.post(f"{BASE_URL}/api/queue", json=queue_payload, headers=headers, timeout=TIMEOUT)
        assert add_resp.status_code == 201, f"Adding TMDB item to queue failed: {add_resp.text}"
        add_result = add_resp.json()
        assert "queue_id" in add_result, "Response lacks queue_id after adding video"

        # Step 2: Add video by pasting a YouTube URL
        youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        yt_payload = {
            "source": "youtube",
            "url": youtube_url
        }
        yt_add_resp = session.post(f"{BASE_URL}/api/queue", json=yt_payload, headers=headers, timeout=TIMEOUT)
        assert yt_add_resp.status_code == 201, f"Adding YouTube URL to queue failed: {yt_add_resp.text}"
        yt_add_result = yt_add_resp.json()
        assert "queue_id" in yt_add_result, "Response lacks queue_id after adding YouTube video"

    finally:
        # Cleanup: delete queued items if applicable (to not leave test artifacts)
        # Attempt delete TMDB item queue entry if added
        try:
            if 'add_result' in locals() and "queue_id" in add_result:
                queue_id = add_result["queue_id"]
                del_resp = session.delete(f"{BASE_URL}/api/queue/{queue_id}", headers=headers, timeout=TIMEOUT)
                assert del_resp.status_code in (200, 204), f"Failed to delete TMDB queue item {queue_id}"
        except Exception:
            pass

        # Attempt delete YouTube video queue entry if added
        try:
            if 'yt_add_result' in locals() and "queue_id" in yt_add_result:
                yt_queue_id = yt_add_result["queue_id"]
                del_resp_yt = session.delete(f"{BASE_URL}/api/queue/{yt_queue_id}", headers=headers, timeout=TIMEOUT)
                assert del_resp_yt.status_code in (200, 204), f"Failed to delete YouTube queue item {yt_queue_id}"
        except Exception:
            pass


test_video_search_and_addition_via_tmdb_and_youtube()

