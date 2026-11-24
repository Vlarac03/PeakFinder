# TODO · Peakfinder

Estat (24/11/2026): **v0.1.44 funciona al GT 6** (confirmat per Victor). Seccions de 90°/45°/22,5° segons el zoom, cada una un canvas petit de 466×170 amb els 3 cims més alts (nom, altura, distància), swipe per canviar de secció, punt de brúixola a la vora (verd/vermell, lectura com a molt 1/s), fons negre/blanc, logo = cresta blanca sobre cercle fosc.

## Com es prova (abans de donar cap `.hap`)

1. `node data/test_geo.js`, `node data/test_page.js`, `node data/test_theme.js`.
2. Simulador (`Simulator.exe`, vegeu `data/README.md` i la memòria del projecte): amb `var MOCK` a `index.js`.
3. Build: `hvigorw.js assembleHap` amb el Node de DevEco; `.hap` lite signat a `Downloads\Peakfinder-<versió>\`. Pujar `version.code` a cada build. Desinstal·lar l'app del rellotge i reiniciar-lo abans d'instal·lar-ne una de nova.

## Pendent

- [ ] Provar amb muntanyes a prop (fins ara només al simulador): mida de la silueta i dels noms.
- [ ] Noms girats en vertical sobre els cims (com la captura d'una app de cims amb foto).
- [ ] Límit de distància opcional; ordenar per prominència en lloc d'altura.
- [ ] Seccions que segueixin el rumb del canell automàticament.
- [ ] Triar el millor mètode per saber si un cim queda tapat per un altre (ara només es mira l'angle sobre l'horitzó).

## Decisions

- 24/11/2026: el panorama d'un sol canvas ample i la llista fallaven al GT 6 (petades, tirons). El disseny per seccions (una imatge petita, un dibuix per gest, res que es mogui) és el bo; no tornar al canvas ample ni al desplaçament continu.
- Cims: només OpenStreetMap, sense model de terreny (feia la silueta dentada i pesava).
- Text al canvas: només es veu amb la lletra `HarmonyOS Sans`.
