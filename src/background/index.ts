import { StorageService } from '../lib/storage';

// PKCE helper functions
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Message handlers
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'START_AUTH') {
    handleAuth();
    sendResponse({ success: true });
  } else if (request.type === 'LOGOUT') {
    handleLogout();
    sendResponse({ success: true });
  } else if (request.type === 'EXCHANGE_CODE') {
    handleCodeExchange(request.code, request.state)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  return false;
});

async function handleAuth() {
  // Hardcode these values for now since import.meta.env doesn't work in service workers
  const clientId = '5ad20337206042a8900f33cea453714a'; // Your Client ID
  const redirectUri = 'https://mazinsafer.github.io/spotify-extension-callback/callback.html'; // YOUR GitHub Pages URL

  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(16);

  await StorageService.setCodeVerifier(codeVerifier);
  await StorageService.setState(state);

  const scopes = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-email',
  ].join(' ');

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('state', state);

  chrome.tabs.create({ url: authUrl.toString() });
}

async function handleCodeExchange(code: string, state: string) {
  const savedState = await StorageService.getState();
  if (state !== savedState) {
    throw new Error('State mismatch - potential CSRF attack');
  }

  const codeVerifier = await StorageService.getCodeVerifier();
  if (!codeVerifier) {
    throw new Error('No code verifier found');
  }

  // Hardcode these values for now
  const clientId = '5ad20337206042a8900f33cea453714a'; // Replace with your actual Client ID
  const redirectUri = 'https://mazinsafer.github.io/spotify-extension-callback/callback.html'; // For development

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const tokens = await response.json();
  await StorageService.setAuth(tokens);
  
  // Fetch user info
  const userResponse = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
    },
  });

  if (userResponse.ok) {
    const user = await userResponse.json();
    await StorageService.setUser(user);
  }
}

async function handleLogout() {
  await StorageService.clearAuth();
}

// Handle external messages from redirect page
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.type === 'SPOTIFY_AUTH_CALLBACK') {
    handleCodeExchange(request.code, request.state)
      .then(() => {
        sendResponse({ success: true });
        // Close the auth tab
        if (sender.tab?.id) {
          chrome.tabs.remove(sender.tab.id);
        }
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});