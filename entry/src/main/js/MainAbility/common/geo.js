// Calcul de distancia, azimut i elevacio fins a un cim. Peaks: [lat, lon, alcada_m, nom].
var R = 6371000;
var RAD = Math.PI / 180;
// Declinacio magnetica aproximada al Pirineu (est positiva); la brujola dona rumb magnetic.
// shortcut: constant unica per a tota la zona, canvia ~0,1 °/any; afinar amb un model (WMM) si cal.
var DECLINATION = 1.5;

// Distancia (m), azimut real (0-360) i angle d'elevacio (graus) de l'observador al cim.
function toPeak(lat, lon, alt, p) {
    var f1 = lat * RAD, f2 = p[0] * RAD, dl = (p[1] - lon) * RAD;
    var a = Math.sin((f2 - f1) / 2) * Math.sin((f2 - f1) / 2) +
            Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    var d = 2 * R * Math.asin(Math.sqrt(a));
    var az = Math.atan2(Math.sin(dl) * Math.cos(f2),
                        Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)) / RAD;
    // Correccio de curvatura terrestre amb refraccio (k = 0,13).
    var drop = d * d / (2 * R) * (1 - 0.13);
    var elev = Math.atan2(p[2] - alt - drop, d) / RAD;
    return { name: p[3], ele: p[2], dist: d, az: (az + 360) % 360, elev: elev };
}

// Recorre els cims d'una cadena "lat,lon,cota,nom" (una per linia): menys memoria que un array d'arrays.
function each(str, fn) {
    var i = 0;
    while (i < str.length) {
        var e = str.indexOf("\n", i);
        if (e < 0) { e = str.length; }
        var f = str.substring(i, e).split(",");
        fn([+f[0], +f[1], +f[2], f.slice(3).join(",")]);
        i = e + 1;
    }
}

// Cims dins del radi (m) de l'observador, del mes alt al mes baix per angle d'elevacio.
function nearby(peaks, lat, lon, alt, radius) {
    var out = [];
    each(peaks, function(p) {
        var t = toPeak(lat, lon, alt, p);
        if (t.dist <= radius) { out.push(t); }
    });
    return out.sort(function(a, b) { return b.elev - a.elev; });
}

// Els n cims mes propers (per distancia), per a quan no n'hi ha cap dins del radi.
function closest(peaks, lat, lon, alt, n) {
    var best = [];
    each(peaks, function(p) {
        var t = toPeak(lat, lon, alt, p);
        if (best.length < n || t.dist < best[best.length - 1].dist) {
            best.push(t);
            best.sort(function(a, b) { return a.dist - b.dist; });
            if (best.length > n) { best.pop(); }
        }
    });
    return best;
}

// Els n cims mes ALTS (per altura, no per grandaria aparent) dins d'una seccio: "width" graus d'azimut centrats a "center", per
// sobre de l'horitzo i sense dos cims a menys de "sep" graus l'un de l'altre.
function sector(list, center, width, n, sep) {
    var cand = [];
    for (var i = 0; i < list.length; i++) {
        var t = list[i];
        if (t.elev <= 0) { continue; }
        // la seccio es [center - width/2, center + width/2): un cim exactament a la vora va a la seccio de la dreta
        var d = diff(t.az, center);
        if (d >= -width / 2 && d < width / 2) { cand.push(t); }
    }
    cand.sort(function(a, b) { return b.ele - a.ele; });
    var out = [];
    for (var k = 0; k < cand.length && out.length < n; k++) {
        var ok = true;
        for (var j = 0; j < out.length; j++) { if (Math.abs(diff(cand[k].az, out[j].az)) < sep) { ok = false; } }
        if (ok) { out.push(cand[k]); }
    }
    return out;
}

// Diferencia angular signada entre dos rumbs, en (-180, 180].
function diff(a, b) {
    var d = ((a - b + 540) % 360) - 180;
    return d === -180 ? 180 : d;
}

export default { toPeak: toPeak, nearby: nearby, closest: closest, sector: sector, diff: diff, DECLINATION: DECLINATION };
