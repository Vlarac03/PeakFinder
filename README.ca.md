# Peakfinder per al Huawei Watch GT 6

[English](README.md) · **Català** · [Español](README.es.md)

Un identificador de cims per al canell: apuntes cap a una muntanya i el rellotge et diu quin cim és, a partir de la posició (GPS) i la brúixola. Pensat per funcionar **offline**, sense mòbil ni cobertura.

> **Estat: v0.1.44, funciona al GT 6.** Mostra els cims més alts que tens al voltant, per seccions. Proves i notes de disseny a [`data/README.md`](data/README.md).

## Idea

1. Llegeix la posició (latitud, longitud, altitud) i el rumb de la brúixola **una sola vegada** i les apaga (la brúixola continua, com a molt un cop per segon, només per al punt de la vora).
2. Carrega els cims propers d'una base de dades compacta inclosa a l'app (una sola cadena de línies `lat,lon,altura,nom`).
3. Parteix el cercle en seccions centrades en els punts cardinals: 4 de 90°, 8 de 45° (NE, SE…) o 16 de 22,5° (NNE, ENE…), segons el zoom.
4. Cada secció és un canvas petit amb els **3 cims més alts** de la secció (nom, altura, distància) i una silueta senzilla. Lliscar canvia de secció.
5. Un punt a la vora de dalt de la pantalla fa de brúixola: verd si mires cap al centre de la secció, vermell a l'esquerra o a la dreta si t'has de girar.

## Maquinari objectiu

Huawei Watch GT 6, pantalla rodona de 466×466, amb GPS de doble banda, magnetòmetre i baròmetre. L'app usa el framework **JS Lite Wearable** de HarmonyOS, el mateix camí que ja funciona amb [PadelCounter](https://github.com/Vlarac03/PadelCounter).

## Zona coberta

Pirineus i Catalunya. La base de dades es genera amb l'script de [`data/`](data/) a partir d'OpenStreetMap.

## Full de ruta

- [x] GPS i brúixola al GT 6 com a app de tercers.
- [x] Base de dades de cims d'OpenStreetMap (`data/build_peaks.py`).
- [x] Seccions amb els 3 cims més alts, swipe, zoom 1x/2x/4x, punt de brúixola a la vora, fons negre/blanc.
- [ ] Noms girats al llarg dels cims (com les apps amb foto).
- [ ] Límit de distància opcional, i ordenar per prominència en lloc d'altura.
- [ ] Seccions que segueixin el rumb del canell automàticament.

## Instal·lació

Quan hi hagi una primera versió, es compilarà i s'instal·larà com PadelCounter, amb DevEco Studio i DevEco Assistant. Els fitxers de signatura (`.p12`, `.p7b`, `.cer`) i l'UDID del rellotge no formen part d'aquest repositori.

## Dades i llicències

- Codi: [MIT](LICENSE).
- Dades de cims: © col·laboradors d'[OpenStreetMap](https://www.openstreetmap.org/copyright), llicència [ODbL](https://opendatacommons.org/licenses/odbl/).

---

Developed by [Vlarac](https://github.com/Vlarac03)
