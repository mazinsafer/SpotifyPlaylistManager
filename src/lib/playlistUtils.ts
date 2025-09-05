import { SpotifyTrack } from './spotifyTypes';

export interface TrackWithKey extends SpotifyTrack {
  key: string;
}

export class PlaylistUtils {
  static generateTrackKey(track: SpotifyTrack): string {
    const artistName = track.artists[0]?.name || '';
    return `${track.name.toLowerCase()}_${artistName.toLowerCase()}`;
  }

  static findDuplicates(tracks: SpotifyTrack[]): SpotifyTrack[] {
    const seen = new Set<string>();
    const duplicates: SpotifyTrack[] = [];

    for (const track of tracks) {
      const key = this.generateTrackKey(track);
      if (seen.has(key)) {
        duplicates.push(track);
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  static sortTracks(
    tracks: SpotifyTrack[],
    sortBy: 'name' | 'artist' | 'album' | 'popularity' | 'duration'
  ): SpotifyTrack[] {
    return [...tracks].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'artist':
          return (a.artists[0]?.name || '').localeCompare(b.artists[0]?.name || '');
        case 'album':
          return a.album.name.localeCompare(b.album.name);
        case 'popularity':
          return b.popularity - a.popularity;
        case 'duration':
          return a.duration_ms - b.duration_ms;
        default:
          return 0;
      }
    });
  }

  static mergePlaylists(
    playlists: SpotifyTrack[][],
    removeDuplicates = true
  ): SpotifyTrack[] {
    const allTracks = playlists.flat();
    
    if (!removeDuplicates) {
      return allTracks;
    }

    const uniqueTracks = new Map<string, SpotifyTrack>();
    for (const track of allTracks) {
      const key = this.generateTrackKey(track);
      if (!uniqueTracks.has(key)) {
        uniqueTracks.set(key, track);
      }
    }

    return Array.from(uniqueTracks.values());
  }

  static filterTracksByCriteria(
    tracks: SpotifyTrack[],
    criteria: {
      artistName?: string;
      albumName?: string;
      yearRange?: [number, number];
      durationRange?: [number, number]; // in seconds
      popularityRange?: [number, number];
    }
  ): SpotifyTrack[] {
    return tracks.filter(track => {
      if (criteria.artistName) {
        const hasArtist = track.artists.some(
          artist => artist.name.toLowerCase().includes(criteria.artistName!.toLowerCase())
        );
        if (!hasArtist) return false;
      }

      if (criteria.albumName) {
        if (!track.album.name.toLowerCase().includes(criteria.albumName.toLowerCase())) {
          return false;
        }
      }

      if (criteria.yearRange) {
        const year = parseInt(track.album.release_date.substring(0, 4));
        if (year < criteria.yearRange[0] || year > criteria.yearRange[1]) {
          return false;
        }
      }

      if (criteria.durationRange) {
        const durationSec = track.duration_ms / 1000;
        if (durationSec < criteria.durationRange[0] || durationSec > criteria.durationRange[1]) {
          return false;
        }
      }

      if (criteria.popularityRange) {
        if (track.popularity < criteria.popularityRange[0] || track.popularity > criteria.popularityRange[1]) {
          return false;
        }
      }

      return true;
    });
  }
}