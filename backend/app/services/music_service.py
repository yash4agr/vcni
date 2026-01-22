from typing import Optional, List
from ytmusicapi import YTMusic


class MusicService:
    """Service for searching and playing music via YouTube Music."""

    def __init__(self):
        # Initialize YTMusic immediately - fail fast if it doesn't work
        self._ytmusic = YTMusic()
        # print("[MusicService] YTMusic client initialized successfully")

    async def search(self, query: str, filter_type: str = "songs") -> dict:
        """
        Search YouTube Music for songs, artists, or albums.
        
        Args:
            query: Search query (song name, artist, etc.)
            filter_type: Type of results - 'songs', 'artists', 'albums', 'playlists'
            
        Returns:
            Music data formatted for the frontend MusicWidget
            
        Raises:
            ValueError: If query is empty
            RuntimeError: If search fails
        """
        # Fail fast on invalid input
        if not query or not query.strip():
            raise ValueError("Search query cannot be empty")

        # Map filter types
        filter_map = {
            "songs": "songs",
            "song": "songs",
            "artists": "artists",
            "artist": "artists",
            "albums": "albums",
            "album": "albums",
            "playlists": "playlists",
            "playlist": "playlists",
        }
        yt_filter = filter_map.get(filter_type.lower(), "songs")

        # print(f"[MusicService] Searching for '{query}' with filter '{yt_filter}'")

        # Search YouTube Music - let exceptions propagate
        results = self._ytmusic.search(query, filter=yt_filter, limit=5)

        # Assert we got results
        if not results:
            raise RuntimeError(f"No results found for query: {query}")

        # print(f"[MusicService] Found {len(results)} results")
        
        # Debug: Show first result to verify search accuracy
        # if results:
        #     first = results[0]
        #     print(f"[MusicService] First result: '{first.get('title')}' by '{first.get('artists', [{}])[0].get('name', 'Unknown')}'")

        # Format first result as main track
        main_track = self._format_track(results[0])

        # Format rest as playlist
        playlist = []
        for i, track in enumerate(results[1:5], start=1):
            playlist.append({
                "id": i,
                "title": self._get_title(track),
                "artist": self._get_artist(track),
                "videoId": track.get("videoId"),
            })

        return {
            **main_track,
            "playlist": playlist,
        }

    def _format_track(self, track: dict) -> dict:
        """Format a YouTube Music track for the widget."""
        assert track is not None, "Track cannot be None"
        
        # Extract duration in seconds
        duration_text = track.get("duration", "0:00")
        duration_seconds = self._parse_duration(duration_text)

        # Get thumbnail URL
        thumbnails = track.get("thumbnails", [])
        thumbnail_url = thumbnails[-1]["url"] if thumbnails else None

        return {
            "title": self._get_title(track),
            "artist": self._get_artist(track),
            "album": self._get_album(track),
            "duration": duration_seconds,
            "videoId": track.get("videoId"),
            "thumbnailUrl": thumbnail_url,
            "browseId": track.get("browseId"),
        }

    def _get_title(self, track: dict) -> str:
        """Extract title from track."""
        title = track.get("title")
        assert title, f"Track missing title: {track}"
        return title

    def _get_artist(self, track: dict) -> str:
        """Extract artist name from track."""
        artists = track.get("artists", [])
        if artists:
            name = artists[0].get("name")
            if name:
                return name
        return "Unknown Artist"

    def _get_album(self, track: dict) -> str:
        """Extract album name from track."""
        album = track.get("album")
        if album:
            name = album.get("name")
            if name:
                return name
        return "Unknown Album"

    def _parse_duration(self, duration_str: str) -> int:
        """Parse duration string (e.g., '3:45') to seconds."""
        if not duration_str:
            return 0
        try:
            parts = duration_str.split(":")
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            return 0
        except ValueError:
            return 0

    async def get_watch_playlist(self, video_id: str) -> List[dict]:
        """Get the 'watch next' playlist for a video."""
        assert video_id, "video_id cannot be empty"
        
        watch_playlist = self._ytmusic.get_watch_playlist(video_id, limit=10)
        tracks = watch_playlist.get("tracks", [])

        return [
            {
                "id": i,
                "title": track.get("title", "Unknown"),
                "artist": self._get_artist(track),
                "videoId": track.get("videoId"),
            }
            for i, track in enumerate(tracks, start=1)
        ]

    def generate_response(self, music_data: dict, query: str) -> str:
        """Generate a natural language response for music search."""
        assert music_data, "music_data cannot be empty"
        
        title = music_data.get("title", "Unknown")
        artist = music_data.get("artist", "Unknown Artist")

        return f"Now playing '{title}' by {artist}. Enjoy the music!"
