// node verify.js
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const token = process.env.TOKEN;
const client = jwksClient({ jwksUri: 'http://localhost:8092/realms/provenance/protocol/openid-connect/certs' });
const header = JSON.parse(Buffer.from(token.split('.')[0].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString());
client.getSigningKey(header.kid, (err, key) => {
  if (err) return console.error(err);
  const pubkey = key.getPublicKey();
  try {
    const payload = jwt.verify(token, pubkey, { issuer: 'http://localhost:8092/realms/provenance', algorithms:['RS256'] });
    console.log('valid', payload);
  } catch (e) { console.error('verify error', e.message); }
});
