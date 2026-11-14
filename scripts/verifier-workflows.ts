// VÉRIFICATION DES WORKFLOWS GitHub Actions (.github/workflows/*.yml), lancée par « npm run check ».
//
// Pourquoi : un fichier de workflow mal écrit n'est découvert que sur GitHub, après le push (l'Action
// échoue sans démarrer : « Invalid workflow file »). Exemple réel (étape 6a) : un libellé non cité
// contenant « : » (deux-points + espace), que YAML lit comme le début d'une nouvelle clé.
//
// Sans dépendance : un lecteur YAML STRICT, limité à ce que nos workflows utilisent — tables
// (« clé: valeur », « clé: » + bloc indenté), listes (« - … »), valeurs simples (non citées,
// 'citées', "citées"), listes courtes [a, b], textes sur plusieurs lignes (| ou >), commentaires.
// Toute autre construction est REFUSÉE avec un message (jamais acceptée par erreur) : il suffira
// d'étendre ce lecteur le jour où un workflow en aura besoin. Puis la structure attendue par GitHub
// est contrôlée (name, on, jobs ; chaque job : runs-on + steps, ou uses ; chaque étape : uses ou run).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { estLanceDirectement, RACINE } from './chemins.ts';

/** Valeur lue : texte, liste ou table (les nombres et booléens restent du texte : sans importance ici). */
export type ValeurYaml = string | null | readonly ValeurYaml[] | { readonly [cle: string]: ValeurYaml };

export class ErreurYaml extends Error {
  readonly ligne: number;
  constructor(ligne: number, message: string) {
    super(`ligne ${ligne} : ${message}`);
    this.ligne = ligne;
  }
}

type Ligne = { readonly numero: number; readonly retrait: number; readonly texte: string };

const CLE = /^([A-Za-z0-9_][A-Za-z0-9_-]*):(?:\s+(.*))?$/;
/** Caractères qui ne peuvent pas commencer une valeur non citée (indicateurs YAML). */
const INDICATEURS = new Set(['[', ']', '{', '}', '#', '&', '*', '!', '|', '>', "'", '"', '%', '@', '`', ',', '?', ':']);

/** Retire un commentaire « # … » d'une valeur non citée (le # doit suivre une espace). */
function sansCommentaire(texte: string): string {
  const i = texte.search(/\s#/);
  return (i >= 0 ? texte.slice(0, i) : texte).trimEnd();
}

/** Valeur simple sur une ligne : citée, liste courte [a, b], ou non citée (règles strictes). */
function lireScalaire(brut: string, numero: number): ValeurYaml {
  const t = brut.trim();
  if (t.startsWith("'")) {
    const m = /^'((?:[^']|'')*)'\s*(?:#.*)?$/.exec(t);
    if (m === null) throw new ErreurYaml(numero, `valeur entre apostrophes mal fermée : ${t}`);
    return (m[1] ?? '').replace(/''/g, "'");
  }
  if (t.startsWith('"')) {
    const m = /^"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/.exec(t);
    if (m === null) throw new ErreurYaml(numero, `valeur entre guillemets mal fermée : ${t}`);
    return (m[1] ?? '').replace(/\\(.)/g, '$1');
  }
  const valeur = sansCommentaire(t);
  if (valeur.startsWith('[')) {
    if (!valeur.endsWith(']')) throw new ErreurYaml(numero, `liste [ … ] mal fermée : ${valeur}`);
    const interieur = valeur.slice(1, -1).trim();
    if (interieur === '') return [];
    return interieur.split(',').map((e) => {
      const element = e.trim();
      if (element === '' || /[[\]{}:'"#]/.test(element)) {
        throw new ErreurYaml(numero, `élément de liste [ … ] non pris en charge : « ${element} »`);
      }
      return element;
    });
  }
  if (valeur === '' || valeur === '~' || valeur === 'null') return null;
  const premier = valeur[0] ?? '';
  if (INDICATEURS.has(premier)) {
    throw new ErreurYaml(numero, `une valeur non citée ne peut pas commencer par « ${premier} » : la mettre entre guillemets`);
  }
  if (premier === '-' && valeur[1] === ' ') throw new ErreurYaml(numero, `élément de liste inattendu : ${valeur}`);
  if (/:\s/.test(valeur) || valeur.endsWith(':')) {
    throw new ErreurYaml(
      numero,
      `« : » suivi d'une espace dans une valeur non citée (YAML y voit une nouvelle clé) : mettre la valeur entre guillemets — ${valeur}`,
    );
  }
  return valeur;
}

