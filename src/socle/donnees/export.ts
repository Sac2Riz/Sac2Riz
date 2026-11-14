// EXPORT DES DONNÉES : réglages, parties en cours, statistiques et avancement dans les packs,
// dans un fichier JSON daté (sac2riz-sauvegarde-AAAA-MM-JJ.json). Sans DOM : le
// téléchargement du fichier est fait par actions-donnees.ts.

import {
  VERSION_EXPORT,
  type DonneesExportees,
  type EtatPack,
  type FichierExport,
  type StatsJeu,
} from '../../types/sauvegarde.ts';
import { completerReglages } from '../reglages.ts';
import { CLE_REGLAGES, type Stockage } from '../stockage/stockage.ts';

/** Lit dans le stockage toutes les données à exporter. */
export async function lireDonnees(stockage: Stockage): Promise<DonneesExportees> {
  const [reglages, parties, stats, packsJoues] = await Promise.all([
    stockage.lire('reglages', CLE_REGLAGES),
    stockage.lister('parties', ''),
    stockage.lister('stats', ''),
    stockage.lister('packsJoues', ''),
  ]);
  const statsParJeu: { [jeu: string]: StatsJeu } = {};
  for (const { cle, valeur } of stats) statsParJeu[cle] = valeur;
  const packs: { [cle: string]: EtatPack } = {};
  for (const { cle, valeur } of packsJoues) packs[cle] = valeur;
  return {
    // Des réglages d'une ancienne version sont exportés complétés (forme actuelle)
    reglages: completerReglages(reglages),
    parties: parties.map((e) => e.valeur),
    stats: statsParJeu,
    packsJoues: packs,
  };
}

export function construireExport(donnees: DonneesExportees, date: Date): FichierExport {
  return { format: 'sac2riz-export', version: VERSION_EXPORT, exporteLe: date.toISOString(), donnees };
}

/** Texte du fichier (JSON indenté : lisible si on l'ouvre). */
export function texteExport(fichier: FichierExport): string {
  return `${JSON.stringify(fichier, null, 2)}\n`;
}

/** « sac2riz-sauvegarde-AAAA-MM-JJ.json », à la date locale (celle de la tablette). */
export function nomFichierExport(date: Date): string {
  const deux = (n: number): string => String(n).padStart(2, '0');
  return `sac2riz-sauvegarde-${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}.json`;
}
