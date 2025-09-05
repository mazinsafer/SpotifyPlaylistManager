import React, { useState } from 'react';
import { SpotifyPlaylist, SpotifyTrack } from '../../lib/spotifyTypes';
import { PlaylistUtils } from '../../lib/playlistUtils';
import { spotifyClient } from '../../lib/spotifyClient';

interface DedupeToolProps {
  playlist: SpotifyPlaylist;
  tracks: SpotifyTrack[];
  onComplete: (count: number) => void;
}

const DedupeTool: React.FC<DedupeToolProps> = ({ playlist, tracks, onComplete }) => {
  const [duplicates, setDuplicates] = useState<SpotifyTrack[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [removing, setRemoving] = useState(false);

  const analyzeDuplicates = () => {
    const dupes = PlaylistUtils.findDuplicates(tracks);
    setDuplicates(dupes);
    setAnalyzed(true);
  };

  const removeDuplicates = async () => {
    if (duplicates.length === 0) return;

    try {
      setRemoving(true);
      const uris = duplicates.map(t => t.uri);
      await spotifyClient.removeTracksFromPlaylist(playlist.id, uris);
      onComplete(uris.length);
      setDuplicates([]);
      setAnalyzed(false);
    } catch (error) {
      console.error('Failed to remove duplicates:', error);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div>
      {!analyzed ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">
            Analyze playlist for duplicate tracks
          </p>
          <button onClick={analyzeDuplicates} className="btn-primary">
            Analyze Duplicates
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <h3 className="font-semibold mb-2">
              Found {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''}
            </h3>
            {duplicates.length > 0 && (
              <button 
                onClick={removeDuplicates} 
                disabled={removing}
                className="btn-primary w-full"
              >
                {removing ? 'Removing...' : 'Remove All Duplicates'}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {duplicates.map((track, index) => (
              <div key={`${track.id}-${index}`} className="p-2 bg-gray-800 rounded">
                <p className="font-medium text-sm">{track.name}</p>
                <p className="text-xs text-gray-400">
                  {track.artists.map(a => a.name).join(', ')}
                </p>
              </div>
            ))}
            {duplicates.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                No duplicates found in this playlist!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DedupeTool;