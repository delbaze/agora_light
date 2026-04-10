// src/posts/reconciliation.service.ts — job de nettoyage des fichiers orphelins
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  async reconcileOrphanFiles() {
    this.logger.log('Démarrage de la réconciliation des fichiers orphelins');

    // Lister tous les fichiers sur le disque
    const uploadsDir = join(process.cwd(), 'uploads');
    const filesOnDisk = await readdir(uploadsDir);

    // Lister tous les filenames connus en base
    const attachments = await this.prisma.postAttachment.findMany({
      select: { filename: true },
    });
    const knownFiles = new Set(attachments.map((a) => a.filename));

    // Identifier et supprimer les orphelins
    const orphans = filesOnDisk.filter((file) => !knownFiles.has(file));

    if (orphans.length === 0) {
      this.logger.log('Aucun fichier orphelin détecté');
      return;
    }

    this.logger.warn(`${orphans.length} fichier(s) orphelin(s) détecté(s)`);

    await Promise.allSettled(
      orphans.map(async (file) => {
        await unlink(join(uploadsDir, file));
        this.logger.warn(`Fichier orphelin supprimé : ${file}`);
      }),
    );

    this.logger.log('Réconciliation terminée');
  }
}
