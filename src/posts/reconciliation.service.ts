// src/posts/reconciliation.service.ts — job de nettoyage des fichiers orphelins
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, Interval, Timeout, CronExpression } from '@nestjs/schedule';
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class ReconciliationService implements OnModuleInit {
  private readonly logger = new Logger(ReconciliationService.name);

  async onModuleInit() {
    await this.reconcileOrphanFiles();
  }
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_SECONDS) // quand on utilise une expression toute faite
  //   @Interval(60000) // toutes les 60 secondes
  //   @Timeout(5000) // 5 secondes après le démarrage
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
