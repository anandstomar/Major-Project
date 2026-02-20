/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  // add other variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
