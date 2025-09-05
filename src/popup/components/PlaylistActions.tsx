import React, { useState, useEffect } from 'react';
import { spotifyClient } from '../../lib/spotifyClient';
import { SpotifyPlaylist, SpotifyTrack } from '../../lib/spotifyTypes';
import { PlaylistUtils } from '../../lib/playlistUtils';
import TrackSearch from './TrackSearch';
import DedupeTool from './DedupeTool';
import MergeTool from './MergeTool';
import LoadingSpinner from './LoadingSpinner';

interface PlaylistActionsProps {
  playlist: SpotifyPlaylist;
  onBack: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
  onRefresh: () => void;
}

const PlaylistActions: React.FC<PlaylistActionsProps> = ({
  playlist,
  onBack,
  onToast,
  onRefresh,
}) => {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tracks' | 'add' | 'dedupe' | 'merge' | 'filter'>('tracks');
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [filterArtist, setFilterArtist] = useState('');
  const [filterAlbum, setFilterAlbum] = useState('');
  const [filterYearMin, setFilterYearMin] = useState('');
  const [filterYearMax, setFilterYearMax] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    loadTracks();
  }, [playlist.id]);

  const loadTracks = async () => {
    try {
      setLoading(true);
      let allTracks: SpotifyTrack[] = [];
      let offset = 0;
      let hasMore = true;
      
      // Load ALL tracks from the playlist
      while (hasMore) {
        const response = await spotifyClient.getPlaylistTracks(playlist.id, 100, offset);
        const trackList = response.items.map(item => item.track).filter(Boolean);
        allTracks = [...allTracks, ...trackList];
        
        offset += 100;
        hasMore = response.items.length === 100 && offset < response.total;
      }
      
      setTracks(allTracks);
    } catch (error) {
      onToast('Failed to load tracks', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = async (sortBy: 'name' | 'artist' | 'album' | 'popularity') => {
    try {
      setIsRemoving(true);
      const sortedTracks = PlaylistUtils.sortTracks(tracks, sortBy);
      const uris = sortedTracks.map(t => t.uri);
      
      // Remove all tracks then add them back in sorted order
      await spotifyClient.removeTracksFromPlaylist(playlist.id, uris);
      await spotifyClient.addTracksToPlaylist(playlist.id, uris);
      
      setTracks(sortedTracks);
      onToast(`Playlist sorted by ${sortBy}`, 'success');
    } catch (error) {
      onToast('Failed to sort playlist', 'error');
      console.error(error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedTracks.size === 0) {
      onToast('No tracks selected', 'error');
      return;
    }

    try {
      setIsRemoving(true);
      const uris = Array.from(selectedTracks);
      await spotifyClient.removeTracksFromPlaylist(playlist.id, uris);
      onToast(`Removed ${uris.length} tracks`, 'success');
      setSelectedTracks(new Set());
      loadTracks();
    } catch (error) {
      onToast('Failed to remove tracks', 'error');
      console.error(error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleFilterAndRemove = async () => {
    const criteria: any = {};
    
    if (filterArtist.trim()) {
      criteria.artistName = filterArtist.trim();
    }
    
    if (filterAlbum.trim()) {
      criteria.albumName = filterAlbum.trim();
    }
    
    if (filterYearMin && filterYearMax) {
      criteria.yearRange = [parseInt(filterYearMin), parseInt(filterYearMax)];
    }
    
    if (Object.keys(criteria).length === 0) {
      onToast('Please enter at least one filter criteria', 'error');
      return;
    }

    const filtered = PlaylistUtils.filterTracksByCriteria(tracks, criteria);
    
    if (filtered.length === 0) {
      onToast('No tracks found matching criteria', 'error');
      return;
    }

    // Show confirmation with track details
    const confirmMessage = `Found ${filtered.length} tracks matching criteria:\n\n` +
      filtered.slice(0, 5).map(t => `• ${t.name} by ${t.artists.map(a => a.name).join(', ')}`).join('\n') +
      (filtered.length > 5 ? `\n... and ${filtered.length - 5} more` : '') +
      '\n\nRemove these tracks?';

    if (confirm(confirmMessage)) {
      try {
        setIsRemoving(true);
        const uris = filtered.map(t => t.uri);
        await spotifyClient.removeTracksFromPlaylist(playlist.id, uris);
        onToast(`Removed ${filtered.length} tracks`, 'success');
        
        // Clear filters after successful removal
        setFilterArtist('');
        setFilterAlbum('');
        setFilterYearMin('');
        setFilterYearMax('');
        
        loadTracks();
      } catch (error) {
        onToast('Failed to remove tracks', 'error');
        console.error(error);
      } finally {
        setIsRemoving(false);
      }
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

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center mb-4 pb-4 border-b border-gray-700">
        <button onClick={onBack} className="mr-3 text-gray-400 hover:text-white">
          ← Back
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-lg">{playlist.name}</h2>
          <p className="text-sm text-gray-400">{tracks.length} tracks</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('tracks')}
          className={`px-3 py-1 rounded whitespace-nowrap ${activeTab === 'tracks' ? 'bg-spotify-green' : 'bg-gray-700'}`}
        >
          Tracks
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-3 py-1 rounded whitespace-nowrap ${activeTab === 'add' ? 'bg-spotify-green' : 'bg-gray-700'}`}
        >
          Add
        </button>
        <button
          onClick={() => setActiveTab('dedupe')}
          className={`px-3 py-1 rounded whitespace-nowrap ${activeTab === 'dedupe' ? 'bg-spotify-green' : 'bg-gray-700'}`}
        >
          Dedupe
        </button>
        <button
          onClick={() => setActiveTab('merge')}
          className={`px-3 py-1 rounded whitespace-nowrap ${activeTab === 'merge' ? 'bg-spotify-green' : 'bg-gray-700'}`}
        >
          Merge
        </button>
        <button
          onClick={() => setActiveTab('filter')}
          className={`px-3 py-1 rounded whitespace-nowrap ${activeTab === 'filter' ? 'bg-spotify-green' : 'bg-gray-700'}`}
        >
          Filter
        </button>
      </div>

      {activeTab === 'tracks' && (
        <div>
          <div className="flex gap-2 mb-3">
            <select
              onChange={(e) => e.target.value && handleSort(e.target.value as any)}
              className="input-field"
              disabled={isRemoving}
            >
              <option value="">Sort by...</option>
              <option value="name">Name</option>
              <option value="artist">Artist</option>
              <option value="album">Album</option>
              <option value="popularity">Popularity</option>
            </select>
            {selectedTracks.size > 0 && (
              <button 
                onClick={handleRemoveSelected} 
                className="btn-secondary"
                disabled={isRemoving}
              >
                Remove {selectedTracks.size} selected
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {tracks.map((track) => (
              <div
                key={`${track.id}-${track.uri}`}
                className="flex items-center p-2 bg-gray-800 rounded hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedTracks.has(track.uri)}
                  onChange={() => toggleTrackSelection(track.uri)}
                  className="mr-3"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{track.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {track.artists.map(a => a.name).join(', ')} • {track.album.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'add' && (
        <TrackSearch
          playlistId={playlist.id}
          onTracksAdded={(count) => {
            onToast(`Added ${count} tracks`, 'success');
            loadTracks();
          }}
        />
      )}

      {activeTab === 'dedupe' && (
        <DedupeTool
          playlist={playlist}
          tracks={tracks}
          onComplete={(count) => {
            onToast(`Removed ${count} duplicates`, 'success');
            loadTracks();
          }}
        />
      )}

      {activeTab === 'merge' && (
        <MergeTool
          currentPlaylist={playlist}
          onComplete={() => {
            onToast('Playlists merged successfully', 'success');
            onRefresh();
          }}
        />
      )}

      {activeTab === 'filter' && (
        <div className="space-y-3">
          <h3 className="font-semibold">Filter & Remove Tracks</h3>
          
          <div>
            <label className="block text-sm mb-1">Artist Name</label>
            <input
              type="text"
              placeholder="e.g., yeat"
              value={filterArtist}
              onChange={(e) => setFilterArtist(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Album Name</label>
            <input
              type="text"
              placeholder="e.g., 2093"
              value={filterAlbum}
              onChange={(e) => setFilterAlbum(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm mb-1">Min Year</label>
              <input
                type="number"
                placeholder="2010"
                value={filterYearMin}
                onChange={(e) => setFilterYearMin(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1">Max Year</label>
              <input
                type="number"
                placeholder="2020"
                value={filterYearMax}
                onChange={(e) => setFilterYearMax(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>

          <button
            onClick={handleFilterAndRemove}
            className="btn-primary w-full"
            disabled={isRemoving}
          >
            {isRemoving ? 'Removing...' : 'Search and Remove Tracks'}
          </button>

          <p className="text-xs text-gray-400">
            Enter one or more criteria to filter tracks. Leave fields empty to skip them.
          </p>
        </div>
      )}
    </div>
  );
};

export default PlaylistActions;