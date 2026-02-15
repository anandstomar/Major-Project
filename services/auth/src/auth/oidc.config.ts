export const oidcConfig = {
  issuer: process.env.KEYCLOAK_ISSUER || 'http://localhost:8092/realms/provenance',
  audience: process.env.KEYCLOAK_AUDIENCE || 'provenance-api',
  // you can override JWKS URI explicitly if needed:
  jwksUri: process.env.KEYCLOAK_JWKS_URI || `${process.env.KEYCLOAK_ISSUER || 'http://localhost:8092/realms/provenance'}/protocol/openid-connect/certs`
};
