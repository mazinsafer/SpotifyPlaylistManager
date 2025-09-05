import React, { useState } from 'react';
import { spotifyClient } from '../../lib/spotifyClient';
import { SpotifyTrack } from '../../lib/spotifyTypes';
import LoadingSpinner from './LoadingSpinner';

interface TrackSearchProps {
  playlistId: string;
  onTracksAdded: (count: number) => void;
}

const TrackSearch: React.FC<TrackSearchProps> = ({ playlistId, onTracksAdded }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const results = await spotifyClient.searchTracks(searchQuery);
      setSearchResults(results.tracks.items);
      setSelectedTracks(new Set());
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrackSelection = (uri: string) => {
    const newSelection = new Set(selectedTracks);
    if (newSelection.has(uri)) {
      newSelection.delete(uri);
    } else {
      newSelection.add(uri);
    }
    setSelectedTracks(newSelection);
  };

  const handleAddTracks = async () => {
    if (selectedTracks.size === 0) return;

    try {
      setLoading(true);
      const uris = Array.from(selectedTracks);
      await spotifyClient.addTracksToPlaylist(playlistId, uris);
      onTracksAdded(uris.length);
      setSearchResults([]);
      setSelectedTracks(new Set());
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to add tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search for tracks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="input-field flex-1"
        />
        <button onClick={handleSearch} className="btn-primary">
          Search
        </button>
      </div>

      {selectedTracks.size > 0 && (
        <button onClick={handleAddTracks} className="btn-primary w-full mb-3">
          Add {selectedTracks.size} tracks
        </button>
      )}

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {searchResults.map((track) => (
          <div
            key={track.id}
            className="flex items-center p-2 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer"
            onClick={() => toggleTrackSelection(track.uri)}
          >
            <input
              type="checkbox"
              checked={selectedTracks.has(track.uri)}
              onChange={() => {}}
              className="mr-3"
            />
            <div className="flex-1">
              <p className="font-medium text-sm">{track.name}</p>
              <p className="text-xs text-gray-400">
                {track.artists.map(a => a.name).join(', ')} • {track.album.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackSearch;