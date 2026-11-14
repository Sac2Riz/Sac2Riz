// VERSION DU SCHÉMA DE STOCKAGE ET MIGRATIONS.
//
// Le schéma (la liste des magasins) évolue avec l'appli. Chaque changement = UNE NOUVELLE
// MIGRATION ajoutée à la fin de la liste (jamais modifier une migration déjà publiée : des
// tablettes l'ont déjà appliquée). À l'ouverture, on applique dans l'ordre toutes les migrations
// dont la version dépasse celle de la base existante (0 pour une base neuve).
// IndexedDB fait cela dans l'événement « upgradeneeded » ; le stockage en mémoire aussi, ce qui
// permet de tester les migrations sous Node.

/** Opérations disponibles pendant une migration. */
export interface BaseEnMigration {
  creerMagasin(nom: string): void;
  supprimerMagasin(nom: string): void;
  magasins(): readonly string[];
}

export type Migration = {
  /** Version atteinte après cette migration (1, 2, 3… sans trou). */
  readonly version: number;
  readonly description: string;
  readonly appliquer: (base: BaseEnMigration) => void;
};

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description: 'Création des magasins de l\'étape 3a',
    // Liste écrite en dur (et non NOMS_MAGASINS) : cette migration ne doit plus jamais changer
    appliquer: (base) => {
      for (const nom of ['parties', 'reserve', 'packsJoues', 'stats', 'reglages']) base.creerMagasin(nom);
    },
  },
  {
    version: 2,
    description: 'Magasin « appli » : informations propres à l\'appli (nouveautés déjà vues)',
    appliquer: (base) => base.creerMagasin('appli'),
  },
];

/** Version actuelle du schéma = version de la dernière migration. */
export const VERSION_SCHEMA = MIGRATIONS.at(-1)?.version ?? 0;

/**
 * Applique, dans l'ordre, les migrations postérieures à versionActuelle.
 * Renvoie la version atteinte. Lève une erreur si la liste est mal numérotée.
 */
export function migrer(base: BaseEnMigration, versionActuelle: number, migrations = MIGRATIONS): number {
  migrations.forEach((migration, i) => {
    if (migration.version !== i + 1) throw new Error(`Migration n° ${i + 1} mal numérotée (${migration.version})`);
  });
  let version = versionActuelle;
  for (const migration of migrations) {
    if (migration.version <= versionActuelle) continue;
    migration.appliquer(base);
    version = migration.version;
  }
  return version;
}
