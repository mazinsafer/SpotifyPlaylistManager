import { AuthTokens, SpotifyUser } from './spotifyTypes';

const STORAGE_KEYS = {
  AUTH: 'spotify_auth',
  USER: 'spotify_user',
  CODE_VERIFIER: 'spotify_code_verifier',
  STATE: 'spotify_state',
};

export class StorageService {
  static async getAuth(): Promise<AuthTokens | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH);
    return result[STORAGE_KEYS.AUTH] || null;
  }

  static async setAuth(tokens: AuthTokens): Promise<void> {
    const expiresAt = Date.now() + tokens.expires_in * 1000;
    await chrome.storage.local.set({
      [STORAGE_KEYS.AUTH]: { ...tokens, expires_at: expiresAt },
    });
  }

  static async clearAuth(): Promise<void> {
    await chrome.storage.local.remove([STORAGE_KEYS.AUTH, STORAGE_KEYS.USER]);
  }

  static async getUser(): Promise<SpotifyUser | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.USER);
    return result[STORAGE_KEYS.USER] || null;
  }

  static async setUser(user: SpotifyUser): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.USER]: user });
  }

  static async setCodeVerifier(verifier: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.CODE_VERIFIER]: verifier });
  }

  static async getCodeVerifier(): Promise<string | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CODE_VERIFIER);
    return result[STORAGE_KEYS.CODE_VERIFIER] || null;
  }

  static async setState(state: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state });
  }

  static async getState(): Promise<string | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.STATE);
    return result[STORAGE_KEYS.STATE] || null;
  }
}