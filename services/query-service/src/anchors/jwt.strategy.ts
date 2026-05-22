// query-service/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        //jwksUri: 'http://80.225.242.139/auth-server/realms/provenance/protocol/openid-connect/certs',
        jwksUri: 'http://keycloak:80/realms/provenance/protocol/openid-connect/certs',
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: 'http://80.225.242.139/auth-server/realms/provenance',
    });
  }

  async validate(payload: any) {
    // This payload is automatically injected into the request as `req.user`
    return payload; 
  }
}