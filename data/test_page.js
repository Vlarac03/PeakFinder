// Prova de la pagina (index.js) amb node, sense rellotge: sensors, emmagatzematge, temps i canvas falsos.
// Us: node data/test_page.js
// El canvas fals imita el del rellotge lleuger: no te clearRect i el text nomes "es veu" amb la lletra HarmonyOS Sans.
var fs = require('fs'), assert = require('assert'), path = require('path');
var base = path.join(__dirname, '../entry/src/main/js/MainAbility/');

function loadModule(rel) {
    var src = fs.readFileSync(base + rel, 'utf8');
    var m = { exports: {} };
    new Function('module', src.replace('export default', 'module.exports ='))(m);
    return m.exports;
}
var geo = loadModule('common/geo.js'), peaks = loadModule('common/peaks.js');

var pageSrc = fs.readFileSync(base + 'pages/index/index.js', 'utf8')
    .replace(/^import .*$/gm, '')
    .replace('export default {', 'var PAGE = {') + '\nreturn PAGE;';
var makePage = new Function('geolocation', 'sensor', 'brightness', 'storage', 'geo', 'peaks',
    'setTimeout', 'setInterval', 'clearInterval', 'Date', 'console', pageSrc);

var LLEIDA = { latitude: 41.6118, longitude: 0.6192, altitude: 160 };
var BENASQUE = { latitude: 42.604, longitude: 0.523, altitude: 1138 };

// Un "rellotge" nou per a cada prova.
function world(saved) {
    var w = { now: 1000000, timers: [], nextId: 1, store: saved || {}, delay: {}, compass: null, compassOn: false, subCount: 0, gps: [], ctxs: [], canvasThrows: false, logs: [] };
    w.tick = function (ms) {
        var end = w.now + ms;
        for (;;) {
            var due = w.timers.filter(function (t) { return t.at <= end; }).sort(function (a, b) { return a.at - b.at || a.id - b.id; })[0];
            if (!due) { break; }
            w.now = due.at;
            if (due.every) { due.at += due.every; } else { w.timers.splice(w.timers.indexOf(due), 1); }
            due.fn();
        }
        w.now = end;
    };
    var sched = function (fn, ms, every) { var t = { id: w.nextId++, at: w.now + (ms || 0), fn: fn, every: every }; w.timers.push(t); return t.id; };
    w.setTimeout = function (fn, ms) { return sched(fn, ms); };
    w.setInterval = function (fn, ms) { return sched(fn, ms, ms); };
    w.clearInterval = function (id) { w.timers = w.timers.filter(function (t) { return t.id !== id; }); };
    w.Date = { now: function () { return w.now; } };
    w.storage = {
        get: function (o) { w.setTimeout(function () { if (o.key in w.store) { o.success(w.store[o.key]); } else { o.success(undefined); } }, w.delay[o.key] || 0); },
        set: function (o) { w.store[o.key] = o.value; if (o.success) { o.success(); } }
    };
    w.sensor = {
        subscribeCompass: function (o) { w.compass = o; w.compassOn = true; w.subCount++; },
        unsubscribeCompass: function () { w.compassOn = false; }
    };
    w.geolocation = { getLocation: function (o) { w.gps.push(o); } };
    w.brightness = { setKeepScreenOn: function () {} };
    w.console = { info: function (s) { w.logs.push(String(s)); } };
    // El sensor envia lectures sense parar; "events" en fa arribar n (un cada ms mil.lisegons) amb el rumb d.
    w.heading = function (d, n, ms) {
        for (var i = 0; i < (n || 1); i++) { if (w.compassOn) { w.compass.success({ direction: d }); } w.tick(ms === undefined ? 100 : ms); }
    };
    w.makeCtx = function () {
        var ctx = { ops: [], texts: [], pts: [], font: '', fillStyle: '', strokeStyle: '', lineWidth: 0 };
        ['beginPath', 'stroke'].forEach(function (n) { ctx[n] = function () { ctx.ops.push(n); }; });
        ['moveTo', 'lineTo'].forEach(function (n) { ctx[n] = function (x, y) { ctx.ops.push(n); ctx.pts.push([x, y]); }; });
        ctx.fillRect = function () { ctx.ops.push('fillRect'); ctx.bg = ctx.fillStyle; };
        // Sense clearRect (com al rellotge); el text nomes es mostra amb la lletra bona.
        ctx.fillText = function (s, x, y) {
            if (ctx.font.indexOf('HarmonyOS Sans') < 0) { throw new TypeError('lletra no disponible'); }
            ctx.ops.push('fillText');
            ctx.texts.push({ s: s, x: x, y: y, font: ctx.font });
        };
        return ctx;
    };
    var canvas = { getContext: function () { if (w.canvasThrows) { throw new TypeError('Expected a function'); } var c = w.makeCtx(); w.ctxs.push(c); return c; } };
    // Com al rellotge: el canvas nomes existeix quan la seccio es a pantalla (i el menu no).
    w.page = function () {
        var P = makePage(w.geolocation, w.sensor, w.brightness, w.storage, geo, peaks, w.setTimeout, w.setInterval, w.clearInterval, w.Date, w.console);
        var inst = Object.create(P);
        Object.keys(P.data).forEach(function (k) { inst[k] = P.data[k]; });
        Object.defineProperty(inst, '$refs', { get: function () { return (inst.showPage && !inst.showMenu) ? { c: canvas } : {}; } });
        w.inst = inst;
        return inst;
    };
    // Arrencada habitual: onInit + onShow + (opcional) rumb i posicio.
    w.boot = function (heading, fix) {
        var p = w.page();
        p.onInit(); w.tick(10); p.onShow();
        if (heading !== undefined) { w.heading(heading, 2, 1100); }
        if (fix) { w.gps[0].success(fix); }
        w.tick(500);
        return p;
    };
    return w;
}

