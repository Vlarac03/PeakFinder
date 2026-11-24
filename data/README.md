# Dades de cims

- `build_peaks.py`: descarrega els `natural=peak` de la zona (Pirineus i Catalunya) d'OpenStreetMap, els neteja i els escriu a `peaks.json` i a `entry/.../common/peaks.js` (una cadena `lat,lon,cota,nom` per línia, que al rellotge ocupa molt menys que un array).
- `raw/` i `.cache/` estan al `.gitignore`: les descàrregues brutes no es pugen.

L'app només fa servir aquests cims. El cercle es parteix en seccions centrades en els punts cardinals (4 de 90°, 8 de 45° o 16 de 22,5° segons el zoom) i de cada secció es mostren els 3 cims més alts amb nom, altura i distància. Ja no hi ha model de terreny ni llista.

## Atribució

Les dades són © col·laboradors d'[OpenStreetMap](https://www.openstreetmap.org/copyright), disponibles sota la llicència [ODbL](https://opendatacommons.org/licenses/odbl/). Qualsevol fitxer derivat que es publiqui en aquest repositori ha de mantenir aquesta atribució.

## Proves

- `node data/test_geo.js`: càlcul (distàncies, cims propers, seccions) amb dades reals.
- `node data/test_page.js`: la pàgina de l'app amb sensors, temps, emmagatzematge i canvas falsos (14 proves: arrencada, seccions i swipe, punt de brúixola, zoom, menú, restaurar, errors, etiquetes...). El canvas fals no té `clearRect` i el text només «es veu» amb la lletra `HarmonyOS Sans`, com al GT 6.
- `node data/test_theme.js`: vigila el fons negre/blanc: cap color fix a l'CSS, cada text i contenidor amb color lligat a dades, i cap dada o controlador inexistent a l'HML.
- `data/diag/`: app de diagnòstic (11 proves d'un botó: brúixola, GPS, càlcul, desar, canvas de diverses mides...) per provar què aguanta el rellotge.
