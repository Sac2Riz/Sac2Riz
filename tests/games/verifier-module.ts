// Vérifications communes à TOUS les modules de jeu (registre et modèle).
// Utilisé par registre.test.ts : chaque jeu ajouté au registre est contrôlé automatiquement.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Json } from '../../src/types/json.ts';
import { NIVEAUX } from '../../src/types/niveaux.ts';
import type { ModuleJeuQuelconque } from '../../src/types/vue.ts';
import { creerAlea } from '../../src/utils/alea.ts';

/** Chemin d'un fichier du dossier src/games/<dossier>/. */
function cheminJeu(dossier: string, fichier: string): string {
  return fileURLToPath(new URL(`../../src/games/${dossier}/${fichier}`, import.meta.url));
}

/** Copie profonde gelée : toute tentative de mutation lèvera une erreur (mode strict). */
function geler<T extends Json>(valeur: T): T {
  const copie: T = structuredClone(valeur);
  const gelerProfond = (v: Json): void => {
    if (typeof v === 'object' && v !== null) {
      Object.freeze(v);
      for (const enfant of Object.values(v)) gelerProfond(enfant);
    }
  };
  gelerProfond(copie);
  return copie;
}

export async function verifierModule(dossier: string, jeu: ModuleJeuQuelconque): Promise<void> {
  // Structure du dossier
  assert.equal(jeu.meta.id, dossier, 'meta.id doit être identique au nom du dossier');
  for (const fichier of ['meta.ts', 'logique.ts', 'vue.ts', 'index.ts']) {
    assert.ok(existsSync(cheminJeu(dossier, fichier)), `fichier manquant : ${fichier}`);
  }
  assert.ok(jeu.meta.niveaux.length > 0, 'au moins un niveau');
  assert.ok(Number.isInteger(jeu.meta.versionFormat) && jeu.meta.versionFormat >= 1);

  const logique = await jeu.chargerLogique();
  assert.equal(logique.meta, jeu.meta, 'logique.meta doit être l\'objet META du jeu');

  for (const niveau of jeu.meta.niveaux) {
    // Génération reproductible
    const sansLimite = { doitArreter: () => false };
    const r1 = logique.generer(niveau, creerAlea(99), sansLimite);
    const r2 = logique.generer(niveau, creerAlea(99), sansLimite);
    assert.ok(r1.ok, `génération ${niveau} échouée`);
    assert.deepEqual(r1, r2, 'même graine → même grille');

    // Données valides, notation cohérente avec le niveau demandé
    const donnees = r1.donnees;
    assert.ok(logique.estDonnees(donnees));
    assert.equal(r1.notation.niveau, niveau);
    assert.deepEqual(logique.noter(donnees), r1.notation);

    // Aller-retour JSON (sauvegarde) sans perte
    const relu: Json = JSON.parse(JSON.stringify(donnees));
    assert.ok(logique.estDonnees(relu));

    // État initial valide ; jouer tous les indices doit terminer la grille sans muter l'état
    let etat = logique.etatInitial(donnees);
    assert.ok(logique.estEtat(etat));
    assert.equal(logique.estTerminee(etat, donnees), false);
    for (let coups = 0; coups < 1000 && !logique.estTerminee(etat, donnees); coups++) {
      const indice = logique.indice(etat, donnees);
      assert.ok(indice !== null, 'un indice doit exister tant que la grille n\'est pas finie');
      assert.ok(logique.estAction(indice.action));
      const avant = geler(etat);
      etat = logique.appliquer(avant, indice.action, donnees); // lèverait une erreur si mutation
    }
    assert.ok(logique.estTerminee(etat, donnees));
    assert.deepEqual(logique.erreurs(etat, donnees), []);
  }

  // Les gardes rejettent des valeurs absurdes
  for (const intrus of [null, 42, 'texte', [], {}] satisfies Json[]) {
    assert.equal(logique.estDonnees(intrus), false);
    assert.equal(logique.estEtat(intrus), false);
    assert.equal(logique.estAction(intrus), false);
  }

  // Le niveau doit faire partie des 6 niveaux communs
  for (const niveau of jeu.meta.niveaux) assert.ok(NIVEAUX.includes(niveau));
}
