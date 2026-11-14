// NOUVEAUTÉS pour le joueur, montrées avant une mise à jour de l'appli (code pur).
// Fichier public/nouveautes.json (copié dans dist/ au build et mis en cache avec la version) :
// distinct du CHANGELOG technique, rédigé en français simple, sans détail technique.
// Règle (CLAUDE.md) : toute modification visible pour le joueur ajoute une ligne, dans le même commit.

/** Nouveautés d'une version publiée (un groupe = une mise en ligne qui change quelque chose de visible). */
export type GroupeNouveautes = {
  /** Identifiant unique et définitif (« AAAA-MM-JJ-sujet ») : sert à savoir ce que le joueur a déjà. */
  readonly id: string;
  /** Date de la version, « AAAA-MM-JJ ». */
  readonly date: string;
  /** Titre court (« Une fiche pour chaque jeu »). */
  readonly titre: string;
  /** Une phrase simple par nouveauté. */
  readonly nouveautes: readonly string[];
};

/** Contenu de nouveautes.json : les groupes, DU PLUS RÉCENT AU PLUS ANCIEN. */
export type FichierNouveautes = {
  readonly versions: readonly GroupeNouveautes[];
};

/**
 * Nouveautés déjà vues par le joueur (magasin « appli », clé CLE_NOUVEAUTES_VUES) : identifiants des
 * groupes déjà montrés, ou présents au tout premier lancement. La fenêtre « Sac2Riz a été mis à jour »
 * ne montre que les groupes absents de cette liste.
 */
export type NouveautesVues = {
  readonly vues: readonly string[];
};

/** Garde de type des nouveautés vues (relues du stockage). */
export function estNouveautesVues(v: unknown): v is NouveautesVues {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const vues: unknown = 'vues' in v ? v.vues : undefined;
  return Array.isArray(vues) && vues.every((id) => typeof id === 'string');
}

/** Nom du fichier, à la racine de dist/. */
export const FICHIER_NOUVEAUTES = 'nouveautes.json';

const estTexte = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function estGroupe(v: unknown): v is GroupeNouveautes {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const g: { readonly [cle: string]: unknown } = { ...v };
  const nouveautes = g['nouveautes'];
  return (
    estTexte(g['id']) &&
    typeof g['date'] === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(g['date']) &&
    estTexte(g['titre']) &&
    Array.isArray(nouveautes) &&
    nouveautes.length > 0 &&
    nouveautes.every(estTexte)
  );
}

/** Garde de type du fichier des nouveautés (relu depuis le cache d'une version). */
export function estFichierNouveautes(v: unknown): v is FichierNouveautes {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const versions: unknown = 'versions' in v ? v.versions : undefined;
  return Array.isArray(versions) && versions.every(estGroupe);
}
