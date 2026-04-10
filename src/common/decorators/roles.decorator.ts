import { SetMetadata } from '@nestjs/common';

export enum Role {
  User = 'USER',
  Moderator = 'MODERATOR',
  Admin = 'ADMIN',
}

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
// @Roles(Role.Admin), @Role(Role.Moderator), @Role(Role.Admin, Role.Moderator)