var n = 0;
function test(name, fn) { fn(); n++; console.log('ok  ' + name); }
var lastCtx = function (w) { return w.ctxs[w.ctxs.length - 1]; };

// 1. Arrencada nova: la seccio on mires, amb 3 cims com a molt, un sol dibuix.
test('arrencada nova: seccio on mires, un sol dibuix, brujola i GPS', function () {
    var w = world(), p = w.page();
    p.onInit(); w.tick(10); p.onShow();
    assert.strictEqual(w.gps.length, 1, 'un sol getLocation'); assert.strictEqual(w.compassOn, true);
    w.heading(10, 2, 1100);
    assert.strictEqual(p.showPage, false, 'encara no hi ha posicio');
    w.gps[0].success(LLEIDA);
    assert.strictEqual(p.showPage, true);
    assert.strictEqual(w.gps.length, 1, 'no es torna a demanar GPS');
    assert.strictEqual(w.store.fx, '41.6118,0.6192,160');
    assert.strictEqual(p.page, 0, 'rumb 10: seccio N'); assert.deepStrictEqual([p.pl, p.pc, p.pr], ['O', 'N', 'E']);
    w.tick(500);
    assert.strictEqual(w.ctxs.length, 1, 'un sol dibuix');
    var c = lastCtx(w), big = c.texts.filter(function (t) { return t.font.indexOf('20px') === 0; });
    assert(big.length >= 2 && big.length <= 6, 'noms i detalls de com a molt 3 cims: ' + big.length);
    assert(c.texts.every(function (t) { return t.font.indexOf('HarmonyOS Sans') >= 0; }));
    assert.strictEqual(w.compassOn, true, 'la brujola continua (per al punt de la vora)');
    assert.strictEqual(p.errText, '');
});

