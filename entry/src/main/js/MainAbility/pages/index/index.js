import geolocation from '@system.geolocation';
import sensor from '@system.sensor';
import brightness from '@system.brightness';
import storage from '@system.storage';
import geo from '../../common/geo.js';
import peaks from '../../common/peaks.js';

// Peakfinder: els cims mes alts que tens al voltant, per seccions.
//
// El cercle es parteix en seccions centrades en els punts cardinals: 4 de 90 graus (N, E, S, O), 8 de 45 (amb NE, SE...) o
// 16 de 22,5 (amb NNE, ENE...) segons el zoom. Cada seccio es UN canvas petit amb els 3 cims mes alts de la seccio (nom, altura
// i distancia) i una silueta senzilla. Lliscar (swipe) canvia de seccio i la redibuixa una sola vegada: res es mou.
// A dalt, un punt que segueix la vora de la pantalla com una brujola: vermell a l'esquerra o a la dreta si no mires cap a la
// seccio, verd si hi mires. La brujola s'actualitza com a molt un cop per segon. El GPS es llegeix una sola vegada.

// Radi de cerca de cims (m): el Pirineu es veu des de Lleida a uns 100-150 km.
var RADIUS = 150000;
// Seccions per nivell de zoom i els seus noms.
var SECT = [4, 8, 16];
var NAMES = [
    ['N', 'E', 'S', 'O'],
    ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
    ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']
];
// Canvas de cada seccio, linia de terra, alcada maxima de la silueta, files de text i pas entre columnes.
var W = 466;
var CH = 170;
var BASE = 160;
var MAXH = 45;
var ROWS = [[72, 96], [24, 48]];
var STEP = 8;
// Brujola de la vora: radi del cercle on es mou el punt i amplada de la zona (graus de la rodona) segons la desviacio.
var RIM = 205;
var RIMSPAN = 40;
// Al GT 6 el text del canvas nomes es veu amb aquesta lletra (amb les altres surten trossos).
var FONT = 'HarmonyOS Sans';

// Mode simulador: {lat, lon, alt, start, zoom, page, lat2, lon2, alt2, swipes}. null al rellotge.
var MOCK = null;

