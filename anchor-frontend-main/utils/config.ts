// // src/config.ts
// declare global {
//   interface Window {
//     __APP_CONFIG__: {
//       API_BASE_URL: string;
//       KEYCLOAK_TOKEN_URL: string;
//     };
//   }
// }

// export const AppConfig = window.__APP_CONFIG__ || {
//   API_BASE_URL: "http://92.4.78.222", //"http://localhost:8090/api/v1", 
//   KEYCLOAK_TOKEN_URL: "http://92.4.78.222/auth-server/realms/provenance/protocol/openid-connect/token"
// };


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
  API_BASE_URL: "/api/backend", 
  KEYCLOAK_TOKEN_URL: "/api/auth/realms/provenance/protocol/openid-connect/token"
};