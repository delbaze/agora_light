import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

type MulterFileNameCallback = (error: Error | null, filename: string) => void;

export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename(
      _req: Request,
      file: Express.Multer.File,
      callback: MulterFileNameCallback,
    ) {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  fileFilter(_req: Request, file: Express.Multer.File, callback) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    //ici on aurait pu ajouter une vérification par magic number
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        new BadRequestException(
          `Type de fichier non autorisé. Types acceptés: ${allowedMimeTypes.join(', ')}`,
        ),
        false,
      );
    } else {
      callback(null, true);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // un maximum 5MB
  },
};