class Lecteur {
  private i = 0;
  private readonly lignes: readonly Ligne[];
  private readonly brutes: readonly string[];

  constructor(texte: string) {
    this.brutes = texte.replace(/\r\n?/g, '\n').split('\n');
    const lignes: Ligne[] = [];
    this.brutes.forEach((brute, n) => {
      const numero = n + 1;
      if (/^\s*\t/.test(brute)) throw new ErreurYaml(numero, 'tabulation dans le retrait (YAML n\'accepte que des espaces)');
      const texteLigne = brute.trimEnd();
      const contenu = texteLigne.trimStart();
      if (contenu === '' || contenu.startsWith('#')) return;
      if (contenu === '---' || contenu.startsWith('%')) throw new ErreurYaml(numero, `construction non prise en charge : ${contenu}`);
      lignes.push({ numero, retrait: texteLigne.length - contenu.length, texte: contenu });
    });
    this.lignes = lignes;
  }

  lire(): ValeurYaml {
    const premiere = this.lignes[0];
    if (premiere === undefined) return null;
    if (premiere.retrait !== 0) throw new ErreurYaml(premiere.numero, 'la première ligne ne doit pas être en retrait');
    const valeur = this.bloc(0);
    const reste = this.lignes[this.i];
    if (reste !== undefined) throw new ErreurYaml(reste.numero, 'retrait inattendu (ligne mal alignée)');
    return valeur;
  }

  private estElementListe(l: Ligne): boolean {
    return l.texte === '-' || l.texte.startsWith('- ');
  }

  private bloc(retrait: number): ValeurYaml {
    const l = this.lignes[this.i];
    if (l === undefined) return null;
    return this.estElementListe(l) ? this.liste(retrait) : this.table(retrait, null);
  }

  /** Table au retrait donné ; « premiere » : contenu d'une ligne « - clé: … » déjà entamée. */
  private table(retrait: number, premiere: Ligne | null): ValeurYaml {
    const table: { [cle: string]: ValeurYaml } = {};
    let ligne: Ligne | undefined = premiere ?? this.lignes[this.i];
    let entamee = premiere !== null;
    while (ligne !== undefined && ligne.retrait === retrait && !this.estElementListe(ligne)) {
      if (!entamee) this.i++;
      entamee = false;
      const m = CLE.exec(ligne.texte);
      if (m === null) throw new ErreurYaml(ligne.numero, `« clé: valeur » attendu (deux-points suivi d'une espace) : ${ligne.texte}`);
      const cle = m[1] ?? '';
      if (Object.hasOwn(table, cle)) throw new ErreurYaml(ligne.numero, `clé en double : ${cle}`);
      table[cle] = this.valeurDe(ligne, retrait, m[2]);
      ligne = this.lignes[this.i];
    }
    if (ligne !== undefined && ligne.retrait > retrait) throw new ErreurYaml(ligne.numero, 'retrait inattendu (ligne mal alignée)');
    return table;
  }

