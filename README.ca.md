# Peakfinder per al Huawei Watch GT 6

[English](README.md) · **Català** · [Español](README.es.md)

Un identificador de cims per al canell: apuntes cap a una muntanya i el rellotge et diu quin cim és, a partir de la posició (GPS) i la brúixola. Pensat per funcionar **offline**, sense mòbil ni cobertura.

> **Estat: prototip de prova de sensors (v0.1.0).** Mostra GPS, brúixola i baròmetre; encara no identifica cims. Veure [`docs/prova-sensors.md`](docs/prova-sensors.md) i el [full de ruta](#full-de-ruta).

## Idea

1. Llegir la posició (latitud, longitud, altitud) i el rumb de la brúixola.
2. Carregar els cims propers d'una base de dades compacta empaquetada a l'app.
3. Per a cada cim, calcular distància, azimut i angle d'elevació.
4. Mostrar el cim que queda més a prop del rumb apuntat, amb nom, alçada i distància.

Detalls a [`docs/arquitectura.md`](docs/arquitectura.md).

## Maquinari objectiu

Huawei Watch GT 6, pantalla rodona de 466×466, amb GPS de doble banda, magnetòmetre i baròmetre. L'app usa el framework **JS Lite Wearable** de HarmonyOS, el mateix camí que ja funciona amb [PadelCounter](https://github.com/Vlarac03/PadelCounter).

## Zona coberta

Pirineus i Catalunya. La base de dades es genera amb l'script de [`data/`](data/) a partir d'OpenStreetMap.

## Full de ruta

- [ ] Provar que `@system.geolocation` i `@system.sensor` (brúixola) funcionen al GT 6 com a app de tercers.
- [ ] Mesurar el límit de mida de l'app i de memòria al rellotge.
- [ ] Script que genera el JSON de cims (format compacte).
- [ ] Càlcul d'azimut i elevació, i selecció del cim apuntat.
- [ ] Interfície: brúixola, nom del cim, alçada i distància.
- [ ] Gestió del temps d'ús del GPS i de la bateria.

## Instal·lació

Quan hi hagi una primera versió, es compilarà i s'instal·larà com PadelCounter, amb DevEco Studio i DevEco Assistant. Els fitxers de signatura (`.p12`, `.p7b`, `.cer`) i l'UDID del rellotge no formen part d'aquest repositori.

## Dades i llicències

- Codi: [MIT](LICENSE).
- Dades de cims: © col·laboradors d'[OpenStreetMap](https://www.openstreetmap.org/copyright), llicència [ODbL](https://opendatacommons.org/licenses/odbl/).

---

Developed by [Vlarac](https://github.com/Vlarac03)
