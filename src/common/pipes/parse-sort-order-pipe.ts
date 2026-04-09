import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseSortOrderPipe implements PipeTransform<
  string,
  'asc' | 'desc'
> {
  transform(value: string): 'asc' | 'desc' {
    if (value !== 'asc' && value !== 'desc') {
      throw new BadRequestException(
        `La valeur de tri doit être 'asc' ou 'desc', reçu ${value}`,
      );
    }
    return value;
  }
}
