// src/config.ts
declare global {
  interface Window {
    __APP_CONFIG__: {
      API_BASE_URL: string;
      KEYCLOAK_TOKEN_URL: string;
    };
  }
}

export const AppConfig = window.__APP_CONFIG__ || {
  API_BASE_URL: "http://localhost:8090/api/v1", 
  KEYCLOAK_TOKEN_URL: "http://localhost:8092/realms/provenance/protocol/openid-connect/token"
};