// 2. Seccio inicial segons el rumb (inclos el pas 359 -> 0).
test('seccio inicial segons el rumb', function () {
    [[10, 0], [80, 1], [200, 2], [250, 3], [350, 0], [359, 0]].forEach(function (c) {
        var w = world(), p = w.boot(c[0], LLEIDA);
        assert.strictEqual(p.page, c[1], 'rumb ' + c[0] + ' -> seccio ' + c[1] + ', ha sortit ' + p.page);
    });
});

// 3. Swipe: seccio seguent/anterior (amb volta), una sola vegada per gest, un redibuix cada cop.
test('swipe: canvia de seccio i la redibuixa una sola vegada', function () {
    var w = world(), p = w.boot(10, LLEIDA);
    var d0 = w.ctxs.length;
    p.tSwipe({ direction: 'left' });
    assert.strictEqual(p.page, 1); assert.deepStrictEqual([p.pl, p.pc, p.pr], ['N', 'E', 'S']); assert.strictEqual(w.ctxs.length, d0 + 1);
    p.tSwipe({ direction: 'left' }); assert.strictEqual(p.page, 1, 'el mateix gest (element i pare) no compta dues vegades');
    w.tick(400); p.tSwipe({ direction: 'left' }); w.tick(400); p.tSwipe({ direction: 'left' });
    assert.strictEqual(p.page, 3); assert.deepStrictEqual([p.pl, p.pc, p.pr], ['S', 'O', 'N']);
    w.tick(400); p.tSwipe({ direction: 'left' }); assert.strictEqual(p.page, 0, 'volta completa');
    w.tick(400); p.tSwipe({ direction: 'right' }); assert.strictEqual(p.page, 3, 'cap enrere');
    var d = w.ctxs.length; w.tick(400); p.tSwipe({ direction: 'up' }); p.tSwipe(undefined); p.tSwipe({});
    assert.strictEqual(w.ctxs.length, d, 'swipes no valids ignorats');
    // 100 gests seguits no peten
    for (var i = 0; i < 100; i++) { w.tick(400); p.tSwipe({ direction: i % 3 ? 'left' : 'right' }); }
    assert.strictEqual(p.errText, '');
});

test('swipe ignorat en menu i avis', function () {
    var w = world(), p = w.boot(10, LLEIDA);
    p.openMenu(); var d = w.ctxs.length; p.tSwipe({ direction: 'left' }); assert.strictEqual(w.ctxs.length, d); assert.strictEqual(p.page, 0);
    var w2 = world(), p2 = w2.boot(0, { latitude: 35, longitude: 10, altitude: 50 });
    assert.strictEqual(p2.showNear, true); p2.tSwipe({ direction: 'left' }); assert.strictEqual(w2.ctxs.length, 0);
});

