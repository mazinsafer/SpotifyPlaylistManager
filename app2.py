import spotipy
from spotipy.oauth2 import SpotifyOAuth
import time
import json
from datetime import datetime

class SpotifyPlaylistManager:
    def __init__(self, client_id, client_secret, redirect_uri):
        
        scope = "playlist-modify-public playlist-modify-private playlist-read-private playlist-read-collaborative"
        
        self.sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
            scope=scope
        ))
        self.user_id = self.sp.current_user()['id']
    
    def get_user_playlists(self, include_collaborative=False):
        playlists = []
        results = self.sp.current_user_playlists(limit=50)
        
        while results:
            for playlist in results['items']:
                if playlist['owner']['id'] == self.user_id or include_collaborative:
                    playlists.append({
                        'id': playlist['id'],
                        'name': playlist['name'],
                        'track_count': playlist['tracks']['total'],
                        'owner': playlist['owner']['display_name'] or playlist['owner']['id'],
                        'collaborative': playlist['collaborative'],
                        'public': playlist['public']
                    })
            
            if results['next']:
                results = self.sp.next(results)
            else:
                break
        
        return playlists
    
    def search_tracks_by_criteria(self, playlist_id, **criteria):
        
        tracks_found = []
        results = self.sp.playlist_tracks(playlist_id, limit=100)
        
        while results:
            for item in results['items']:
                if item['track'] and item['track']['artists']:
                    track = item['track']
                    match = True
                    
                    # Check artist name
                    if 'artist_name' in criteria:
                        artist_match = any(
                            criteria['artist_name'].lower() in artist['name'].lower()
                            for artist in track['artists']
                        )
                        if not artist_match:
                            match = False
                    
                    # Check album name
                    if 'album_name' in criteria and match:
                        if criteria['album_name'].lower() not in track['album']['name'].lower():
                            match = False
                    
                    # Check release year
                    if 'year_range' in criteria and match:
                        try:
                            release_year = int(track['album']['release_date'][:4])
                            year_min, year_max = criteria['year_range']
                            if not (year_min <= release_year <= year_max):
                                match = False
                        except:
                            pass
                    
                    # Check duration (in seconds)
                    if 'duration_range' in criteria and match:
                        duration_sec = track['duration_ms'] / 1000
                        dur_min, dur_max = criteria['duration_range']
                        if not (dur_min <= duration_sec <= dur_max):
                            match = False
                    
                    # Check popularity
                    if 'popularity_range' in criteria and match:
                        pop_min, pop_max = criteria['popularity_range']
                        if not (pop_min <= track['popularity'] <= pop_max):
                            match = False
                    
                    if match:
                        tracks_found.append({
                            'uri': track['uri'],
                            'name': track['name'],
                            'artists': [a['name'] for a in track['artists']],
                            'album': track['album']['name'],
                            'release_date': track['album']['release_date'],
                            'duration_ms': track['duration_ms'],
                            'popularity': track['popularity']
                        })
            
            if results['next']:
                results = self.sp.next(results)
            else:
                break
        
        return tracks_found
    
    def remove_tracks_from_playlist(self, playlist_id, track_uris):
        batch_size = 100
        
        for i in range(0, len(track_uris), batch_size):
            batch = track_uris[i:i + batch_size]
            self.sp.playlist_remove_all_occurrences_of_items(playlist_id, batch)
            time.sleep(0.1)
    
    def duplicate_playlist(self, playlist_id, new_name_suffix="_backup"):
        playlist_info = self.sp.playlist(playlist_id)
        new_name = playlist_info['name'] + new_name_suffix
        
        # Create new playlist
        new_playlist = self.sp.user_playlist_create(
            self.user_id, 
            new_name, 
            public=False,
            description=f"Backup of {playlist_info['name']} created on {datetime.now().strftime('%Y-%m-%d')}"
        )
        
        # Get all tracks from original playlist
        tracks = []
        results = self.sp.playlist_tracks(playlist_id, limit=100)
        
        while results:
            for item in results['items']:
                if item['track']:
                    tracks.append(item['track']['uri'])
            
            if results['next']:
                results = self.sp.next(results)
            else:
                break
        
        # Add tracks to new playlist in batches
        batch_size = 100
        for i in range(0, len(tracks), batch_size):
            batch = tracks[i:i + batch_size]
            self.sp.playlist_add_items(new_playlist['id'], batch)
            time.sleep(0.1)
        
        return new_playlist['id'], new_name
    
    def get_playlist_stats(self, playlist_id):
        tracks = []
        results = self.sp.playlist_tracks(playlist_id, limit=100)
        
        while results:
            for item in results['items']:
                if item['track']:
                    tracks.append(item['track'])
            
            if results['next']:
                results = self.sp.next(results)
            else:
                break
        
        if not tracks:
            return {}
        
        # Calculate statistics
        total_duration = sum(track['duration_ms'] for track in tracks)
        artists = {}
        albums = {}
        years = {}
        
        for track in tracks:
            # Count artists
            for artist in track['artists']:
                artists[artist['name']] = artists.get(artist['name'], 0) + 1
            
            # Count albums
            album_name = track['album']['name']
            albums[album_name] = albums.get(album_name, 0) + 1
            
            # Count years
            try:
                year = track['album']['release_date'][:4]
                years[year] = years.get(year, 0) + 1
            except:
                pass
        
        return {
            'total_tracks': len(tracks),
            'total_duration_hours': total_duration / (1000 * 60 * 60),
            'top_artists': sorted(artists.items(), key=lambda x: x[1], reverse=True)[:10],
            'top_albums': sorted(albums.items(), key=lambda x: x[1], reverse=True)[:10],
            'year_distribution': sorted(years.items(), key=lambda x: x[0], reverse=True)[:10]
        }
    
    def find_duplicates(self, playlist_id):
        tracks = []
        results = self.sp.playlist_tracks(playlist_id, limit=100)
        
        while results:
            for item in results['items']:
                if item['track']:
                    tracks.append({
                        'uri': item['track']['uri'],
                        'name': item['track']['name'],
                        'artists': [a['name'] for a in item['track']['artists']],
                        'key': f"{item['track']['name']}_{item['track']['artists'][0]['name']}"
                    })
            
            if results['next']:
                results = self.sp.next(results)
            else:
                break
        
        # Find duplicates
        seen = {}
        duplicates = []
        
        for track in tracks:
            key = track['key'].lower()
            if key in seen:
                duplicates.append(track)
            else:
                seen[key] = track
        
        return duplicates
    
    def export_playlist(self, playlist_id, filename=None):
        playlist_info = self.sp.playlist(playlist_id)
        
        if not filename:
            safe_name = "".join(c for c in playlist_info['name'] if c.isalnum() or c in (' ', '-', '_')).rstrip()
            filename = f"{safe_name}_export.json"
        
        tracks = []
        results = self.sp.playlist_tracks(playlist_id, limit=100)
        
        while results:
            for item in results['items']:
                if item['track']:
                    track = item['track']
                    tracks.append({
                        'name': track['name'],
                        'artists': [a['name'] for a in track['artists']],
                        'album': track['album']['name'],
                        'release_date': track['album']['release_date'],
                        'duration_ms': track['duration_ms'],
                        'uri': track['uri'],
                        'external_urls': track['external_urls']
                    })
            
            if results['next']:
                results = self.sp.next(results)
            else:
                break
        
        export_data = {
            'playlist_name': playlist_info['name'],
            'description': playlist_info['description'],
            'total_tracks': len(tracks),
            'export_date': datetime.now().isoformat(),
            'tracks': tracks
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        return filename


def main():
    CLIENT_ID = "put client ID here"
    CLIENT_SECRET = "put client secret here"
    REDIRECT_URI = "https://developer.spotify.com/callback"
    
    manager = SpotifyPlaylistManager(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
    
    while True:
        print("\n=== Spotify Playlist Manager ===")
        print("1. Remove tracks by artist")
        print("2. Remove tracks by album")
        print("3. Remove tracks by year range")
        print("4. Remove tracks by duration")
        print("5. Find and remove duplicates")
        print("6. Backup playlist")
        print("7. Show playlist statistics")
        print("8. Export playlist to JSON")
        print("9. Advanced search and remove")
        print("0. Exit")
        
        choice = input("\nSelect an option: ").strip()
        
        if choice == "0":
            print("Goodbye!")
            break
        
        # Show playlists
        print("\nYour playlists:")
        playlists = manager.get_user_playlists()
        for i, playlist in enumerate(playlists, 1):
            print(f"{i}. {playlist['name']} ({playlist['track_count']} tracks)")
        
        try:
            playlist_num = int(input("\nSelect playlist number: ")) - 1
            if playlist_num < 0 or playlist_num >= len(playlists):
                print("Invalid playlist number!")
                continue
            
            selected_playlist = playlists[playlist_num]
            playlist_id = selected_playlist['id']
            
            if choice == "1":
                artist_name = input("Enter artist name to remove: ")
                tracks = manager.search_tracks_by_criteria(playlist_id, artist_name=artist_name)
                
                if tracks:
                    print(f"\nFound {len(tracks)} tracks by {artist_name}:")
                    for track in tracks[:10]:  # Show first 10
                        print(f"  - {track['name']} by {', '.join(track['artists'])}")
                    if len(tracks) > 10:
                        print(f"  ... and {len(tracks) - 10} more")
                    
                    if input("Remove these tracks? (y/n): ").lower() == 'y':
                        track_uris = [track['uri'] for track in tracks]
                        manager.remove_tracks_from_playlist(playlist_id, track_uris)
                        print(f"Removed {len(tracks)} tracks!")
                else:
                    print("No tracks found for that artist.")
            
            elif choice == "2":
                album_name = input("Enter album name to remove: ")
                tracks = manager.search_tracks_by_criteria(playlist_id, album_name=album_name)
                
                if tracks:
                    print(f"\nFound {len(tracks)} tracks from albums matching '{album_name}':")
                    for track in tracks[:10]:
                        print(f"  - {track['name']} from {track['album']}")
                    if len(tracks) > 10:
                        print(f"  ... and {len(tracks) - 10} more")
                    
                    if input("Remove these tracks? (y/n): ").lower() == 'y':
                        track_uris = [track['uri'] for track in tracks]
                        manager.remove_tracks_from_playlist(playlist_id, track_uris)
                        print(f"Removed {len(tracks)} tracks!")
                else:
                    print("No tracks found for that album.")
            
            elif choice == "3":
                try:
                    year_min = int(input("Enter minimum year: "))
                    year_max = int(input("Enter maximum year: "))
                    tracks = manager.search_tracks_by_criteria(playlist_id, year_range=(year_min, year_max))
                    
                    if tracks:
                        print(f"\nFound {len(tracks)} tracks from {year_min}-{year_max}:")
                        for track in tracks[:10]:
                            print(f"  - {track['name']} ({track['release_date'][:4]})")
                        if len(tracks) > 10:
                            print(f"  ... and {len(tracks) - 10} more")
                        
                        if input("Remove these tracks? (y/n): ").lower() == 'y':
                            track_uris = [track['uri'] for track in tracks]
                            manager.remove_tracks_from_playlist(playlist_id, track_uris)
                            print(f"Removed {len(tracks)} tracks!")
                    else:
                        print("No tracks found in that year range.")
                except ValueError:
                    print("Please enter valid years!")
            
            elif choice == "4":
                try:
                    min_sec = int(input("Enter minimum duration (seconds): "))
                    max_sec = int(input("Enter maximum duration (seconds): "))
                    tracks = manager.search_tracks_by_criteria(playlist_id, duration_range=(min_sec, max_sec))
                    
                    if tracks:
                        print(f"\nFound {len(tracks)} tracks between {min_sec}-{max_sec} seconds:")
                        for track in tracks[:10]:
                            duration = track['duration_ms'] / 1000
                            print(f"  - {track['name']} ({duration:.0f}s)")
                        if len(tracks) > 10:
                            print(f"  ... and {len(tracks) - 10} more")
                        
                        if input("Remove these tracks? (y/n): ").lower() == 'y':
                            track_uris = [track['uri'] for track in tracks]
                            manager.remove_tracks_from_playlist(playlist_id, track_uris)
                            print(f"Removed {len(tracks)} tracks!")
                    else:
                        print("No tracks found in that duration range.")
                except ValueError:
                    print("Please enter valid durations!")
            
            elif choice == "5":
                duplicates = manager.find_duplicates(playlist_id)
                if duplicates:
                    print(f"\nFound {len(duplicates)} duplicate tracks:")
                    for track in duplicates[:10]:
                        print(f"  - {track['name']} by {', '.join(track['artists'])}")
                    if len(duplicates) > 10:
                        print(f"  ... and {len(duplicates) - 10} more")
                    
                    if input("Remove duplicates? (y/n): ").lower() == 'y':
                        track_uris = [track['uri'] for track in duplicates]
                        manager.remove_tracks_from_playlist(playlist_id, track_uris)
                        print(f"Removed {len(duplicates)} duplicate tracks!")
                else:
                    print("No duplicates found!")
            
            elif choice == "6":
                backup_id, backup_name = manager.duplicate_playlist(playlist_id)
                print(f"Created backup playlist: {backup_name}")
            
            elif choice == "7":
                print("Calculating statistics...")
                stats = manager.get_playlist_stats(playlist_id)
                if stats:
                    print(f"\n=== Statistics for {selected_playlist['name']} ===")
                    print(f"Total tracks: {stats['total_tracks']}")
                    print(f"Total duration: {stats['total_duration_hours']:.1f} hours")
                    print(f"\nTop artists:")
                    for artist, count in stats['top_artists'][:5]:
                        print(f"  {artist}: {count} tracks")
                    print(f"\nTop albums:")
                    for album, count in stats['top_albums'][:5]:
                        print(f"  {album}: {count} tracks")
                    print(f"\nYear distribution:")
                    for year, count in stats['year_distribution'][:5]:
                        print(f"  {year}: {count} tracks")
            
            elif choice == "8":
                filename = manager.export_playlist(playlist_id)
                print(f"Exported playlist to: {filename}")
            
            elif choice == "9":
                print("Advanced search options:")
                criteria = {}
                
                artist = input("Artist name (or press Enter to skip): ").strip()
                if artist:
                    criteria['artist_name'] = artist
                
                album = input("Album name (or press Enter to skip): ").strip()
                if album:
                    criteria['album_name'] = album
                
                year_input = input("Year range (e.g., '2010-2020' or press Enter to skip): ").strip()
                if year_input and '-' in year_input:
                    try:
                        year_min, year_max = map(int, year_input.split('-'))
                        criteria['year_range'] = (year_min, year_max)
                    except ValueError:
                        print("Invalid year range format!")
                        continue
                
                if criteria:
                    tracks = manager.search_tracks_by_criteria(playlist_id, **criteria)
                    if tracks:
                        print(f"\nFound {len(tracks)} tracks matching criteria:")
                        for track in tracks[:10]:
                            print(f"  - {track['name']} by {', '.join(track['artists'])} ({track['release_date'][:4]})")
                        if len(tracks) > 10:
                            print(f"  ... and {len(tracks) - 10} more")
                        
                        if input("Remove these tracks? (y/n): ").lower() == 'y':
                            track_uris = [track['uri'] for track in tracks]
                            manager.remove_tracks_from_playlist(playlist_id, track_uris)
                            print(f"Removed {len(tracks)} tracks!")
                    else:
                        print("No tracks found matching criteria.")
                else:
                    print("No search criteria provided!")
        
        except (ValueError, IndexError):
            print("Invalid input! Please try again.")
        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()