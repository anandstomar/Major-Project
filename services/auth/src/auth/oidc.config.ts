export const oidcConfig = {
  issuer: process.env.KEYCLOAK_ISSUER || 'http://92.4.78.222/auth-server/realms/provenance',
  audience: process.env.KEYCLOAK_AUDIENCE || 'provenance-api',
  // you can override JWKS URI explicitly if needed:
  jwksUri: process.env.KEYCLOAK_JWKS_URI || `${process.env.KEYCLOAK_ISSUER || 'http://92.4.78.222/auth-server/realms/provenance'}/protocol/openid-connect/certs`
};
