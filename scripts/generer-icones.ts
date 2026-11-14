// Génère les icônes de l'appli dans public/icones/ : « npm run icones ».
// À relancer quand le design de l'icône change (scripts/icones/dessin.ts). Les fichiers produits
// sont commités : le build se contente de les copier.
//  - icone.svg              : favicon et icône vectorielle ;
//  - icone-192.png / -512   : icônes « any » (installation, écran d'accueil) ;
//  - icone-maskable-512.png : icône « maskable » pour Android (découpée selon la forme du lanceur).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOSSIER_PUBLIC, estLanceDirectement } from './chemins.ts';
import { formesIcone, iconeSvg, rendre } from './icones/dessin.ts';
import { encoderPng } from './icones/png.ts';

const PNG: readonly { readonly fichier: string; readonly taille: number; readonly maskable: boolean }[] = [
  { fichier: 'icone-192.png', taille: 192, maskable: false },
  { fichier: 'icone-512.png', taille: 512, maskable: false },
  { fichier: 'icone-maskable-512.png', taille: 512, maskable: true },
];

/** Écrit les icônes dans le dossier ; renvoie les noms des fichiers écrits. */
export function genererIcones(dossier = join(DOSSIER_PUBLIC, 'icones')): readonly string[] {
  mkdirSync(dossier, { recursive: true });
  writeFileSync(join(dossier, 'icone.svg'), iconeSvg());
  for (const { fichier, taille, maskable } of PNG) {
    writeFileSync(join(dossier, fichier), encoderPng(taille, taille, rendre(formesIcone(maskable), taille)));
  }
  return ['icone.svg', ...PNG.map((p) => p.fichier)];
}

if (estLanceDirectement(import.meta.url)) {
  const fichiers = genererIcones();
  console.log(`Icônes écrites dans public/icones/ : ${fichiers.join(', ')}`);
}