// 4. Punt de brujola: verd al centre, vermell a un costat, a l'extrem fora de la seccio; com a molt un cop per segon.
test('punt de brujola de la vora', function () {
    var w = world(), p = w.boot(0 - 1.5, LLEIDA);   // mirant al nord exacte (rumb magnetic = 0 - declinacio)
    assert.strictEqual(p.mc, '#34c759', 'verd quan mires al centre');
    assert(Math.abs(p.mx - 222) <= 1 && Math.abs(p.my - 17) <= 1, 'dalt al mig: ' + p.mx + ',' + p.my);
    w.heading(30, 1, 1100);                           // 31,5 graus a la dreta del centre (mitja seccio = 45)
    assert.strictEqual(p.mc, '#ff3b30'); assert(p.mx > 222 + 40, 'a la dreta: ' + p.mx);
    w.heading(-30, 1, 1100);
    assert(p.mx < 222 - 40, 'a l\'esquerra: ' + p.mx);
    w.heading(100, 1, 1100);                          // fora de la seccio: a l'extrem
    assert(p.mx > 222 + 100, 'fora a la dreta: ' + p.mx);
    w.heading(-100, 1, 1100);
    assert(p.mx < 222 - 100, 'fora a l\'esquerra: ' + p.mx);
    // tot cau sobre la vora de la pantalla (radi ~205 des del centre)
    [[-60, 0], [-20, 0], [0, 0], [20, 0], [60, 0], [120, 0]].forEach(function (c) {
        w.heading(c[0] - 1.5, 1, 1100);
        var r = Math.sqrt(Math.pow(p.mx + 11 - 233, 2) + Math.pow(p.my + 11 - 233, 2));
        assert(Math.abs(r - 205) < 3, 'radi ' + r.toFixed(1));
    });
    // un cop per segon com a molt: 50 lectures en 1 s no canvien res mes que la primera
    var subs = w.subCount;
    w.heading(20, 1, 15);      // aquesta s'accepta
    var before = p.mx;
    w.heading(70, 49, 15);     // les 49 seguents (735 ms) es descarten
    assert.strictEqual(p.mx, before, 'lectures dins del mateix segon descartades');
    assert.strictEqual(w.subCount, subs, 'una sola subscripcio');
    // sense posicio, o amb el menu obert, no fa res
    var w2 = world(), p2 = w2.page(); p2.onInit(); w2.tick(10); p2.onShow(); var m0 = p2.mx; w2.heading(80, 1, 1100); assert.strictEqual(p2.mx, m0);
    p.openMenu(); var m1 = p.mx; w.heading(10, 1, 1100); assert.strictEqual(p.mx, m1);
});

// 5. Zoom: 8 i 16 seccions, es queda a la mateixa zona, noms de sub-cardinals.
test('zoom 2x i 4x: seccions, noms i seccio equivalent', function () {
    var w = world(), p = w.boot(80, LLEIDA);       // rumb 80+1,5 = 81,5: E (seccio 1 de 4)
    assert.strictEqual(p.page, 1); p.openMenu();
    p.nextZoom(); assert.strictEqual(p.zoom, 1); assert.strictEqual(p.zoomText, 'Zoom: 2x'); assert.strictEqual(w.store.zm, '1');
    assert.strictEqual(p.page, 2, 'E = seccio 2 de 8'); assert.deepStrictEqual([p.pl, p.pc, p.pr], ['NE', 'E', 'SE']);
    p.nextZoom(); assert.strictEqual(p.zoom, 2); assert.strictEqual(p.page, 4, 'E = seccio 4 de 16'); assert.deepStrictEqual([p.pl, p.pc, p.pr], ['ENE', 'E', 'ESE']);
    p.closeMenu(); w.tick(500);
    var c = lastCtx(w); assert(c.texts.length >= 0);
    p.tSwipe({ direction: 'left' }); assert.strictEqual(p.pc, 'ESE');
    // 16 swipes = volta completa
    for (var i = 0; i < 15; i++) { w.tick(400); p.tSwipe({ direction: 'left' }); }
    assert.strictEqual(p.pc, 'E');
    p.openMenu(); p.nextZoom(); assert.strictEqual(p.zoom, 0); assert.strictEqual(p.pc, 'E');
    // cada zoom pinta una vegada i amb els cims de la seva seccio
    [0, 1, 2].forEach(function (z) {
        var ww = world({ zm: String(z) }), pp = ww.boot(10, BENASQUE);
        assert.strictEqual(pp.zoom, z); assert.strictEqual(ww.ctxs.length, 1);
    });
});

