// src/users/dto/update-user.dto.ts
import { IsString, IsOptional, Length, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Alice Dupont', description: 'Nom complet' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  name?: string;

  @ApiPropertyOptional({
    example: 'Développeuse passionnée de NestJS',
    description: 'Biographie courte',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;
}
