// Prova de geo.js amb node: node tests/test_geo.js
var fs = require('fs'), assert = require('assert'), path = require('path');
var load = function (f) {
    var src = fs.readFileSync(path.join(__dirname, '../entry/src/main/js/MainAbility/common/' + f), 'utf8');
    var m = { exports: {} };
    new Function('module', src.replace('export default', 'module.exports ='))(m);
    return m.exports;
};
var geo = load('geo.js'), peaks = load('peaks.js');
var near = function (a, b, tol) { assert(Math.abs(a - b) <= tol, a + ' != ' + b + ' +-' + tol); };

// Un grau cap al nord: ~111,2 km, azimut 0; cap a l'est a l'equador: azimut 90.
var n = geo.toPeak(42, 1, 0, [43, 1, 0, 'n']);
near(n.dist / 1000, 111.2, 0.5); near(n.az, 0, 0.01);
near(geo.toPeak(0, 0, 0, [0, 1, 0, 'e']).az, 90, 0.01);
// Cim 1000 m mes alt a 10 km: ~5,7 graus (amb una mica de curvatura).
near(geo.toPeak(42, 1, 0, [42.0899, 1, 1000, 'p']).elev, 5.7, 0.3);
// Diferencia angular amb salt de 360.
assert.strictEqual(geo.diff(350, 10), -20); assert.strictEqual(geo.diff(10, 350), 20);

// Des de Benasque (1138 m): l'Aneto (azimut ~75 graus) ha de ser dins dels cims propers.
var list = geo.nearby(peaks, 42.604, 0.523, 1138, 40000);
var hit = list.filter(function (t) { return /Aneto/.test(t.name); })[0];
console.log('Benasque:', hit && hit.name, hit && Math.round(hit.dist / 1000) + ' km', hit && hit.elev.toFixed(1) + '°');
assert(hit && hit.elev > 10 && Math.abs(geo.diff(hit.az, 75)) < 6);
console.log('OK, ' + list.length + ' cims dins de 40 km');

// Des de Saragossa (cap cim a 40 km): els 3 mes propers, ordenats per distancia.
var zgz = geo.closest(peaks, 41.65, -0.88, 150, 3);
assert(geo.nearby(peaks, 41.65, -0.88, 150, 40000).length === 0);
assert(zgz.length === 3 && zgz[0].dist <= zgz[1].dist && zgz[1].dist <= zgz[2].dist);
console.log('Saragossa, el mes proper:', zgz[0].name, Math.round(zgz[0].dist / 1000) + ' km');

// Seccions: els 3 cims mes alts de cada seccio, ordenats, dins de la seccio i sense dos a menys de 2 graus.
function checkSectors(name, lat, lon, alt, nsec) {
    var near = geo.nearby(peaks, lat, lon, alt, 150000), wd = 360 / nsec, total = 0, seen = {};
    for (var k = 0; k < nsec; k++) {
        var c = k * wd, top = geo.sector(near, c, wd, 3, 2);
        assert(top.length <= 3, name + ': com a molt 3');
        for (var i = 0; i < top.length; i++) {
            var d = geo.diff(top[i].az, c);
            assert(d >= -wd / 2 && d < wd / 2, name + ': dins de la seccio ' + k + ' (' + d.toFixed(1) + ')');
            assert(top[i].elev > 0);
            if (i) { assert(top[i].ele <= top[i - 1].ele, 'ordenats per altura'); }
            for (var j = 0; j < i; j++) { assert(Math.abs(geo.diff(top[i].az, top[j].az)) >= 2, 'separats'); }
            assert(!seen[top[i].name + top[i].ele], 'un cim no surt a dues seccions');
            seen[top[i].name + top[i].ele] = true;
        }
        total += top.length;
    }
    return total;
}
[4, 8, 16].forEach(function (n) {
    var a = checkSectors('Lleida x' + n, 41.6118, 0.6192, 160, n), b = checkSectors('Benasque x' + n, 42.604, 0.523, 1138, n);
    assert(a > 0 && b > 0);
    console.log(n + ' seccions: Lleida ' + a + ' cims, Benasque ' + b + ' cims');
});
// Lleida mirant al nord (seccio 0 de 4): l'Aneto hi es entre els 3 mes alts.
var lleN = geo.sector(geo.nearby(peaks, 41.6118, 0.6192, 160, 150000), 0, 90, 3, 2);
console.log('Lleida, seccio N:', lleN.map(function (t) { return t.name.split(' / ')[0] + ' ' + t.ele + ' m ' + Math.round(t.dist / 1000) + ' km'; }).join(' | '));
assert(lleN.length === 3);
assert(lleN.some(function (t) { return /Aneto/.test(t.name); }), "l'Aneto es dels 3 mes alts al nord de Lleida");
// un cim exactament a la vora (az = 45 amb seccions de 90 centrades a 0 i 90) va a una sola seccio
var edge = [{ az: 45, elev: 1, name: 'x', ele: 1, dist: 1 }];
assert.strictEqual(geo.sector(edge, 0, 90, 3, 2).length + geo.sector(edge, 90, 90, 3, 2).length, 1);
assert.strictEqual(geo.sector([], 0, 90, 3, 2).length, 0);
