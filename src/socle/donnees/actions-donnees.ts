// EXPORT / IMPORT côté interface (DOM) : téléchargement du fichier, lecture du fichier choisi,
// messages et confirmation. L'analyse elle-même est dans import.ts (code pur, testé).

import type { ModuleJeuQuelconque } from '../../types/vue.ts';
import { confirmer, informer } from '../dialogue.ts';
import { creer } from '../dom.ts';
import type { Stockage } from '../stockage/stockage.ts';
import { construireExport, lireDonnees, nomFichierExport, texteExport } from './export.ts';
import { analyserImport, type ResumeImport } from './import.ts';

/** Au-delà, ce n'est sûrement pas une sauvegarde (quelques dizaines de Ko en général). */
const TAILLE_MAX_IMPORT = 10 * 1024 * 1024;

export type ActionsDonnees = {
  readonly exporter: () => Promise<void>;
  readonly importer: (fichier: File) => Promise<void>;
};

export type OptionsActionsDonnees = {
  readonly stockage: Stockage;
  readonly jeux: readonly ModuleJeuQuelconque[];
  /** Après un import réussi : redémarre l'appli pour relire les nouvelles données. */
  readonly redemarrer: () => void;
};

function telecharger(nom: string, texte: string): void {
  const url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
  const lien = creer('a', '');
  lien.href = url;
  lien.download = nom;
  document.body.append(lien);
  lien.click();
  lien.remove();
  // Laisse au navigateur le temps de lire le fichier avant de le libérer
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function decrire(resume: ResumeImport): string {
  const date = new Date(resume.exporteLe).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;
  return (
    `Sauvegarde du ${date} : ${pluriel(resume.parties, 'partie')} en cours, ` +
    `${pluriel(resume.terminees, 'partie')} ${resume.terminees > 1 ? 'terminées' : 'terminée'}. ` +
    'Vos parties en cours, statistiques et réglages actuels seront remplacés par ceux de la sauvegarde.'
  );
}

export function creerActionsDonnees(o: OptionsActionsDonnees): ActionsDonnees {
  return {
    async exporter() {
      try {
        const maintenant = new Date();
        const nom = nomFichierExport(maintenant);
        telecharger(nom, texteExport(construireExport(await lireDonnees(o.stockage), maintenant)));
        await informer('Export', `Le fichier « ${nom} » a été créé (dossier Téléchargements de la tablette).`);
      } catch (erreur) {
        console.error('Export impossible :', erreur);
        await informer('Export impossible', 'Les données n\'ont pas pu être exportées.');
      }
    },

    async importer(fichier) {
      if (fichier.size > TAILLE_MAX_IMPORT) {
        await informer('Import refusé', 'Ce fichier est bien trop gros pour être une sauvegarde Sac2Riz. Rien n\'a été modifié.');
        return;
      }
      let texte: string;
      try {
        texte = await fichier.text();
      } catch {
        await informer('Import refusé', 'Le fichier n\'a pas pu être lu. Rien n\'a été modifié.');
        return;
      }
      const logiques = await Promise.all(o.jeux.map((j) => j.chargerLogique()));
      const analyse = analyserImport(texte, logiques);
      if (!analyse.ok) {
        await informer('Import refusé', `${analyse.message} Rien n'a été modifié.`);
        return;
      }
      if (!(await confirmer('Importer cette sauvegarde ?', decrire(analyse.resume), 'Remplacer mes données'))) return;
      try {
        await o.stockage.remplacerDonnees(analyse.donnees);
      } catch (erreur) {
        console.error('Import impossible :', erreur);
        await informer('Import impossible', 'L\'écriture a échoué : vos données actuelles sont inchangées.');
        return;
      }
      await informer('Sauvegarde importée', 'L\'appli va redémarrer pour charger vos données.', 'Redémarrer');
      o.redemarrer();
    },
  };
}
