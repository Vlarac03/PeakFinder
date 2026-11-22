# Arquitectura (esborrany)

## Decisions preses

| Decisió | Elecció | Motiu |
| --- | --- | --- |
| On s'executa la lògica | Tot al rellotge, offline | Ha de funcionar a la muntanya sense mòbil ni cobertura |
| Zona | Pirineus i Catalunya | Cobertura inicial més àmplia |
| Framework | JS Lite Wearable (`.hml` + `.css` + `.js`) | És el camí que ja funciona al GT 6 amb PadelCounter |

## Fluxe de dades

```
GPS (lat, lon, alt) ─┐
                     ├─> filtra cims propers ─> azimut + elevació ─> cim apuntat ─> UI
Brúixola (rumb) ─────┘
```

## Càlcul

Per a cada cim candidat dins d'un radi (p. ex. 30 km):

- **Distància** `d`: fórmula de haversine entre la posició i el cim.
- **Azimut** `θ`: rumb inicial de la posició al cim.
- **Elevació** `φ = atan((h_cim − h_obs) / d)`, amb correcció per curvatura terrestre i refracció si cal.
- **Puntuació**: es tria el cim amb menor diferència angular `|θ − rumb|` dins d'un con (p. ex. ±5°), desempatant per prominència i per l'angle d'elevació.

## Dades de cims

- Font: OpenStreetMap, etiqueta `natural=peak`, amb `name` i `ele`.
- Format: JSON compacte empaquetat dins del `.hap` (no a `@system.storage`, que a Lite només admet uns 128 bytes per valor).
- Cal dividir per quadrícules (tiles) i carregar només les properes, per no omplir la memòria del rellotge.

## Punts oberts

- Verificar que `@system.geolocation` i `@system.sensor` (brúixola) funcionen a tercers al GT 6.
- Límit real de mida de l'app i de memòria al rellotge.
- Declinació magnètica: el rumb de la brúixola és magnètic, cal corregir-lo per obtenir el rumb real.
- Calibratge de la brúixola i soroll quan el canell no està pla.
- Consum de bateria del GPS: llegir-lo a intervals, no de forma contínua.
- Visibilitat: un cim pot ser darrere d'un altre. Sense model digital de terreny no es pot saber del cert.