  /** Valeur d'une clé : sur la même ligne, texte sur plusieurs lignes (| >), ou bloc en dessous. */
  private valeurDe(ligne: Ligne, retrait: number, reste: string | undefined): ValeurYaml {
    if (reste !== undefined && sansCommentaire(reste) !== '') {
      if (/^[|>][+-]?\s*(#.*)?$/.test(reste.trim())) return this.texteMultiligne(ligne, retrait);
      return lireScalaire(reste, ligne.numero);
    }
    const suivante = this.lignes[this.i];
    if (suivante === undefined) return null;
    if (suivante.retrait > retrait) return this.bloc(suivante.retrait);
    // « clé: » suivi d'une liste au même retrait (permis par YAML)
    if (suivante.retrait === retrait && this.estElementListe(suivante)) return this.liste(retrait);
    return null;
  }

  /** Lignes plus en retrait que la clé, prises telles quelles. */
  private texteMultiligne(ligne: Ligne, retrait: number): ValeurYaml {
    const morceaux: string[] = [];
    let n = ligne.numero; // numéro (1…) de la ligne de la clé ; les suivantes sont brutes[n], brutes[n+1]…
    for (; n < this.brutes.length; n++) {
      const brute = this.brutes[n] ?? '';
      const contenu = brute.trimStart();
      if (contenu !== '' && brute.length - contenu.length <= retrait) break;
      morceaux.push(contenu);
    }
    while (this.lignes[this.i] !== undefined && (this.lignes[this.i]?.numero ?? 0) <= n) this.i++;
    return morceaux.join('\n').trim();
  }

  private liste(retrait: number): ValeurYaml {
    const liste: ValeurYaml[] = [];
    let ligne = this.lignes[this.i];
    while (ligne !== undefined && ligne.retrait === retrait && this.estElementListe(ligne)) {
      this.i++;
      const contenu = ligne.texte === '-' ? '' : ligne.texte.slice(2);
      const decalage = ligne.texte.length - contenu.trimStart().length;
      const interieur = contenu.trimStart();
      if (interieur === '') {
        const suivante = this.lignes[this.i];
        liste.push(suivante !== undefined && suivante.retrait > retrait ? this.bloc(suivante.retrait) : null);
      } else if (CLE.test(interieur)) {
        // « - clé: … » : table dont la première entrée est sur la ligne du tiret
        liste.push(this.table(retrait + decalage, { numero: ligne.numero, retrait: retrait + decalage, texte: interieur }));
      } else {
        liste.push(lireScalaire(interieur, ligne.numero));
      }
      ligne = this.lignes[this.i];
    }
    if (ligne !== undefined && ligne.retrait > retrait) throw new ErreurYaml(ligne.numero, 'retrait inattendu (ligne mal alignée)');
    return liste;
  }
}

/** Lit un texte YAML (sous-ensemble strict, voir en tête du fichier) ; lève ErreurYaml. */
export function lireYaml(texte: string): ValeurYaml {
  return new Lecteur(texte).lire();
}

type Table = { readonly [cle: string]: ValeurYaml };
const estTable = (v: ValeurYaml | undefined): v is Table => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Erreurs de structure d'un workflow GitHub Actions déjà lu ([] si tout va bien). */
export function erreursStructure(workflow: ValeurYaml): string[] {
  if (!estTable(workflow)) return ['le fichier doit être une table (name, on, jobs…)'];
  const erreurs: string[] = [];
  if (typeof workflow['name'] !== 'string') erreurs.push('« name » manquant');
  if (!('on' in workflow)) erreurs.push('« on » manquant (événements qui lancent le workflow)');
  const jobs = workflow['jobs'];
  if (!estTable(jobs) || Object.keys(jobs).length === 0) return [...erreurs, '« jobs » manquant ou vide'];
  for (const [nom, job] of Object.entries(jobs)) {
    if (!estTable(job)) {
      erreurs.push(`job « ${nom} » : table attendue`);
      continue;
    }
    if (typeof job['uses'] === 'string') continue; // job qui appelle un workflow réutilisable
    if (typeof job['runs-on'] !== 'string') erreurs.push(`job « ${nom} » : « runs-on » manquant`);
    const etapes = job['steps'];
    if (!Array.isArray(etapes) || etapes.length === 0) {
      erreurs.push(`job « ${nom} » : « steps » manquant ou vide`);
      continue;
    }
    etapes.forEach((etape: ValeurYaml, n: number) => {
      const ou = `job « ${nom} », étape ${n + 1}`;
      if (!estTable(etape)) return erreurs.push(`${ou} : table attendue`);
      const uses = typeof etape['uses'] === 'string';
      const run = typeof etape['run'] === 'string';
      if (uses === run) erreurs.push(`${ou} : il faut « uses » OU « run » (un seul des deux)`);
      if ('with' in etape && !estTable(etape['with'])) erreurs.push(`${ou} : « with » doit être une table`);
      return undefined;
    });
  }
  return erreurs;
}

/** Vérifie un fichier de workflow ; renvoie la liste des problèmes ([] si tout va bien). */
export function verifierWorkflow(texte: string): string[] {
  try {
    return erreursStructure(lireYaml(texte));
  } catch (erreur) {
    if (erreur instanceof ErreurYaml) return [erreur.message];
    throw erreur;
  }
}

export const DOSSIER_WORKFLOWS = join(RACINE, '.github', 'workflows');

if (estLanceDirectement(import.meta.url)) {
  const fichiers = readdirSync(DOSSIER_WORKFLOWS).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  let problemes = 0;
  for (const fichier of fichiers) {
    const erreurs = verifierWorkflow(readFileSync(join(DOSSIER_WORKFLOWS, fichier), 'utf8'));
    for (const e of erreurs) console.error(`✗ .github/workflows/${fichier} : ${e}`);
    problemes += erreurs.length;
  }
  if (problemes > 0) {
    console.error(`${problemes} problème(s) dans les workflows GitHub Actions.`);
    process.exitCode = 1;
  } else {
    console.log(`Workflows GitHub Actions : ${fichiers.length} fichier(s) valide(s).`);
  }
}
