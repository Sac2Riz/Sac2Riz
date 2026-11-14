// Noms des icônes de l'interface (étape 6b). Chaque icône est un fichier SVG dessiné, propre à la
// direction de design : public/design/<direction>/icones/<nom>.svg. Le code ne pose qu'un nom
// (attribut data-icone) ; le CSS de la direction choisit le dessin (src/styles/icones.css et
// src/styles/directions/<id>.css). Code pur (aucun DOM) : vérifié par les tests.

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
