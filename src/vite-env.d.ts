/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID: string
  readonly VITE_REDIRECT_URI_PROD: string
  readonly VITE_REDIRECT_URI_DEV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}