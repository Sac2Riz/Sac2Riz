// Noms des icônes de l'interface. Chaque icône est un fichier SVG dessiné, propre à chaque style :
// public/design/<style>/icones/<nom>.svg. Le code ne pose qu'un nom (attribut data-icone) ; le CSS
// du style choisit le dessin (src/styles/icones.css et src/styles/visuels/<id>.css). Code pur (aucun DOM) : vérifié par les tests.

export const NOMS_ICONES = [
  'retour',
  'reglages',
  'statistiques',
  'mise-a-jour',
  'pause',
  'reprendre',
  'notes',
  'effacer',
  'annuler',
  'retablir',
  'indice',
] as const;

export type NomIcone = (typeof NOMS_ICONES)[number];
