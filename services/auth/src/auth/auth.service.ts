import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// Minimal service -- expand if you want to query Keycloak userinfo / groups etc
@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  async whoAmI(user: any) {
    // the JwtStrategy has already populated a lightweight user object
    return {
      id: user?.sub,
      email: user?.email,
      username: user?.preferred_username,
      roles: user?.roles || []
    };
  }



  async registerUser(userData: any) {
    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL') || 'http://92.4.78.222/auth-server';
    const realm = this.config.get<string>('KEYCLOAK_REALM') || 'provenance';

    // 1. Get an Admin Token from the 'master' realm
    let adminToken: string;
    try {
      const tokenParams = new URLSearchParams({
        client_id: 'admin-cli',
        username: process.env.KEYCLOAK_ADMIN_USER || 'admin',
        password: process.env.KEYCLOAK_ADMIN_PASSWORD || 'password', // <-- Ensure this matches your Keycloak admin password!
        grant_type: 'password'
      });

      const tokenResponse = await axios.post(
        `${keycloakUrl}/realms/master/protocol/openid-connect/token`,
        tokenParams,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      adminToken = tokenResponse.data.access_token;
    } catch (error: any) {
      console.error('Failed to get admin token:', error?.response?.data || error.message);
      throw new HttpException('Internal auth config error', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 2. Use the Admin Token to create the user in the 'provenance' realm
    try {
      const kcUser = {
        username: userData.email, // using email as username
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        enabled: true,
        credentials: [
          {
            type: 'password',
            value: userData.password,
            temporary: false
          }
        ]
      };

      await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users`,
        kcUser,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { message: 'User created successfully' };
    } catch (error: any) {
      console.error('Failed to create user:', error?.response?.data || error.message);
      // Pass Keycloak's specific error message back to React (e.g., "User already exists")
      const errorMessage = error?.response?.data?.errorMessage || 'User registration failed';
      throw new HttpException(errorMessage, error?.response?.status || HttpStatus.BAD_REQUEST);
    }
  }
}
