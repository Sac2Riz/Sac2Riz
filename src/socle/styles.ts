// Chargement à la demande de la feuille de style d'un jeu (src/games/<id>/style.css).

const dejaChargees = new Set<string>();

/**
 * Ajoute la feuille de style à la page si ce n'est pas déjà fait.
 * Usage dans une vue : chargerFeuilleDeStyle(new URL('./style.css', import.meta.url));
 */
export function chargerFeuilleDeStyle(url: URL): void {
  if (dejaChargees.has(url.href)) return;
  const lien = document.createElement('link');
  lien.rel = 'stylesheet';
  lien.href = url.href;
  document.head.append(lien);
  dejaChargees.add(url.href);
}
