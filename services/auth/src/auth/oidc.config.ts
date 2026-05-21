export const oidcConfig = {
  issuer: process.env.KEYCLOAK_ISSUER || 'http://80.225.242.139/auth-server/realms/provenance',
  audience: process.env.KEYCLOAK_AUDIENCE || 'provenance-api',
  // you can override JWKS URI explicitly if needed:
  KEYCLOAK_JWKS: process.env.KEYCLOAK_JWKS_URI ||  'http://80.225.242.139/auth-server/realms/provenance/protocol/openid-connect/certs',
};
