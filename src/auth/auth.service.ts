// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    // On cherche par email — findOneByEmail retourne l'utilisateur complet avec le mot de passe
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      // Message intentionnellement vague : on ne révèle pas si l'email existe
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Le payload du JWT contient ce qu'on voudra lire plus tard
    // sans aller en base. On y met l'ID et l'email.
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