// Tots els colors venen de dades (fons/text segons el tema); a l'HML no hi ha cap color fix que els pugui trepitjar.
export default {
    data: {
        // Quina pantalla es veu: seccio, avis de "cap cim" o menu (si no n'hi ha cap, la d'espera).
        showPage: false,
        showNear: false,
        showMenu: false,
        // Pantalla d'espera
        compassStatus: "esperant",
        gpsStatus: "esperant",
        errText: "",
        // Colors segons el tema (fons negre o blanc; text i dibuix en el color contrari)
        dark: true,
        bg: "#000000",
        fg: "#ffffff",
        sub: "#999999",
        itemBg: "#222222",
        // Menu
        menuMsg: "",
        zoomText: "Zoom: 1x",
        // Capcalera de seccio: veina esquerra, actual, veina dreta
        pl: "O", pc: "N", pr: "E",
        // Punt de brujola de la vora (posicio i color)
        mx: 211, my: 14, mc: "#999999",
        // Avis "cap cim": els 3 mes propers
        r0: "", r1: "", r2: "", r3: "", r4: "", r5: ""
    },

    // ---------------------------------------------------------------- cicle de vida

    onInit() {
        this.restoring = true;
        this.zoom = 0;
        this.page = 0;
        this.loadSaved();
        try { brightness.setKeepScreenOn({ keepScreenOn: true, success: function() {}, fail: function() {} }); } catch (e) { console.info('brightness: ' + e); }
    },

    onShow() {
        if (MOCK) { this.startMock(); return; }
        this.startCompass();
        if (!this.fix && !this.restoring) { this.startGps(); }
    },

    onHide() { this.stopAll(); },

    onDestroy() { this.stopAll(); },

    stopAll() {
        if (this.mockTimer) { clearInterval(this.mockTimer); this.mockTimer = null; }
        this.gpsStop = true;
        this.gpsBusy = false;
        this.stopCompass();
    },

    // ---------------------------------------------------------------- desat (com PadelCounter: text curt, el rellotge aguanta ~128 bytes)

    save(key, value) {
        try { storage.set({ key: key, value: value, success: function() {}, fail: function() {} }); } catch (e) { console.info('save ' + key + ': ' + e); }
    },

    saveFix() { this.save('fx', this.fix.lat.toFixed(4) + ',' + this.fix.lon.toFixed(4) + ',' + Math.round(this.fix.alt)); },

    // En tornar de segon pla l'app es crea de nou: recupera fons, zoom i posicio sense tornar a buscar-la amb el GPS.
    loadSaved() {
        var self = this;
        // Sense posicio desada (primera vegada): ara si, cerca-la amb el GPS.
        var search = function() {
            self.restoring = false;
            if (!self.fix && !MOCK) { self.startGps(); }
        };
        try {
            storage.get({ key: 'th', success: function(t) { if (t === '0') { self.setTheme(false); } }, fail: function() {} });
            storage.get({ key: 'zm', success: function(z) { if (z === '1' || z === '2') { self.setZoom(+z); } }, fail: function() {} });
            storage.get({
                key: 'fx',
                success: function(d) {
                    var f = d && d !== 'null' ? String(d).split(',') : [];
                    if (f.length === 3 && !self.fix) {
                        self.restoring = false;
                        self.gpsStatus = "OK (desada)";
                        self.onFix({ latitude: +f[0], longitude: +f[1], altitude: +f[2] });
                        self.tryStart();
                    } else { search(); }
                },
                fail: search
            });
        } catch (e) {
            console.info('loadSaved: ' + e);
            search();
        }
    },

    // ---------------------------------------------------------------- sensors

    // Brujola: continua mentre l'app es oberta, pero nomes es mira un cop per segon (la resta de lectures es descarten a la primera linia).
    startCompass() {
        var self = this;
        this.stopCompass();
        this.compassOn = true;
        this.compassStatus = "llegint...";
        this.cT = 0;
        try {
            sensor.subscribeCompass({
                success: function(ret) {
                    var now = Date.now();
                    if (self.cT && now - self.cT < 1000) { return; }
                    self.cT = now;
                    self.onHeading(ret.direction);
                },
                fail: function(data, code) {
                    self.compassStatus = "ERR " + code;
                    console.info('compass fail: ' + code + ' ' + data);
                }
            });
        } catch (e) {
            this.compassStatus = "no disponible";
            console.info('compass: ' + e);
        }
    },

    stopCompass() {
        if (!this.compassOn) { return; }
        this.compassOn = false;
        try { sensor.unsubscribeCompass(); } catch (e) { console.info('unsubscribeCompass: ' + e); }
    },

    onHeading(d) {
        var first = this.heading === undefined;
        this.heading = d;
        if (first) { this.compassStatus = "OK"; }
        this.tryStart();
        this.updateMarker();
    },

    // Punt de brujola: segueix la vora de dalt de la pantalla. Centrat i verd = mires cap al centre de la seccio;
    // vermell a l'esquerra o a la dreta = gira cap a aquell costat; a l'extrem (+-50) = mires fora de la seccio.
    updateMarker() {
        if (!this.showPage || this.showMenu || this.heading === undefined) { return; }
        var wd = 360 / SECT[this.zoom];
        var dd = geo.diff((this.heading + geo.DECLINATION + 360) % 360, this.page * wd);
        var half = wd / 2, th, col;
        if (Math.abs(dd) <= Math.max(3, wd / 12)) { th = 0; col = '#34c759'; }
        else if (Math.abs(dd) <= half) { th = dd / half * RIMSPAN; col = '#ff3b30'; }
        else { th = dd > 0 ? RIMSPAN + 10 : -RIMSPAN - 10; col = '#ff3b30'; }
        var rad = th * Math.PI / 180;
        var x = Math.round(233 + RIM * Math.sin(rad) - 11), y = Math.round(233 - RIM * Math.cos(rad) - 11);
        // nomes s'escriu si s'ha mogut (menys escriptures = menys refrescos)
        if (Math.abs(x - this.mx) >= 3 || Math.abs(y - this.my) >= 3 || col !== this.mc) { this.mx = x; this.my = y; this.mc = col; }
    },

    // GPS: una lectura (amb reintents si encara no fixa), no una subscripcio continua.
    startGps() {
        if (this.gpsBusy || this.fix) { return; }
        this.gpsBusy = true;
        this.gpsStop = false;
        this.gpsTries = 0;
        this.requestFix();
    },

    requestFix() {
        var self = this;
        if (this.gpsStop || this.fix) { this.gpsBusy = false; return; }
        this.gpsTries++;
        this.gpsStatus = "buscant... (" + this.gpsTries + ")";
        try {
            geolocation.getLocation({
                timeout: 30000,
                coordType: 'wgs84',
                success: function(data) {
                    self.gpsBusy = false;
                    self.gpsStatus = "OK";
                    self.onFix(data);
                    self.tryStart();
                },
                fail: function(data, code) {
                    console.info('gps fail: ' + code + ' ' + data);
                    // shortcut: reintenta per qualsevol error excepte permis (601/602); si cal, afinar-ho amb els codis reals.
                    if (code === 601 || code === 602) {
                        self.gpsBusy = false;
                        self.gpsStatus = "sense permis";
                        return;
                    }
                    setTimeout(function() { self.requestFix(); }, 1000);
                }
            });
        } catch (e) {
            this.gpsBusy = false;
            this.gpsStatus = "no disponible";
            console.info('gps: ' + e);
        }
    },

    // ---------------------------------------------------------------- posicio i vistes

    // Nova posicio: cims propers (ordenats per grandaria), i (si no se'n veu cap) els 3 mes propers per a l'avis. La desa.
    onFix(data) {
        var alt = +data.altitude;
        if (!isFinite(alt)) { alt = 0; }   // sense altura al GPS: es calcula des del nivell del mar
        this.fix = { lat: data.latitude, lon: data.longitude, alt: alt };
        this.nearList = geo.nearby(peaks, data.latitude, data.longitude, alt, RADIUS);
        this.saveFix();
        this.closeList = this.nearList.length ? null : geo.closest(peaks, data.latitude, data.longitude, alt, 3);
        if (this.closeList) {
            var rows = [];
            for (var i = 0; i < this.closeList.length; i++) {
                var c = this.closeList[i];
                rows.push(c.name.split(" / ")[0]);
                rows.push(c.ele + " m · " + Math.round(c.dist / 1000) + " km " + this.cardinalOf(c.az));
            }
            this.r0 = rows[0]; this.r1 = rows[1]; this.r2 = rows[2]; this.r3 = rows[3]; this.r4 = rows[4]; this.r5 = rows[5];
        }
        // Si ja hi havia una vista a pantalla (posicio actualitzada des del menu), tria la que toca ara.
        if (this.showPage || this.showNear) { this.applyView(); }
    },

    applyView() {
        var vis = this.nearList.length > 0;
        this.showPage = vis;
        this.showNear = !vis;
        if (vis) { this.setHeader(); }
    },

    // Quan hi ha posicio passa de la pantalla d'espera a la seccio on mires (si ja hi ha rumb) o a la del nord.
    tryStart() {
        if (!this.fix || this.showPage || this.showNear || this.errText) { return; }
        if (this.heading !== undefined) { this.page = this.sectorOf((this.heading + geo.DECLINATION + 360) % 360); }
        this.applyView();
        if (this.showPage) { this.drawSoon(0); this.updateMarker(); }
    },

    // Seccio (segons el zoom actual) que conte un azimut.
    sectorOf(az) {
        var s = SECT[this.zoom];
        return Math.round(az / (360 / s)) % s;
    },

    // Capcalera: nom de la seccio i els de les veines.
    setHeader() {
        var s = SECT[this.zoom], nm = NAMES[this.zoom];
        this.pl = nm[(this.page + s - 1) % s];
        this.pc = nm[this.page];
        this.pr = nm[(this.page + 1) % s];
    },

    cardinalOf(deg) {
        var names = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
        return names[Math.round(deg / 45) % 8];
    },

    // Tocar la pantalla d'espera (p. ex. despres d'un error) torna a llegir brujola i GPS.
    retry() {
        this.errText = "";
        this.stopAll();
        this.gpsStop = false;
        this.startCompass();
        if (!this.fix) { this.startGps(); }
        this.tryStart();
    },

    // ---------------------------------------------------------------- una seccio (canvas)

    // El canvas no existeix fins que la pantalla s'ha refrescat: es dibuixa quan ja hi es (es reintenta uns segons).
    drawSoon(n) {
        var self = this;
        setTimeout(function() {
            if (!self.showPage || self.showMenu) { return; }
            if (!(self.$refs && self.$refs.c)) {
                if (n < 12) { self.drawSoon(n + 1); } else { self.fail("canvas no creat"); }
                return;
            }
            self.drawPage();
        }, n === 0 ? 120 : 200);
    },

    fail(msg) {
        this.errText = msg;
        this.showPage = false;
        this.showNear = false;
    },

    // Si el canvas falla al rellotge, torna a la pantalla d'espera i hi mostra l'error.
    drawPage() {
        try { this.drawPageNow(); } catch (e) { this.fail(this.step + ": " + e); }
    },

    drawPageNow() {
        var el = this.$refs && this.$refs.c;
        if (!el || !this.nearList) { return; }
        var wd = 360 / SECT[this.zoom], c = this.page * wd, fg = this.dark ? '#ffffff' : '#000000';
        var picks = geo.sector(this.nearList, c, wd, 3, 2);
        this.step = 'getContext';
        var ctx = el.getContext('2d');
        this.step = 'fons';
        // clearRect no existeix al canvas del rellotge lleuger: s'esborra pintant el fons.
        ctx.fillStyle = this.dark ? '#000000' : '#ffffff';
        ctx.fillRect(0, 0, W, CH);
        this.step = 'silueta';
        // Posicio horitzontal i alcada (px) de cada cim segons la seva grandaria aparent: el que es veu mes gran fa MAXH; la resta, proporcional (minim 10 px).
        var n = picks.length, px = [], hp = [], me = 0, i, j;
        for (i = 0; i < n; i++) { if (picks[i].elev > me) { me = picks[i].elev; } }
        for (i = 0; i < n; i++) {
            px.push((geo.diff(picks[i].az, c) + wd / 2) / wd * W);
            hp.push(Math.max(10, picks[i].elev / me * MAXH));
        }
        ctx.strokeStyle = fg;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (var x = 0; x <= W; x += STEP) {
            var h = 0;
            for (j = 0; j < n; j++) { h = Math.max(h, hp[j] - 0.7 * Math.abs(x - px[j])); }
            if (x === 0) { ctx.moveTo(x, BASE - h); } else { ctx.lineTo(x, BASE - h); }
        }
        ctx.stroke();
        this.step = 'text';
        ctx.fillStyle = fg;
        if (n === 0) { this.txt(ctx, "Cap cim en aquesta zona", 90, 96, 20); return; }
        // Fins a 3 noms en dues files (el mes gran a la de sota, mes a prop del cim); cada nom amb una ratlla fina fins al seu cim.
        var used = [[], []];
        ctx.lineWidth = 1;
        for (i = 0; i < n; i++) {
            var t = picks[i];
            var l1 = t.l1 || (t.l1 = t.name.split(" / ")[0].substring(0, 16));
            var l2 = t.l2 || (t.l2 = t.ele + " m · " + Math.round(t.dist / 1000) + " km");
            var w = Math.max(l1.length, l2.length) * 12, lx = Math.max(4, Math.min(px[i] - w / 2, W - w - 4)), lv = -1;
            for (var r = 0; r < 2 && lv < 0; r++) {
                var free = true;
                for (j = 0; j < used[r].length; j++) { if (lx < used[r][j][1] + 10 && lx + w > used[r][j][0] - 10) { free = false; } }
                // la ratlla de la fila de dalt no pot travessar un text de la de sota
                if (r === 1) { for (j = 0; j < used[0].length; j++) { if (px[i] > used[0][j][0] - 6 && px[i] < used[0][j][1] + 6) { free = false; } } }
                if (free) { lv = r; }
            }
            if (lv < 0) { continue; }
            used[lv].push([lx, lx + w]);
            this.txt(ctx, l1, lx, ROWS[lv][0], 20);
            this.txt(ctx, l2, lx, ROWS[lv][1], 20);
            ctx.beginPath();
            ctx.moveTo(px[i], ROWS[lv][1] + 12);
            ctx.lineTo(px[i], BASE - hp[i] - 6);
            ctx.stroke();
        }
    },

    // Text dins del canvas.
    txt(ctx, str, x, y, size) {
        try {
            ctx.font = size + 'px ' + FONT;
            ctx.fillText(str, x, y);
        } catch (e) { console.info('fillText: ' + e); }
    },

    // Lliscar el dit: seccio seguent (swipe cap a l'esquerra) o anterior (cap a la dreta). Amb un petit marge perque no es
    // repeteixi si l'esdeveniment arriba dues vegades (element i pare).
    tSwipe(e) {
        if (!this.showPage || this.showMenu || !e) { return; }
        var d = e.direction === 'left' ? 1 : (e.direction === 'right' ? -1 : 0);
        if (!d) { return; }
        var now = Date.now();
        if (this.swT && now - this.swT < 300) { return; }
        this.swT = now;
        var s = SECT[this.zoom];
        this.page = (this.page + d + s) % s;
        this.setHeader();
        this.updateMarker();
        this.drawPage();
    },

    // ---------------------------------------------------------------- menu

    openMenu() {
        this.menuMsg = "";
        this.showMenu = true;
    },

    closeMenu() {
        this.showMenu = false;
        // Si toca una seccio, el canvas es torna a crear: es dibuixa quan ja existeix.
        if (this.showPage) { this.drawSoon(0); this.updateMarker(); }
    },

    toggleTheme() { this.setTheme(!this.dark); this.save('th', this.dark ? '1' : '0'); },

    // Tots els colors depenen d'aquest tema (dades lligades a l'HML).
    setTheme(dark) {
        this.dark = dark;
        this.bg = dark ? "#000000" : "#ffffff";
        this.fg = dark ? "#ffffff" : "#000000";
        this.sub = dark ? "#999999" : "#666666";
        this.itemBg = dark ? "#222222" : "#dddddd";
        // Si el fons es recupera despres de dibuixar (en tornar de segon pla), redibuixa amb els colors bons.
        if (this.showPage && !this.showMenu) { this.drawSoon(0); }
    },

    // Zoom: 1x (4 seccions) -> 2x (8) -> 4x (16) -> 1x. Es queda a la seccio que conte el centre de l'actual.
    nextZoom() { this.setZoom((this.zoom + 1) % SECT.length); this.save('zm', String(this.zoom)); },

    setZoom(z) {
        var center = this.page * (360 / SECT[this.zoom]);
        this.zoom = z;
        this.page = this.sectorOf(center);
        this.zoomText = "Zoom: " + ["1x", "2x", "4x"][z];
        if (this.nearList) { this.setHeader(); }
    },

    // Torna a demanar la posicio i l'altura (una sola lectura de GPS) i recalcula.
    refreshPosition() {
        var self = this;
        if (this.updating) { return; }
        this.updating = true;
        this.menuMsg = "Cercant posició...";
        var done = function(data) {
            self.updating = false;
            self.onFix(data);
            self.closeMenu();
        };
        if (MOCK && MOCK.lat2) {
            setTimeout(function() { done({ latitude: MOCK.lat2, longitude: MOCK.lon2, altitude: MOCK.alt2 }); }, 1500);
            return;
        }
        try {
            geolocation.getLocation({
                timeout: 30000,
                coordType: 'wgs84',
                success: done,
                fail: function(data, code) {
                    self.updating = false;
                    self.menuMsg = "No s'ha pogut (ERR " + code + ")";
                }
            });
        } catch (e) {
            this.updating = false;
            this.menuMsg = "GPS no disponible";
        }
    },

    // ---------------------------------------------------------------- simulador

    // Sense sensors: posicio i rumb falsos; MOCK.swipes fa un swipe cada mig segon; MOCK.lat2 obre el menu i canvia de posicio.
    startMock() {
        var self = this;
        if (MOCK.zoom) { this.setZoom(MOCK.zoom); }
        this.restoring = false;
        this.onFix({ latitude: MOCK.lat, longitude: MOCK.lon, altitude: MOCK.alt });
        this.heading = undefined;
        this.onHeading(MOCK.start || 0);
        if (MOCK.page !== undefined) { this.page = MOCK.page; this.setHeader(); this.drawSoon(0); this.updateMarker(); }
        if (MOCK.swipes) { this.mockTimer = setInterval(function() { self.swT = 0; self.tSwipe({ direction: 'left' }); }, 700); }
        if (MOCK.lat2) {
            setTimeout(function() { self.openMenu(); }, 5000);
            setTimeout(function() { self.refreshPosition(); }, 8000);
        }
    }
};
