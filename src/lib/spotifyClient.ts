import { AuthTokens, SpotifyUser, SpotifyPlaylist, SpotifyTrack, SpotifySearchResult } from './spotifyTypes';
import { StorageService } from './storage';

class SpotifyClient {
  private baseUrl = 'https://api.spotify.com/v1';
  private authUrl = 'https://accounts.spotify.com';

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const auth = await StorageService.getAuth();
    if (!auth) throw new Error('Not authenticated');

    // Check token expiry
    if (auth.expires_at && auth.expires_at < Date.now()) {
      await this.refreshToken();
      const newAuth = await StorageService.getAuth();
      if (!newAuth) throw new Error('Failed to refresh token');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${auth.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Try to refresh token and retry
      await this.refreshToken();
      const newAuth = await StorageService.getAuth();
      if (!newAuth) throw new Error('Authentication failed');
      
      const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${newAuth.access_token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!retryResponse.ok) {
        throw new Error(`Spotify API error: ${retryResponse.status}`);
      }
      return retryResponse.json();
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '1';
      await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
      return this.request<T>(endpoint, options);
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async refreshToken(): Promise<void> {
    const auth = await StorageService.getAuth();
    if (!auth?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const clientId = '5ad20337206042a8900f33cea453714a';

    const response = await fetch(`${this.authUrl}/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: auth.refresh_token,
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokens: AuthTokens = await response.json();
    await StorageService.setAuth({
      ...tokens,
      refresh_token: tokens.refresh_token || auth.refresh_token,
    });
  }

  // User endpoints
  async getCurrentUser(): Promise<SpotifyUser> {
    return this.request<SpotifyUser>('/me');
  }

  // Playlist endpoints
  async getUserPlaylists(limit = 50, offset = 0): Promise<{ items: SpotifyPlaylist[]; total: number }> {
    return this.request(`/me/playlists?limit=${limit}&offset=${offset}`);
  }

  async getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
    return this.request(`/playlists/${playlistId}`);
  }

  async getPlaylistTracks(
    playlistId: string,
    limit = 100,
    offset = 0
  ): Promise<{ items: { track: SpotifyTrack }[]; total: number; next: string | null }> {
    return this.request(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);
  }

  async createPlaylist(
    userId: string,
    name: string,
    description: string,
    isPublic: boolean
  ): Promise<SpotifyPlaylist> {
    return this.request(`/users/${userId}/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        public: isPublic,
      }),
    });
  }

  async addTracksToPlaylist(
    playlistId: string,
    uris: string[]
  ): Promise<{ snapshot_id: string }> {
    const batches = [];
    for (let i = 0; i < uris.length; i += 100) {
      batches.push(uris.slice(i, i + 100));
    }

    let result = { snapshot_id: '' };
    for (const batch of batches) {
      result = await this.request(`/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ uris: batch }),
      });
      // Small delay between batches to avoid rate limiting
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    return result;
  }

  async removeTracksFromPlaylist(
    playlistId: string,
    uris: string[]
  ): Promise<{ snapshot_id: string }> {
    const tracks = uris.map(uri => ({ uri }));
    const batches = [];
    for (let i = 0; i < tracks.length; i += 100) {
      batches.push(tracks.slice(i, i + 100));
    }

    let result = { snapshot_id: '' };
    for (const batch of batches) {
      result = await this.request(`/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        body: JSON.stringify({ tracks: batch }),
      });
      // Small delay between batches to avoid rate limiting
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    return result;
  }

  async reorderPlaylistTracks(
    playlistId: string,
    rangeStart: number,
    insertBefore: number,
    rangeLength = 1
  ): Promise<{ snapshot_id: string }> {
    return this.request(`/playlists/${playlistId}/tracks`, {
      method: 'PUT',
      body: JSON.stringify({
        range_start: rangeStart,
        insert_before: insertBefore,
        range_length: rangeLength,
      }),
    });
  }

  async searchTracks(query: string, limit = 50): Promise<SpotifySearchResult> {
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: limit.toString(),
    });
    return this.request(`/search?${params}`);
  }
}

export const spotifyClient = new SpotifyClient();