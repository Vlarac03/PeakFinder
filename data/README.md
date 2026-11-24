# Peak data

- `build_peaks.py` downloads the `natural=peak` nodes of the area (Pyrenees and Catalonia) from OpenStreetMap, cleans them and writes `peaks.json` and `entry/src/main/js/MainAbility/common/peaks.js` (one `lat,lon,height,name` line per peak, a single string: much smaller on the watch than an array of arrays).
- `raw/` and `.cache/` are in `.gitignore`: the raw downloads are not committed.

The app only uses these peaks. The circle is split into sections centred on the cardinal points (4 of 90°, 8 of 45° or 16 of 22.5°, depending on the zoom) and each section shows its 3 highest peaks with name, height and distance. There is no terrain model.

## Attribution

The data is © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the [ODbL](https://opendatacommons.org/licenses/odbl/). Any derived file published in this repository must keep this attribution.
