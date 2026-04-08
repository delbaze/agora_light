// src/users/dto/register-user.dto.ts
import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({ example: 'Alice Dupont', description: 'Nom complet' })
  @IsString()
  @Length(2, 50)
  name: string;

  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'motdepasse123',
    description: 'Minimum 6 caractères',
  })
  @IsString()
  @Length(6, 100)
  password: string;
}
