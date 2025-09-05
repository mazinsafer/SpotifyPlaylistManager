import React from 'react';

interface AuthGateProps {
  onLogin: () => void;
}

const AuthGate: React.FC<AuthGateProps> = ({ onLogin }) => {
  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2 text-spotify-green">Spotify Playlist Manager</h1>
        <p className="text-gray-400 mb-8">Manage your playlists with advanced features</p>
        
        <button 
          onClick={onLogin}
          className="btn-primary text-lg px-8 py-3"
        >
          Connect with Spotify
        </button>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>This extension requires access to:</p>
          <ul className="mt-2 space-y-1">
            <li>• Read your playlists</li>
            <li>• Create and modify playlists</li>
            <li>• View your profile</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;