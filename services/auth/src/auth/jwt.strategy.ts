// src/auth/jwt.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(JwtStrategy, 'jwt') {
  private readonly logger = new Logger(JwtAuthStrategy.name);

  constructor(private readonly config: ConfigService) {
    // const keycloakUrl = 'http://92.4.78.222/auth-server';
    // const realm = 'provenance';
    const issuer = 'http://92.4.78.222/auth-server/realms/provenance';
    const jwksUri = "http://92.4.78.222/auth-server/realms/provenance/protocol/openid-connect/certs";
    // audience: optional. If you see audience problems, leave undefined or set to the token's aud/azp
   // const audience = config.get<string>('KEYCLOAK_AUDIENCE') || undefined;

   console.log(`Initialising JWT Strategy with JWKS URI: ${jwksUri}`);

    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // ask jwks-rsa for the key dynamically
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
      issuer,
      // audience,
      algorithms: ['RS256'],
    };

    super(opts);
  }

  async validate(payload: any) {
    // payload is the decoded token (signature/iss/aud already validated)
    this.logger.debug(`jwt payload: ${JSON.stringify({ sub: payload.sub, azp: payload.azp, realm_access: payload.realm_access })}`);
    // Normalize roles for RolesGuard later
    const roles: string[] = payload.realm_access?.roles ?? [];
    const clientRoles = payload.resource_access ? Object.values(payload.resource_access).flatMap((r:any) => r.roles ?? []) : [];
    const mergedRoles = Array.from(new Set([...roles, ...clientRoles]));
    return { sub: payload.sub, preferred_username: payload.preferred_username, roles: mergedRoles, raw: payload };
  }
}
