import geolocation from '@system.geolocation';
import sensor from '@system.sensor';
import storage from '@system.storage';
import geo from '../../common/geo.js';
import peaks from '../../common/peaks.js';

// DIAGNOSTIC del GT 6: cada boto fa UNA sola cosa (brujola, GPS, calcul, desat, llista, canvas de diverses mides, estres) i en
// mostra el resultat i el temps. Si el rellotge peta, l'ultim boto premut es el culpable. Per fer-lo servir, copia aquests
// tres fitxers (index.js, index.hml, index.css) sobre els de entry/src/main/js/MainAbility/pages/index/ i compila.

var LLEIDA = { latitude: 41.6118, longitude: 0.6192, altitude: 160 };

export default {
    data: {
        view: 'menu',
        res: 'Toca una prova',
        cw: 466,
        ch: 160,
        cx: 0,
        n0: '', n1: '', n2: '', n3: '', n4: '', n5: '', n6: '', n7: '', n8: '', n9: ''
    },

    // El resultat queda escrit a la capcalera; mostra tambe el temps en ms.
    done(msg, t0) { this.res = msg + ' (' + (Date.now() - t0) + ' ms)'; },

    pos() { return this.fix || LLEIDA; },

    compute() {
        var p = this.pos();
        this.near = geo.nearby(peaks, p.latitude, p.longitude, p.altitude || 0, 150000);
        this.picks = geo.pick(this.near, 10, 3);
        this.sk = geo.skyline(this.picks, 0.6);
    },

    // 1. Brujola: 4 lectures i s'apaga
    t1() {
        var self = this, t0 = Date.now(), n = 0;
        this.res = 'Brúixola...';
        try {
            sensor.subscribeCompass({
                success: function(ret) {
                    n++;
                    if (n === 4) {
                        try { sensor.unsubscribeCompass(); } catch (e) { console.info('unsub: ' + e); }
                        self.done('Brúixola OK ' + Math.round(ret.direction) + '°', t0);
                    }
                },
                fail: function(d, c) { self.res = 'Brúixola ERR ' + c; }
            });
        } catch (e) { this.res = 'Brúixola: ' + e; }
    },

    // 2. GPS: una lectura
    t2() {
        var self = this, t0 = Date.now();
        this.res = 'GPS... (fins a 30 s)';
        try {
            geolocation.getLocation({
                timeout: 30000,
                coordType: 'wgs84',
                success: function(d) { self.fix = d; self.done('GPS OK ' + d.latitude.toFixed(3) + ',' + d.longitude.toFixed(3) + ' alt ' + Math.round(d.altitude), t0); },
                fail: function(d, c) { self.res = 'GPS ERR ' + c; }
            });
        } catch (e) { this.res = 'GPS: ' + e; }
    },

    // 3. Calcul de cims i silueta (sense dibuixar)
    t3() {
        var t0 = Date.now();
        try { this.compute(); this.done('Càlcul OK ' + this.near.length + ' cims, ' + this.picks.length + ' triats', t0); } catch (e) { this.res = 'Càlcul: ' + e; }
    },

    // 4. Desar i llegir
    t4() {
        var self = this, t0 = Date.now();
        try {
            storage.set({ key: 'dg', value: '41.6118,0.6192,160', success: function() {}, fail: function() {} });
            storage.get({ key: 'dg', success: function(v) { self.done('Desat OK ' + v, t0); }, fail: function() { self.res = 'Desat: no es pot llegir'; } });
        } catch (e) { this.res = 'Desat: ' + e; }
    },

    // 5. Llista de text (10 files) sense canvas
    t5() {
        var t0 = Date.now();
        try {
            if (!this.picks) { this.compute(); }
            for (var i = 0; i < 10; i++) {
                var t = this.picks[i];
                this['n' + i] = t ? t.name.split(' / ')[0] + ' ' + t.ele + ' m' : '';
            }
            this.view = 'list';
            this.res = 'Llista OK (' + (Date.now() - t0) + ' ms). Toca el títol per tornar';
        } catch (e) { this.res = 'Llista: ' + e; }
    },

    // 6-9. Canvas buit amb silueta i text, de diferents mides
    c1() { this.openCanvas(466, 100); },
    c2() { this.openCanvas(466, 160); },
    c3() { this.openCanvas(466, 240); },
    c4() { this.openCanvas(700, 280); },

    openCanvas(w, h) {
        var self = this;
        this.cw = w;
        this.ch = h;
        this.cx = 0;
        this.view = 'canvas';
        this.res = 'Canvas ' + w + 'x' + h + ' creat';
        setTimeout(function() { self.draw(true); }, 300);
    },

    // Una passada de dibuix: fons, silueta de 59 punts i 5 textos.
    draw(report) {
        var t0 = Date.now();
        try {
            var el = this.$refs && this.$refs.c;
            if (!el) { this.res = 'Canvas: no existeix'; return; }
            if (!this.sk) { this.compute(); }
            var ctx = el.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, this.cw, this.ch);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (var x = 0; x <= this.cw; x += 8) {
                var y = this.ch - 10 - this.sk[Math.floor(x / this.cw * 359)] * 5;
                if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            }
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px HarmonyOS Sans';
            for (var i = 0; i < 5; i++) { ctx.fillText('Cim ' + i + ' 3404 m', 10 + i * 90, 30 + (i % 2) * 24); }
            if (report) { this.done('Canvas ' + this.cw + 'x' + this.ch + ' dibuixat OK', t0); }
            this.last = Date.now() - t0;
        } catch (e) { this.res = 'Canvas: ' + e; }
    },

    // 10. Estres: 30 redibuixos seguits del canvas 466x160
    t10() {
        var self = this, n = 0, sum = 0;
        this.openCanvas(466, 160);
        setTimeout(function() {
            var id = setInterval(function() {
                self.draw(false);
                sum += self.last || 0;
                n++;
                if (n >= 30) {
                    clearInterval(id);
                    self.res = 'Estrès OK: 30 dibuixos, mitjana ' + Math.round(sum / 30) + ' ms';
                }
            }, 100);
        }, 600);
    },

    // 11. Moure el canvas ample 30 cops (com arrossegar)
    t11() {
        var self = this, n = 0;
        this.openCanvas(700, 280);
        setTimeout(function() {
            var id = setInterval(function() {
                n++;
                self.cx = -(n % 2) * 100;
                if (n >= 30) { clearInterval(id); self.res = 'Moure OK: 30 desplaçaments'; self.cx = 0; }
            }, 100);
        }, 600);
    },

    back() { this.view = 'menu'; }
};
