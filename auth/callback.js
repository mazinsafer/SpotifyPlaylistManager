const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const state = params.get('state');
const error = params.get('error');

// Your extension ID - replace with your actual extension ID
const EXTENSION_ID = 'gcgcnhnpmedbjfboepbiflofebklifhm';

if (error) {
  document.querySelector('h2').textContent = 'Authentication failed';
  document.querySelector('p').textContent = error;
} else if (code && state) {
  // Send the authorization code to the extension
  chrome.runtime.sendMessage(
    EXTENSION_ID,
    {
      type: 'SPOTIFY_AUTH_CALLBACK',
      code: code,
      state: state
    },
    (response) => {
      if (response && response.success) {
        document.querySelector('h2').textContent = 'Authentication successful!';
        document.querySelector('p').textContent = 'You can now close this window.';
        setTimeout(() => window.close(), 1500);
      } else {
        document.querySelector('h2').textContent = 'Authentication failed';
        document.querySelector('p').textContent = 'Please try again.';
      }
    }
  );
} else {
  document.querySelector('h2').textContent = 'Invalid response';
  document.querySelector('p').textContent = 'Missing authorization code.';
}