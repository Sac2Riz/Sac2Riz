// Type des données sérialisables en JSON (sauvegarde IndexedDB, export, messages au worker).
//
// IMPORTANT : pour qu'un type de données soit accepté comme Json, il doit être déclaré
// avec « type X = { … } » et NON « interface X { … } » (une interface n'est pas
// considérée comme compatible avec une signature d'index). Éviter aussi les
// propriétés optionnelles « x?: … » : utiliser « x: T | null ».

export type JsonPrimitif = null | boolean | number | string;

/** Objet JSON : clés texte, valeurs JSON. */
export type JsonObjet = { readonly [cle: string]: Json };

/** Toute valeur JSON valide. */
export type Json = JsonPrimitif | readonly Json[] | JsonObjet;
