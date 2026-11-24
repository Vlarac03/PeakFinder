# Peakfinder para el Huawei Watch GT 6

[English](README.md) · [Català](README.ca.md) · **Español**

Un identificador de cumbres para la muñeca: apuntas hacia una montaña y el reloj te dice qué cima es, a partir de la posición (GPS) y la brújula. Pensado para funcionar **offline**, sin móvil ni cobertura.

> **Estado: v0.1.44, funciona en el GT 6.** Muestra las cimas más altas que tienes alrededor, por secciones. Pruebas y notas de diseño en [`data/README.md`](data/README.md) (en catalán).

## Idea

1. Lee la posición (latitud, longitud, altitud) y el rumbo de la brújula **una sola vez** y las apaga (la brújula sigue, como mucho una vez por segundo, solo para el punto del borde).
2. Carga las cimas cercanas de una base de datos compacta incluida en la app (una sola cadena de líneas `lat,lon,altura,nombre`).
3. Parte el círculo en secciones centradas en los puntos cardinales: 4 de 90°, 8 de 45° (NE, SE…) o 16 de 22,5° (NNE, ENE…), según el zoom.
4. Cada sección es un canvas pequeño con las **3 cimas más altas** de la sección (nombre, altura, distancia) y una silueta sencilla. Deslizar cambia de sección.
5. Un punto en el borde superior de la pantalla hace de brújula: verde si miras al centro de la sección, rojo a izquierda o derecha si debes girar.

## Hardware objetivo

Huawei Watch GT 6, pantalla redonda de 466×466, con GPS de doble banda, magnetómetro y barómetro. La app usa el framework **JS Lite Wearable** de HarmonyOS, el mismo camino que ya funciona con [PadelCounter](https://github.com/Vlarac03/PadelCounter).

## Zona cubierta

Pirineos y Cataluña. La base de datos se genera con el script de [`data/`](data/) a partir de OpenStreetMap.

## Hoja de ruta

- [x] GPS y brújula en el GT 6 como app de terceros.
- [x] Base de datos de cimas de OpenStreetMap (`data/build_peaks.py`).
- [x] Secciones con las 3 cimas más altas, deslizar, zoom 1x/2x/4x, punto de brújula en el borde, fondo negro/blanco.
- [ ] Nombres girados a lo largo de las cimas (como las apps con foto).
- [ ] Límite de distancia opcional, y ordenar por prominencia en vez de altura.
- [ ] Secciones que sigan el rumbo de la muñeca automáticamente.

## Instalación

Cuando haya una primera versión, se compilará e instalará como PadelCounter, con DevEco Studio y DevEco Assistant. Los archivos de firma (`.p12`, `.p7b`, `.cer`) y el UDID del reloj no forman parte de este repositorio.

## Datos y licencias

- Código: [MIT](LICENSE).
- Datos de cimas: © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright), licencia [ODbL](https://opendatacommons.org/licenses/odbl/).

---

Developed by [Vlarac](https://github.com/Vlarac03)
