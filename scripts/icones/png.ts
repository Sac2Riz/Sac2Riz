// Encodeur PNG minimal, sans dépendance : image RGBA 8 bits, compressée avec zlib (intégré à Node).
// Structure d'un PNG : signature, puis des « blocs » (chunks) IHDR (dimensions), IDAT (pixels
// compressés), IEND (fin). Chaque bloc = longueur, type, données, CRC32 (somme de contrôle).
import { crc32, deflateSync } from 'node:zlib';

export const SIGNATURE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function bloc(type: string, donnees: Buffer): Buffer {
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(donnees.length);
  const typeEtDonnees = Buffer.concat([Buffer.from(type, 'ascii'), donnees]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeEtDonnees));
  return Buffer.concat([longueur, typeEtDonnees, crc]);
}

/** Encode une image en PNG. pixels : largeur × hauteur × 4 octets (R, V, B, opacité), ligne par ligne. */
export function encoderPng(largeur: number, hauteur: number, pixels: Uint8Array): Buffer {
  if (pixels.length !== largeur * hauteur * 4) {
    throw new Error(`Taille des pixels incohérente : ${pixels.length} pour ${largeur}×${hauteur}`);
  }
  const entete = Buffer.alloc(13);
  entete.writeUInt32BE(largeur, 0);
  entete.writeUInt32BE(hauteur, 4);
  entete[8] = 8; // 8 bits par composante
  entete[9] = 6; // couleur RGBA
  entete[10] = 0; // compression (seule valeur possible)
  entete[11] = 0; // filtrage (seule valeur possible)
  entete[12] = 0; // pas d'entrelacement
  // Chaque ligne commence par un octet de filtre (0 = aucun)
  const largeurLigne = 1 + largeur * 4;
  const brut = Buffer.alloc(hauteur * largeurLigne);
  for (let y = 0; y < hauteur; y++) {
    brut.set(pixels.subarray(y * largeur * 4, (y + 1) * largeur * 4), y * largeurLigne + 1);
  }
  return Buffer.concat([
    SIGNATURE_PNG,
    bloc('IHDR', entete),
    bloc('IDAT', deflateSync(brut, { level: 9 })),
    bloc('IEND', Buffer.alloc(0)),
  ]);
}
