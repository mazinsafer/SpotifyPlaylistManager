import React, { useState, useEffect } from 'react';
import { spotifyClient } from '../../lib/spotifyClient';
import { SpotifyPlaylist, SpotifyTrack } from '../../lib/spotifyTypes';
import { PlaylistUtils } from '../../lib/playlistUtils';
import LoadingSpinner from './LoadingSpinner';

interface MergeToolProps {
  currentPlaylist: SpotifyPlaylist;
  onComplete: () => void;
}

const MergeTool: React.FC<MergeToolProps> = ({ currentPlaylist, onComplete }) => {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const response = await spotifyClient.getUserPlaylists(50, 0);
      setPlaylists(response.items.filter(p => p.id !== currentPlaylist.id));
    } catch (error) {
      console.error('Failed to load playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlaylistSelection = (id: string) => {
    const newSelection = new Set(selectedPlaylists);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedPlaylists(newSelection);
  };

  const handleMerge = async () => {
    if (selectedPlaylists.size === 0) return;

    try {
      setMerging(true);
      
      // Get tracks from all selected playlists
      const allTracksArrays: SpotifyTrack[][] = [];
      
      for (const playlistId of selectedPlaylists) {
        const response = await spotifyClient.getPlaylistTracks(playlistId);
        const tracks = response.items.map(item => item.track).filter(Boolean);
        allTracksArrays.push(tracks);
      }

      // Get current playlist tracks
      const currentResponse = await spotifyClient.getPlaylistTracks(currentPlaylist.id);
      const currentTracks = currentResponse.items.map(item => item.track).filter(Boolean);
      allTracksArrays.push(currentTracks);

      // Merge tracks
      const mergedTracks = PlaylistUtils.mergePlaylists(allTracksArrays, removeDuplicates);
      
      // Create new playlist with merged tracks
      const user = await spotifyClient.getCurrentUser();
      const newPlaylist = await spotifyClient.createPlaylist(
        user.id,
        `${currentPlaylist.name} (Merged)`,
        `Merged from ${selectedPlaylists.size + 1} playlists`,
        false
      );

      // Add tracks to new playlist
      const uris = mergedTracks.map(t => t.uri);
      await spotifyClient.addTracksToPlaylist(newPlaylist.id, uris);

      onComplete();
    } catch (error) {
      console.error('Failed to merge playlists:', error);
    } finally {
      setMerging(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (merging) return <div className="text-center py-8">Merging playlists...</div>;

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Select playlists to merge with "{currentPlaylist.name}"</h3>
        <label className="flex items-center mb-3">
          <input
            type="checkbox"
            checked={removeDuplicates}
            onChange={(e) => setRemoveDuplicates(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm">Remove duplicates when merging</span>
        </label>
        {selectedPlaylists.size > 0 && (
          <button onClick={handleMerge} className="btn-primary w-full">
            Merge {selectedPlaylists.size + 1} playlists
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[250px] overflow-y-auto">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            className="flex items-center p-2 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer"
            onClick={() => togglePlaylistSelection(playlist.id)}
          >
            <input
              type="checkbox"
              checked={selectedPlaylists.has(playlist.id)}
              onChange={() => {}}
              className="mr-3"
            />
            <div className="flex-1">
              <p className="font-medium text-sm">{playlist.name}</p>
              <p className="text-xs text-gray-400">{playlist.tracks.total} tracks</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MergeTool;