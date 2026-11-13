// Outils communs du bench : statistiques simples et mise en forme des tableaux.

export type Stats = {
  readonly moyenne: number;
  readonly min: number;
  readonly q1: number;
  readonly mediane: number;
  readonly q3: number;
  readonly max: number;
};

/** Valeur au rang p (0 à 1) d'une liste triée. */
function quantile(tries: readonly number[], p: number): number {
  return tries[Math.min(tries.length - 1, Math.floor(p * tries.length))] ?? 0;
}

export function stats(valeurs: readonly number[]): Stats {
  if (valeurs.length === 0) return { moyenne: 0, min: 0, q1: 0, mediane: 0, q3: 0, max: 0 };
  const tries = [...valeurs].sort((a, b) => a - b);
  return {
    moyenne: tries.reduce((s, v) => s + v, 0) / tries.length,
    min: tries[0] ?? 0,
    q1: quantile(tries, 0.25),
    mediane: quantile(tries, 0.5),
    q3: quantile(tries, 0.75),
    max: tries[tries.length - 1] ?? 0,
  };
}

/** Pourcentage arrondi à l'unité, ex. « 42 % ». */
export function pourcent(part: number, total: number): string {
  return total === 0 ? '—' : `${Math.round((100 * part) / total)} %`;
}

/** Affiche un tableau aligné : première colonne à gauche, les autres à droite. */
export function tableau(entetes: readonly string[], lignes: readonly (readonly string[])[]): void {
  const largeurs = entetes.map((e, i) => Math.max(e.length, ...lignes.map((l) => (l[i] ?? '').length)));
  const formater = (cellules: readonly string[]): string =>
    cellules
      .map((c, i) => (i === 0 ? c.padEnd(largeurs[i] ?? 0) : c.padStart(largeurs[i] ?? 0)))
      .join('  ');
  console.log(formater(entetes));
  console.log(largeurs.map((l) => '─'.repeat(l)).join('  '));
  for (const l of lignes) console.log(formater(l));
  console.log('');
}

/** Lit « --n=50 » dans la ligne de commande ; valeur par défaut sinon. */
export function argumentNombre(nom: string, defaut: number): number {
  const prefixe = `--${nom}=`;
  const arg = process.argv.find((a) => a.startsWith(prefixe));
  const valeur = arg === undefined ? NaN : Number(arg.slice(prefixe.length));
  return Number.isInteger(valeur) && valeur > 0 ? valeur : defaut;
}