// 6. Menu: fons, posicio.
test('menu: fons blanc i actualitzar posicio', function () {
    var w = world(), p = w.boot(10, LLEIDA);
    p.openMenu(); assert.strictEqual(p.showMenu, true);
    p.toggleTheme();
    assert.strictEqual(p.dark, false); assert.strictEqual(p.bg, '#ffffff'); assert.strictEqual(p.fg, '#000000');
    assert.strictEqual(p.sub, '#666666'); assert.strictEqual(p.itemBg, '#dddddd'); assert.strictEqual(w.store.th, '0');
    p.closeMenu(); w.tick(500);
    assert.strictEqual(lastCtx(w).bg, '#ffffff', 'canvas amb fons blanc');
    p.openMenu(); p.refreshPosition(); assert.strictEqual(p.updating, true);
    w.gps[w.gps.length - 1].success(BENASQUE);
    assert.strictEqual(p.updating, false); assert.strictEqual(p.showMenu, false); assert.strictEqual(w.store.fx, '42.6040,0.5230,1138');
    w.tick(500); assert.strictEqual(p.errText, '');
    p.openMenu(); p.refreshPosition(); w.gps[w.gps.length - 1].fail('timeout', 207);
    assert.strictEqual(p.updating, false); assert(p.menuMsg.indexOf('207') >= 0);
    p.toggleTheme(); assert.strictEqual(p.dark, true); assert.strictEqual(p.fg, '#ffffff'); assert.strictEqual(p.sub, '#999999');
});

// 7. Tornar de segon pla: recupera posicio, fons i zoom sense tocar el GPS; el fons pot arribar tard.
test('restaurar: posicio, fons i zoom desats, sense GPS', function () {
    var w = world({ fx: '41.6118,0.6192,160', th: '0', zm: '1' }), p = w.page();
    p.onInit(); p.onShow(); w.tick(10);
    assert.strictEqual(w.gps.length, 0, 'no demana GPS');
    assert.strictEqual(p.dark, false); assert.strictEqual(p.zoom, 1); assert.strictEqual(p.zoomText, 'Zoom: 2x');
    assert(p.fix && Math.abs(p.fix.lat - 41.6118) < 1e-6);
    assert.strictEqual(p.showPage, true, 'surt de seguida (pagina del nord fins que arribi el rumb)');
    w.heading(200, 2, 1100); assert.strictEqual(p.showPage, true);
    var w3 = world({ fx: '41.6118,0.6192,160', th: '0' }); w3.delay.th = 400;
    var p3 = w3.page(); p3.onInit(); p3.onShow(); w3.heading(10, 2, 100); w3.tick(200);
    assert.strictEqual(lastCtx(w3).bg, '#000000');
    w3.tick(600); assert.strictEqual(lastCtx(w3).bg, '#ffffff', 'redibuixat en blanc');
});

// 8. Cap cim al radi: avis amb els 3 mes propers (i despres, posicio nova amb cims).
test('cap cim a prop: avis, i canvi a seccions en actualitzar la posicio', function () {
    var w = world(), p = w.boot(0, { latitude: 35.0, longitude: 10.0, altitude: 50 });
    assert.strictEqual(p.nearList.length, 0);
    assert.strictEqual(p.showNear, true); assert.strictEqual(p.showPage, false);
    assert(p.r0 && p.r1 && p.r2 && p.r3 && p.r4 && p.r5, 'les sis files de text');
    p.openMenu(); p.refreshPosition(); w.gps[w.gps.length - 1].success(LLEIDA);
    assert.strictEqual(p.showPage, true); assert.strictEqual(p.showNear, false);
});

// 9. Errors i reintent.
test('errors: canvas, GPS, brujola i reintent', function () {
    var w = world(); w.canvasThrows = true;
    var p = w.boot(0, LLEIDA);
    assert.strictEqual(p.showPage, false); assert(p.errText.indexOf('getContext') >= 0, p.errText);
    w.canvasThrows = false; p.retry(); w.heading(0, 2, 1100); w.tick(500);
    assert.strictEqual(p.errText, ''); assert.strictEqual(p.showPage, true);
    assert.strictEqual(w.gps.length, 1, 'no torna a demanar el GPS: ja hi ha posicio');
    var w2 = world(), p2 = w2.page();
    p2.onInit(); w2.tick(10); p2.onShow(); w2.gps[0].fail('perm', 601);
    assert.strictEqual(p2.gpsStatus, 'sense permis'); assert.strictEqual(w2.gps.length, 1);
    var w3 = world(), p3 = w3.page();
    p3.onInit(); w3.tick(10); p3.onShow();
    w3.gps[0].fail('x', 1000); w3.tick(1100);
    assert.strictEqual(w3.gps.length, 2, 'reintenta');
    p3.startGps(); assert.strictEqual(w3.gps.length, 2, 'no duplica peticions');
    w3.compass.fail('x', 5); assert.strictEqual(p3.compassStatus, 'ERR 5');
});

