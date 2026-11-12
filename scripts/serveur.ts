// Petit serveur HTTP statique (sans dépendance) qui sert dist/ pour tester l'appli.
// Usage : node scripts/serveur.ts [--port 8080] [--reseau]
//   --reseau : accessible depuis les autres appareils du réseau local (ex. la tablette).
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { DOSSIER_DIST, estLanceDirectement } from './chemins.ts';

const TYPES_MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

export interface OptionsServeur {
  readonly port: number;
  readonly reseau: boolean;
}

/** Convertit l'URL demandée en chemin dans dist/, ou null si elle sort de dist/. */
function cheminDepuisUrl(url: string): string | null {
  const chemin = decodeURIComponent(new URL(url, 'http://local').pathname);
  const complet = normalize(join(DOSSIER_DIST, chemin));
  if (complet !== DOSSIER_DIST && !complet.startsWith(DOSSIER_DIST + sep)) return null;
  if (existsSync(complet) && statSync(complet).isDirectory()) return join(complet, 'index.html');
  return complet;
}

export function demarrerServeur(options: OptionsServeur): Server {
  const serveur = createServer((requete, reponse) => {
    const chemin = cheminDepuisUrl(requete.url ?? '/');
    if (chemin === null || !existsSync(chemin) || !statSync(chemin).isFile()) {
      reponse.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      reponse.end('Introuvable');
      return;
    }
    reponse.writeHead(200, {
      'Content-Type': TYPES_MIME[extname(chemin).toLowerCase()] ?? 'application/octet-stream',
      // En développement, on veut toujours la dernière version des fichiers
      'Cache-Control': 'no-store',
    });
    createReadStream(chemin).pipe(reponse);
  });

  const hote = options.reseau ? '0.0.0.0' : '127.0.0.1';
  serveur.listen(options.port, hote, () => {
    console.log(`Serveur prêt : http://localhost:${options.port}/`);
    if (options.reseau) {
      for (const interfaces of Object.values(networkInterfaces())) {
        for (const adresse of interfaces ?? []) {
          if (adresse.family === 'IPv4' && !adresse.internal) {
            console.log(`  sur le réseau local : http://${adresse.address}:${options.port}/`);
          }
        }
      }
    }
  });
  return serveur;
}

/** Lit --port et --reseau dans les arguments de la ligne de commande. */
export function lireOptions(argv: readonly string[]): OptionsServeur {
  const indexPort = argv.indexOf('--port');
  const port = indexPort >= 0 ? Number(argv[indexPort + 1]) : 8080;
  return {
    port: Number.isInteger(port) && port > 0 ? port : 8080,
    reseau: argv.includes('--reseau'),
  };
}

if (estLanceDirectement(import.meta.url)) {
  if (!existsSync(DOSSIER_DIST)) {
    console.error('Le dossier dist/ est absent : lance d\'abord « npm run build ».');
    process.exit(1);
  }
  demarrerServeur(lireOptions(process.argv.slice(2)));
}
