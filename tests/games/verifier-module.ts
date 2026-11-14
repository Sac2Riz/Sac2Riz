// Vérifications communes à TOUS les modules de jeu (registre et modèle).
// Utilisé par registre.test.ts : chaque jeu ajouté au registre est contrôlé automatiquement.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { LogiqueJeu } from '../../src/types/jeu.ts';
import type { Json } from '../../src/types/json.ts';
import { NIVEAUX, type Niveau } from '../../src/types/niveaux.ts';
import { OUTILS_MASQUABLES, type ModuleJeuQuelconque, type VueJeu } from '../../src/types/vue.ts';
import { BUDGET_PAR_DEFAUT_MS } from '../../src/socle/client-worker.ts';
import { BUDGET_MAX_MS } from '../../src/types/worker.ts';
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
  // Un niveau à réglage de génération particulier (servi par pack, budget de fond long) est long
  // à générer : il est contrôlé par le test long du jeu (npm run test:long), pas ici
  verifierLogique(logique, niveauxRapides(logique));

  // Configuration de la vue (le module se charge sous Node : aucun accès au DOM à l'import)
  verifierConfigVue(await jeu.chargerVue(), logique);

  // Le niveau doit faire partie des 6 niveaux communs
  for (const niveau of jeu.meta.niveaux) assert.ok(NIVEAUX.includes(niveau));
}

/** Niveaux sans réglage dans meta.generation (génération rapide, par défaut). */
export function niveauxRapides(logique: LogiqueJeu<Json, Json, Json>): Niveau[] {
  return logique.meta.niveaux.filter((n) => logique.meta.generation[n] === undefined);
}

/** Configuration de la vue : outils masqués connus et sans doublon, pavé cohérent avec restants. */
export function verifierConfigVue(vue: VueJeu<Json, Json, Json>, logique: LogiqueJeu<Json, Json, Json>): void {
  const masques = vue.outilsMasques;
  assert.equal(new Set(masques).size, masques.length, 'outil masqué en double');
  for (const o of masques) assert.ok(OUTILS_MASQUABLES.includes(o), `outil inconnu : ${o}`);
  assert.equal(typeof vue.monter, 'function');

  const r = logique.generer(logique.meta.niveaux[0] ?? 'debutant', creerAlea(7), { doitArreter: () => false });
  assert.ok(r.ok);
  const restants = vue.restants(logique.etatInitial(r.donnees), r.donnees);
  if (vue.pave.type === 'commun') {
    assert.ok(vue.pave.valeurs.length > 0, 'pavé commun vide');
    assert.equal(new Set(vue.pave.valeurs).size, vue.pave.valeurs.length, 'valeur du pavé en double');
    if (restants !== null) {
      for (const v of Object.keys(restants)) assert.ok(vue.pave.valeurs.includes(v), `restants : valeur hors pavé ${v}`);
    }
  } else {
    assert.equal(restants, null, 'pavé personnalisé : restants doit renvoyer null');
  }
}

/**
 * Vérifications de la partie LOGIQUE seule (un jeu dont la vue n'existe pas encore peut déjà
 * être contrôlé) : génération reproductible de chaque niveau, notation, aller-retour JSON, partie
 * complète jouée par les indices sans mutation, gardes de type.
 * « niveaux » : niveaux contrôlés (tous par défaut). Un jeu dont certains niveaux sont longs à
 * générer ne contrôle que les niveaux rapides dans npm test et les autres dans npm run test:long.
 */
export function verifierLogique(
  logique: LogiqueJeu<Json, Json, Json>,
  niveaux: readonly Niveau[] = logique.meta.niveaux,
): void {
  // Réglages de génération : niveaux proposés par le jeu, budget de fond au moins égal au budget urgent
  for (const [niveau, reglage] of Object.entries(logique.meta.generation)) {
    assert.ok(logique.meta.niveaux.some((n) => n === niveau), `réglage de génération pour un niveau absent : ${niveau}`);
    if (reglage.mode === 'worker') {
      assert.ok(Number.isInteger(reglage.budgetFondMs), 'budget de fond entier');
      assert.ok(reglage.budgetFondMs >= BUDGET_PAR_DEFAUT_MS && reglage.budgetFondMs <= BUDGET_MAX_MS, 'budget de fond hors limites');
    }
  }

  for (const niveau of niveaux) {
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
      const indice = logique.indice(etat, donnees, { retraitAutoNotes: true });
      assert.ok(indice !== null, 'un indice doit exister tant que la grille n\'est pas finie');
      assert.ok(logique.estAction(indice.action));
      assert.ok(indice.titre.length > 0 && indice.explication.length > 0 && indice.libelleAction.length > 0);
      const avant = geler(etat);
      etat = logique.appliquer(avant, indice.action, donnees); // lèverait une erreur si mutation
    }
    assert.ok(logique.estTerminee(etat, donnees));
    assert.deepEqual(logique.erreurs(etat, donnees), []);

    // Nom affiché de la technique la plus difficile (écran de fin)
    assert.ok(logique.nomTechnique(r1.notation.techniqueMax).length > 0);
  }

  // Les gardes rejettent des valeurs absurdes
  for (const intrus of [null, 42, 'texte', [], {}] satisfies Json[]) {
    assert.equal(logique.estDonnees(intrus), false);
    assert.equal(logique.estEtat(intrus), false);
    assert.equal(logique.estAction(intrus), false);
  }
}