test('GPS sense altura', function () {
    var w = world(), p = w.page();
    p.onInit(); w.tick(10); p.onShow(); w.gps[0].success({ latitude: 41.6118, longitude: 0.6192 });
    assert.strictEqual(p.showPage, true); assert.strictEqual(w.store.fx, '41.6118,0.6192,0');
});

// 10. Cicle de vida.
test('amagar / tornar', function () {
    var w = world(), p = w.boot(10, LLEIDA);
    p.onHide(); assert.strictEqual(w.compassOn, false, 'amagada: brujola aturada');
    p.onShow(); assert.strictEqual(w.compassOn, true, 'visible: brujola torna'); assert.strictEqual(w.gps.length, 1); assert.strictEqual(p.showPage, true);
    var w2 = world(), p2 = w2.page();
    p2.onInit(); w2.tick(10); p2.onShow(); assert.strictEqual(w2.compassOn, true);
    p2.onHide(); assert.strictEqual(w2.compassOn, false);
    p2.onShow(); assert.strictEqual(w2.compassOn, true);
});

// 11. Dibuix de totes les seccions: dins del canvas, sense solapar-se, un com a molt de 3 noms.
test('totes les seccions, zooms i dos llocs: tot dins del canvas i sense solapar-se', function () {
    var checked = 0;
    [LLEIDA, BENASQUE].forEach(function (pos) {
        [0, 1, 2].forEach(function (z) {
            var w = world({ zm: String(z) }), p = w.boot(0, pos);
            var s = [4, 8, 16][z];
            for (var k = 0; k < s; k++) {
                p.page = k; p.setHeader(); p.drawPage();
                var c = lastCtx(w), rows = {};
                c.pts.forEach(function (q) { assert(q[0] >= 0 && q[0] <= 466 && q[1] >= 0 && q[1] <= 170, 'punt fora del canvas ' + q); });
                c.texts.forEach(function (t) { assert(t.y >= 0 && t.y <= 170, 'text fora ' + t.s); (rows[t.y] = rows[t.y] || []).push(t); });
                var labels = c.texts.filter(function (t) { return t.font.indexOf('20px') === 0; });
                assert(labels.length <= 6, 'com a molt 3 cims (2 linies cadascun): ' + labels.length);
                Object.keys(rows).forEach(function (y) {
                    var r = rows[y].filter(function (t) { return t.font.indexOf('20px') === 0; }).sort(function (a, b) { return a.x - b.x; });
                    for (var i = 1; i < r.length; i++) { assert(r[i].x >= r[i - 1].x + r[i - 1].s.length * 12 - 12, 'solapen ' + r[i - 1].s + ' / ' + r[i].s); }
                    r.forEach(function (t) { assert(t.x >= 0 && t.x + t.s.length * 12 <= 466 + 24, 'surt: ' + t.s + ' x=' + t.x); });
                });
                assert.strictEqual(p.errText, '');
                checked++;
            }
        });
    });
    console.log('    (' + checked + ' seccions comprovades)');
});

// 12. Cost: operacions de canvas per dibuix.
test('cost: operacions de canvas per dibuix', function () {
    var w = world(), p = w.boot(0, LLEIDA);
    var c = lastCtx(w), counts = {};
    c.ops.forEach(function (o) { counts[o] = (counts[o] || 0) + 1; });
    console.log('    ' + JSON.stringify(counts));
    assert(c.ops.length < 150);
});

console.log('\n' + n + ' proves de pagina OK');
