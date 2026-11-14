// ÉCRAN DES STATISTIQUES : pour chaque jeu, un tableau par niveau (parties terminées,
// abandonnées, meilleur temps, temps moyen, force moyenne). Ouvert depuis l'accueil (tous les jeux)
// ou depuis la fiche d'un jeu (ce jeu seul) ; le bouton « ← » ou le bouton retour d'Android ramènent
// à l'écran d'où il a été ouvert (géré par app.ts).

import type { MetaJeu } from '../types/jeu.ts';
import type { StatsJeu } from '../types/sauvegarde.ts';
import { boutonIcone, creer } from './dom.ts';
import { lignesStats, type LigneStats } from './stats.ts';

export type StatsAffichees = { readonly meta: MetaJeu; readonly stats: StatsJeu };

const COLONNES: readonly { readonly cle: keyof LigneStats; readonly titre: string }[] = [
  { cle: 'niveau', titre: 'Niveau' },
  { cle: 'terminees', titre: 'Terminées' },
  { cle: 'abandonnees', titre: 'Abandonnées' },
  { cle: 'meilleurTemps', titre: 'Meilleur temps' },
  { cle: 'tempsMoyen', titre: 'Temps moyen' },
  { cle: 'forceMoyenne', titre: 'Force moyenne' },
];

function tableau({ meta, stats }: StatsAffichees): HTMLElement {
  const section = creer('section', 'carte-jeu stats-jeu');
  const titre = creer('h2', 'carte-jeu-nom', meta.nom);
  titre.id = `stats-${meta.id}`;
  section.setAttribute('aria-labelledby', titre.id);

  const table = creer('table', 'stats-table');
  const entete = creer('tr', '');
  for (const { titre: t } of COLONNES) {
    const th = creer('th', '', t);
    th.scope = 'col';
    entete.append(th);
  }
  table.createTHead().append(entete);
  const corps = table.createTBody();
  for (const ligne of lignesStats(stats, meta.niveaux)) {
    const tr = creer('tr', '');
    for (const { cle } of COLONNES) {
      if (cle === 'niveau') {
        const th = creer('th', '', ligne[cle]);
        th.scope = 'row';
        tr.append(th);
      } else {
        tr.append(creer('td', '', ligne[cle]));
      }
    }
    corps.append(tr);
  }
  // Le tableau défile horizontalement sur un écran étroit, sans élargir la page
  const defilement = creer('div', 'stats-defilement');
  defilement.append(table);
  section.append(titre, defilement);
  return section;
}

export type OptionsStats = {
  readonly titre: string;
  /** Libellé du bouton « ← » (« Retour à l'accueil », « Retour à la fiche du jeu »). */
  readonly libelleRetour: string;
  readonly retour: () => void;
};

export function afficherStats(conteneur: HTMLElement, jeux: readonly StatsAffichees[], o: OptionsStats): void {
  const ecran = creer('div', 'ecran-stats');
  const barre = creer('header', 'ecran-barre');
  barre.append(boutonIcone('bouton-icone', 'retour', o.libelleRetour, o.retour), creer('h1', 'ecran-titre', o.titre));
  ecran.append(barre, ...jeux.map(tableau));
  ecran.append(
    creer(
      'p',
      'stats-note',
      'Meilleur temps, temps moyen et force moyenne portent sur les parties terminées. ' +
        'Une partie terminée avec des indices compte, mais ne peut pas battre le meilleur temps.',
    ),
  );
  conteneur.replaceChildren(ecran);
}
