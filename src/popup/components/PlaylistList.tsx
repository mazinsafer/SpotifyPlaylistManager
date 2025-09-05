import React, { useState, useEffect } from 'react';
import { spotifyClient } from '../../lib/spotifyClient';
import { SpotifyPlaylist } from '../../lib/spotifyTypes';
import PlaylistActions from './PlaylistActions';
import LoadingSpinner from './LoadingSpinner';

interface PlaylistListProps {
  onToast: (message: string, type: 'success' | 'error') => void;
}

const PlaylistList: React.FC<PlaylistListProps> = ({ onToast }) => {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const response = await spotifyClient.getUserPlaylists(50, 0);
      setPlaylists(response.items);
    } catch (error) {
      onToast('Failed to load playlists', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      onToast('Please enter a playlist name', 'error');
      return;
    }

    try {
      const user = await spotifyClient.getCurrentUser();
      await spotifyClient.createPlaylist(
        user.id,
        newPlaylistName,
        newPlaylistDesc,
        newPlaylistPublic
      );
      onToast('Playlist created successfully!', 'success');
      setShowCreateForm(false);
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      setNewPlaylistPublic(false);
      loadPlaylists();
    } catch (error) {
      onToast('Failed to create playlist', 'error');
      console.error(error);
    }
  };

  const filteredPlaylists = playlists.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  if (selectedPlaylist) {
    return (
      <PlaylistActions
        playlist={selectedPlaylist}
        onBack={() => setSelectedPlaylist(null)}
        onToast={onToast}
        onRefresh={loadPlaylists}
      />
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field flex-1"
          />
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary"
          >
            Create New
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-3">Create New Playlist</h3>
            <input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="input-field w-full mb-2"
            />
            <textarea
              placeholder="Description (optional)"
              value={newPlaylistDesc}
              onChange={(e) => setNewPlaylistDesc(e.target.value)}
              className="input-field w-full mb-2 h-20 resize-none"
            />
            <label className="flex items-center mb-3">
              <input
                type="checkbox"
                checked={newPlaylistPublic}
                onChange={(e) => setNewPlaylistPublic(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Make public</span>
            </label>
            <div className="flex gap-2">
              <button onClick={handleCreatePlaylist} className="btn-primary">
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewPlaylistName('');
                  setNewPlaylistDesc('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredPlaylists.map((playlist) => (
          <div
            key={playlist.id}
            onClick={() => setSelectedPlaylist(playlist)}
            className="flex items-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
          >
            {playlist.images?.[0] && (
              <img
                src={playlist.images[0].url}
                alt={playlist.name}
                className="w-12 h-12 rounded mr-3"
              />
            )}
            <div className="flex-1">
              <p className="font-semibold">{playlist.name}</p>
              <p className="text-sm text-gray-400">
                {playlist.tracks.total} tracks
                {playlist.collaborative && ' • Collaborative'}
                {playlist.public && ' • Public'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaylistList;