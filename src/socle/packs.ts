// PACKS : grilles pré-générées embarquées avec un jeu (ex. Expert et Diabolique du sudoku).
// Servies seulement quand la réserve est vide (voir reserve.ts).
//
// Pour chaque jeu et niveau, on mémorise (magasin packsJoues) un ordre mélangé des grilles et
// la position atteinte : une grille déjà servie ne revient pas tant que le pack n'est pas
// épuisé. Pack épuisé → nouvel ordre (cycle suivant), qui ne commence jamais par la dernière
// grille servie. Si la taille du pack change (packs régénérés), un nouvel ordre est tiré.
//
// Le chargement et la conversion des grilles du pack en Puzzle sont fournis par l'appelant
// (fetch + conversion du jeu dans le navigateur à l'étape 3b, lecture de fichier dans les tests).

import type { Alea } from '../types/alea.ts';
import type { Puzzle } from '../types/jeu.ts';
import type { Json } from '../types/json.ts';
import type { Niveau } from '../types/niveaux.ts';
import type { EtatPack } from '../types/sauvegarde.ts';
import { journalConsole, type Journal } from './environnement.ts';
import { cleJeuNiveau, type Stockage } from './stockage/stockage.ts';

/** Grilles du pack d'un jeu pour un niveau, ou null s'il n'y a pas de pack pour ce niveau. */
export type ChargeurPack = (jeu: string, niveau: Niveau) => Promise<readonly Puzzle<Json>[] | null>;

export interface ServicePacks {
  /** Prochaine grille du pack (marquée comme jouée), ou null s'il n'y a pas de pack. */
  tirer(jeu: string, niveau: Niveau): Promise<Puzzle<Json> | null>;
}

export type OptionsPacks = {
  readonly stockage: Stockage;
  readonly charger: ChargeurPack;
  readonly alea: Alea;
  readonly journal: Journal;
};

/** Nouvel ordre mélangé ; si possible, il ne commence pas par « eviter » (dernière grille servie). */
export function nouvelEtatPack(taille: number, eviter: number | null, cycle: number, alea: Alea): EtatPack {
  const ordre = alea.melanger(Array.from({ length: taille }, (_, i) => i));
  const premiere = ordre[0];
  if (taille > 1 && premiere === eviter) {
    // Échange la première grille avec une autre, prise au hasard (tableau local, créé ci-dessus)
    const j = 1 + alea.entier(taille - 1);
    const autre = ordre[j];
    if (autre !== undefined) {
      ordre[0] = autre;
      ordre[j] = premiere;
    }
  }
  return { taille, ordre, position: 0, derniere: eviter, cycle };
}

/** État suivant après avoir servi une grille : renvoie l'indice servi et le nouvel état. Pur. */
export function avancer(
  precedent: EtatPack | null,
  taille: number,
  alea: Alea,
): { readonly indice: number; readonly etat: EtatPack } {
  let etat =
    precedent !== null && precedent.taille === taille ? precedent : nouvelEtatPack(taille, null, 1, alea);
  if (etat.position >= taille) etat = nouvelEtatPack(taille, etat.derniere, etat.cycle + 1, alea);
  const indice = etat.ordre[etat.position];
  if (indice === undefined) throw new Error('État de pack incohérent'); // impossible : position < taille
  return { indice, etat: { ...etat, position: etat.position + 1, derniere: indice } };
}

export function creerServicePacks(options: Partial<OptionsPacks> & Omit<OptionsPacks, 'journal'>): ServicePacks {
  const { stockage, charger, alea, journal }: OptionsPacks = { journal: journalConsole, ...options };
  const packsCharges = new Map<string, Promise<readonly Puzzle<Json>[] | null>>();
  // Un tirage à la fois par jeu/niveau : sinon deux tirages simultanés pourraient lire le même état
  const files = new Map<string, Promise<unknown>>();

  function chargerUneFois(jeu: string, niveau: Niveau): Promise<readonly Puzzle<Json>[] | null> {
    const cle = cleJeuNiveau(jeu, niveau);
    let promesse = packsCharges.get(cle);
    if (promesse === undefined) {
      promesse = charger(jeu, niveau).catch((erreur: unknown) => {
        packsCharges.delete(cle); // on retentera au prochain tirage
        journal(`Pack ${cle} illisible : ${String(erreur)}`);
        return null;
      });
      packsCharges.set(cle, promesse);
    }
    return promesse;
  }

  function enSerie<T>(cle: string, travail: () => Promise<T>): Promise<T> {
    const precedent = files.get(cle) ?? Promise.resolve();
    const suivant = precedent.then(travail, travail);
    files.set(cle, suivant.catch(() => undefined));
    return suivant;
  }

  return {
    async tirer(jeu, niveau) {
      const grilles = await chargerUneFois(jeu, niveau);
      if (grilles === null || grilles.length === 0) return null;
      const cle = cleJeuNiveau(jeu, niveau);
      return enSerie(cle, async () => {
        const { indice, etat } = avancer(await stockage.lire('packsJoues', cle), grilles.length, alea);
        await stockage.ecrire('packsJoues', cle, etat);
        return grilles[indice] ?? null;
      });
    },
  };
}
