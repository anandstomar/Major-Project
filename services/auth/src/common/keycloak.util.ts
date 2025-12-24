import axios from 'axios';

export async function fetchOidcConfig(issuer: string) {
  try {
    const configUrl = issuer.replace(/\/$/, '') + '/.well-known/openid-configuration';
    const res = await axios.get(configUrl, { timeout: 5000 });
    return res.data;
  } catch (err) {
    throw new Error(`failed to fetch OIDC config from ${issuer}: ${String(err)}`);
  }
}

// optional helper for token introspection (Keycloak supports introspection endpoint)
export async function introspectToken(introspectUrl: string, token: string, clientId?: string, clientSecret?: string) {
  const params = new URLSearchParams();
  params.append('token', token);
  const auth = clientId && clientSecret ? { auth: { username: clientId, password: clientSecret } } : {};
  const res = await axios.post(introspectUrl, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    ...auth,
    timeout: 5000
  });
  return res.data;
}
