// FENÊTRE DE MISE À JOUR, ouverte par le bouton « Mettre à jour » : explique avant de mettre à jour
// (versions installée et nouvelle, nouveautés, ce qui va se passer, ce qui est conservé, ce qui est
// supprimé) ; « Mettre à jour » lance appliquer() (sauvegarde de la partie, puis redémarrage),
// « Annuler » (ou Échap, ou le bouton retour d'Android) ne change rien.

import { bouton, creer } from '../dom.ts';
import type { InfosMiseAJour } from './infos-mise-a-jour.ts';
import { formaterDateBuild } from './version.ts';
import type { InfosVersion } from '../../types/service-worker.ts';

/** « 14/11/2026 17:30 », ou « inconnue ». */
export function dateVersion(infos: InfosVersion | null): string {
  return infos === null ? 'inconnue' : formaterDateBuild(new Date(infos.date));
}

/** « 14/11/2026 » à partir de « 2026-11-14 ». */
function dateCourte(aaaaMmJj: string): string {
  const [a = '', m = '', j = ''] = aaaaMmJj.split('-');
  return `${j}/${m}/${a}`;
}

function rubrique(titre: string, ...contenu: HTMLElement[]): HTMLElement {
  const section = creer('section', 'maj-rubrique');
  section.append(creer('h3', 'maj-rubrique-titre', titre), ...contenu);
  return section;
}

function contenu(infos: InfosMiseAJour): HTMLElement[] {
  const versions = creer('dl', 'maj-versions');
  for (const [libelle, valeur] of [
    ['Version installée', dateVersion(infos.actuelle)],
    ['Nouvelle version', dateVersion(infos.nouvelle)],
  ] as const) {
    const ligne = creer('div', 'maj-version');
    ligne.append(creer('dt', '', libelle), creer('dd', '', valeur));
    versions.append(ligne);
  }
  const elements: HTMLElement[] = [versions];

  if (infos.nouveautes.length > 0) {
    const groupes = infos.nouveautes.map((g) => {
      const bloc = creer('div', 'maj-groupe');
      const liste = creer('ul', 'maj-liste');
      for (const n of g.nouveautes) liste.append(creer('li', '', n));
      bloc.append(creer('h4', 'maj-groupe-titre', `${g.titre} — ${dateCourte(g.date)}`), liste);
      return bloc;
    });
    elements.push(rubrique('Nouveautés', ...groupes));
  }

  elements.push(
    rubrique(
      'Ce qui va se passer',
      creer('p', 'maj-texte', 'L\'appli redémarre sur la nouvelle version. Votre partie en cours est sauvegardée juste avant : vous la retrouverez telle quelle.'),
    ),
    rubrique('Ce qui est conservé', creer('p', 'maj-texte', 'Vos parties en cours, vos statistiques et vos réglages.')),
    rubrique(
      'Ce qui est supprimé',
      creer('p', 'maj-texte', 'Uniquement les fichiers de l\'ancienne version de l\'appli. Aucune donnée personnelle.'),
    ),
  );
  return elements;
}

/**
 * Ouvre la fenêtre ; les informations s'affichent dès qu'elles sont lues (cache de la nouvelle
 * version). Se résout à la fermeture (Annuler), ou ne se ferme pas si la mise à jour est lancée
 * (l'appli redémarre).
 */
export function ouvrirFenetreMiseAJour(infos: Promise<InfosMiseAJour>, appliquer: () => Promise<void>): Promise<void> {
  const dialogue = creer('dialog', 'dialogue dialogue-maj');
  const corps = creer('div', 'dialogue-contenu');
  const titre = creer('h2', 'dialogue-titre', 'Mettre à jour Sac2Riz ?');
  const zone = creer('div', 'maj-contenu');
  zone.append(creer('p', 'maj-texte', 'Lecture de la nouvelle version…'));
  const etat = creer('p', 'maj-etat');
  etat.setAttribute('role', 'status');
  const annuler = bouton('bouton bouton-secondaire', 'Annuler', () => dialogue.close());
  const valider = bouton('bouton bouton-principal', 'Mettre à jour', () => {
    valider.disabled = true;
    annuler.disabled = true;
    etat.textContent = 'Sauvegarde et redémarrage…';
    appliquer().catch((erreur: unknown) => {
      console.error('Mise à jour impossible :', erreur);
      etat.textContent = 'La mise à jour n\'a pas pu se faire pour le moment. Réessayez plus tard.';
      annuler.disabled = false;
    });
  });
  const boutons = creer('div', 'dialogue-boutons');
  boutons.append(annuler, valider);
  corps.append(titre, zone, etat, boutons);
  dialogue.append(corps);
  document.body.append(dialogue);

  infos
    .then((lues) => zone.replaceChildren(...contenu(lues)))
    .catch((erreur: unknown) => {
      console.error('Informations de mise à jour illisibles :', erreur);
      zone.replaceChildren(...contenu({ actuelle: null, nouvelle: null, nouveautes: [] }));
    });

  return new Promise((resoudre) => {
    dialogue.addEventListener('close', () => {
      dialogue.remove();
      resoudre();
    });
    dialogue.showModal();
    valider.focus({ preventScroll: true });
    dialogue.scrollTop = 0;
  });
}
