// DÉMARRAGE SANS CLIGNOTEMENT : pose le style et le thème choisis AVANT le premier affichage.
//
// Chargé par index.html comme script CLASSIQUE bloquant (pas un module : les modules s'exécutent
// après le début de l'affichage). Pour cette raison, c'est l'un des rares fichiers écrits en
// JavaScript et non en TypeScript : tsc produirait un module ES. Il reste minuscule, sans import, et
// son comportement est vérifié par tests/socle/style/demarrage.test.ts (exécuté dans un bac à sable).
//
// Il lit la copie { style, theme } du stockage local (écrite par src/socle/style/affichage.ts ;
// IndexedDB, lu ensuite par l'appli, reste la référence). Sans copie (premier lancement après la
// mise à jour de l'étape 6c), il reprend le style choisi à l'essai (étape 6b) ; sinon Rétro.
// Ne jamais lever d'erreur : au pire, la page garde le style écrit dans index.html (Rétro).
(function () {
  'use strict';
  /** Même liste que STYLES (src/types/style.ts) : un test vérifie qu'elles sont identiques. */
  var STYLES = ['ardoise', 'ascii', 'ascii-generatif', 'bbs-ansi', 'ms-dos', 'retro'];
  var PAR_DEFAUT = 'retro';
  var racine = document.documentElement;
  var style = PAR_DEFAUT;
  var theme = 'systeme';
  try {
    var stockage = window.localStorage;
    var copie = JSON.parse(stockage.getItem('sac2riz-affichage') || 'null');
    if (copie !== null && typeof copie === 'object') {
      if (STYLES.indexOf(copie.style) >= 0) style = copie.style;
      if (copie.theme === 'clair' || copie.theme === 'sombre') theme = copie.theme;
    } else {
      // Ancien sélecteur d'essai : style conservé tel quel, style retiré → Rétro
      var essai = stockage.getItem('sac2riz-direction-essai');
      if (STYLES.indexOf(essai) >= 0) style = essai;
    }
  } catch (e) {
    // Stockage inaccessible ou copie illisible : style par défaut
  }
  racine.setAttribute('data-style', style);
  if (theme === 'systeme') racine.removeAttribute('data-theme');
  else racine.setAttribute('data-theme', theme);
})();
