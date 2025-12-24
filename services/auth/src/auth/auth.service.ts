import { Injectable } from '@nestjs/common';

// Minimal service -- expand if you want to query Keycloak userinfo / groups etc
@Injectable()
export class AuthService {
  async whoAmI(user: any) {
    // the JwtStrategy has already populated a lightweight user object
    return {
      id: user?.sub,
      email: user?.email,
      username: user?.preferred_username,
      roles: user?.roles || []
    };
  }
}
