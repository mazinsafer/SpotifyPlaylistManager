import React, { useState, useEffect } from 'react';
import { StorageService } from '../lib/storage';

const Options: React.FC = () => {
  const [clientId, setClientId] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved settings
    chrome.storage.local.get(['spotify_client_id', 'spotify_redirect_uri'], (result) => {
      if (result.spotify_client_id) setClientId(result.spotify_client_id);
      if (result.spotify_redirect_uri) setRedirectUri(result.spotify_redirect_uri);
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set({
      spotify_client_id: clientId,
      spotify_redirect_uri: redirectUri,
    }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const handleLogout = async () => {
    await StorageService.clearAuth();
    alert('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-spotify-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-spotify-green">Spotify Playlist Manager Options</h1>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Spotify App Configuration</h2>
          
          <div className="mb-4">
            <label className="block mb-2">Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="input-field w-full"
              placeholder="Your Spotify App Client ID"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2">Redirect URI</label>
            <input
              type="text"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              className="input-field w-full"
              placeholder="https://your-domain.com/auth/callback.html"
            />
          </div>
          
          <button onClick={handleSave} className="btn-primary">
            Save Settings
          </button>
          
          {saved && <p className="text-green-500 mt-2">Settings saved!</p>}
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          <button onClick={handleLogout} className="btn-secondary">
            Logout from Spotify
          </button>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" className="text-spotify-green hover:underline">Spotify Developer Dashboard</a></li>
            <li>Create a new app or select an existing one</li>
            <li>Copy your Client ID from the app settings</li>
            <li>Add your redirect URI to the app's redirect URIs list</li>
            <li>For production: Use HTTPS URL like https://your-domain.com/auth/callback.html</li>
            <li>For development: Use http://127.0.0.1:5173/callback</li>
            <li>Save the settings above</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Options;