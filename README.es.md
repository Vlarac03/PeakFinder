# Peakfinder para el Huawei Watch GT 6

[English](README.md) · [Català](README.ca.md) · **Español**

Un identificador de cumbres para la muñeca: apuntas hacia una montaña y el reloj te dice qué cima es, a partir de la posición (GPS) y la brújula. Pensado para funcionar **offline**, sin móvil ni cobertura.

> **Estado: prototipo de prueba de sensores (v0.1.0).** Muestra GPS, brújula y barómetro; todavía no identifica cimas. Ver [`docs/prova-sensors.md`](docs/prova-sensors.md) (en catalán) y la [hoja de ruta](#hoja-de-ruta).

## Idea

1. Leer la posición (latitud, longitud, altitud) y el rumbo de la brújula.
2. Cargar las cimas cercanas de una base de datos compacta empaquetada en la app.
3. Para cada cima, calcular distancia, acimut y ángulo de elevación.
4. Mostrar la cima más cercana al rumbo apuntado, con nombre, altura y distancia.

Detalles en [`docs/arquitectura.md`](docs/arquitectura.md) (en catalán).

## Hardware objetivo

Huawei Watch GT 6, pantalla redonda de 466×466, con GPS de doble banda, magnetómetro y barómetro. La app usa el framework **JS Lite Wearable** de HarmonyOS, el mismo camino que ya funciona con [PadelCounter](https://github.com/Vlarac03/PadelCounter).

## Zona cubierta

Pirineos y Cataluña. La base de datos se genera con el script de [`data/`](data/) a partir de OpenStreetMap.

## Hoja de ruta

- [ ] Probar que `@system.geolocation` y `@system.sensor` (brújula) funcionan en el GT 6 como app de terceros.
- [ ] Medir el límite de tamaño de la app y de memoria en el reloj.
- [ ] Script que genera el JSON de cimas (formato compacto).
- [ ] Cálculo de acimut y elevación, y selección de la cima apuntada.
- [ ] Interfaz: brújula, nombre de la cima, altura y distancia.
- [ ] Gestión del uso del GPS y de la batería.

## Instalación

Cuando haya una primera versión, se compilará e instalará como PadelCounter, con DevEco Studio y DevEco Assistant. Los archivos de firma (`.p12`, `.p7b`, `.cer`) y el UDID del reloj no forman parte de este repositorio.

## Datos y licencias

- Código: [MIT](LICENSE).
- Datos de cimas: © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright), licencia [ODbL](https://opendatacommons.org/licenses/odbl/).

---

Developed by [Vlarac](https://github.com/Vlarac03)
