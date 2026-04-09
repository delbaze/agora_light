// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      // Comment extraire le token de la requête
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Ne pas accepter les tokens expirés
      ignoreExpiration: false,
      // Le secret pour vérifier la signature
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // validate() est appelée après vérification de la signature
  // Elle reçoit le payload décodé et retourne ce qui sera disponible
  // via @Request() req.user dans les contrôleurs
  async validate(payload: { sub: number; email: string }) {
    console.log('EMAIL', payload.email);
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user; // disponible via req.user
  }
}
