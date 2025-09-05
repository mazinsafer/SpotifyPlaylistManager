import React, { useState, useEffect } from 'react';
import { StorageService } from '../lib/storage';
import { SpotifyUser } from '../lib/spotifyTypes';
import AuthGate from './components/AuthGate';
import PlaylistList from './components/PlaylistList';
import Toast from './components/Toast';

function App() {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const auth = await StorageService.getAuth();
      const savedUser = await StorageService.getUser();
      
      if (auth && savedUser) {
        setUser(savedUser);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    chrome.runtime.sendMessage({ type: 'START_AUTH' });
    
    // Listen for auth completion
    const listener = async () => {
      const newUser = await StorageService.getUser();
      if (newUser) {
        setUser(newUser);
        chrome.storage.onChanged.removeListener(listener);
      }
    };
    chrome.storage.onChanged.addListener(listener);
  };

  const handleLogout = async () => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' });
    setUser(null);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-w-[400px] min-h-[500px] p-8 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-w-[400px] min-h-[500px] max-h-[600px] bg-spotify-black">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      {!user ? (
        <AuthGate onLogin={handleLogin} />
      ) : (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              {user.images?.[0] && (
                <img 
                  src={user.images[0].url} 
                  alt={user.display_name} 
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-semibold">{user.display_name || user.id}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
          
          <PlaylistList onToast={showToast} />
        </div>
      )}
    </div>
  );
}

export default App;