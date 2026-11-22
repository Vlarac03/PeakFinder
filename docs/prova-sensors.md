# Prova de sensors al GT 6 (prototip 0.1.0)

Objectiu: saber si el GT 6 exposa GPS, brúixola i baròmetre a una app de tercers JS Lite Wearable, i amb quins errors.

## Compilar i instal·lar

Igual que PadelCounter:

1. Obre aquesta carpeta amb DevEco Studio.
2. A **File > Project Structure > Signing Configs**, genera la teva signatura de depuració (compte de desenvolupador de Huawei i rellotge registrat).
3. Executa el projecte o instal·la el `.hap` des de DevEco Assistant.

No pugis mai a Git els fitxers de signatura ni l'UDID del rellotge (el `.gitignore` ja els exclou).

## Què s'ha de provar (a l'aire lliure)

1. Obre l'app **a fora**, amb vista al cel (el GPS dins d'un edifici no fixa posició). Espera 1-2 minuts.
2. Mira les tres línies d'estat: cada una ha de passar d'`esperant` a `OK` o mostrar un codi d'error.
3. Gira el canell i comprova que el rumb canvia. Compara'l amb la brúixola del mòbil.
4. Compara l'altitud GPS i l'altitud estimada pel baròmetre amb un valor conegut (un cim o un mirador amb cota).

## Resultats

Anota aquí el que passa (copia'n el text exacte dels errors):

| Sensor | Estat | Notes |
| --- | --- | --- |
| Brúixola | pendent | |
| GPS | pendent | |
| Baròmetre | pendent | |

## Si falla

- **Error de permís:** pot caldre un permís addicional a `config.json` o acceptar-lo al rellotge.
- **`no disponible`:** l'API no existeix en aquest dispositiu per a tercers. Caldria buscar una alternativa (p. ex. fer la brúixola amb acceleròmetre i magnetòmetre).
- **GPS sense fixar:** prova a fora i espera uns minuts.

Els resultats decideixen com continuem: si els tres sensors funcionen, passem a les dades de cims.
