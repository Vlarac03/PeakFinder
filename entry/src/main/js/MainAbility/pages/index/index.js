import geolocation from '@system.geolocation';
import sensor from '@system.sensor';
import brightness from '@system.brightness';

// Prototip de prova (v0.1.0): nomes llegeix i mostra GPS, bruixola i barometre.
// L'objectiu es veure quins sensors exposa el GT 6 a una app de tercers i amb quins errors.
export default {
    data: {
        headingText: "---°",
        cardinal: "",
        compassStatus: "esperant",
        compassOk: false,

        latText: "lat: ---",
        lonText: "lon: ---",
        altText: "alt GPS: ---",
        gpsStatus: "esperant",
        gpsOk: false,

        baroText: "pressio: ---",
        baroStatus: "esperant",
        baroOk: false
    },

    onInit() {
        brightness.setKeepScreenOn({ keepScreenOn: true, success: function() {}, fail: function() {} });
    },

    onShow() {
        this.startCompass();
        this.startGps();
        this.startBaro();
    },

    onHide() {
        this.stopAll();
    },

    onDestroy() {
        this.stopAll();
    },

    stopAll() {
        try { sensor.unsubscribeCompass(); } catch (e) { console.info('unsubscribeCompass: ' + e); }
        try { sensor.unsubscribeBarometer(); } catch (e) { console.info('unsubscribeBarometer: ' + e); }
        try { geolocation.unsubscribe(); } catch (e) { console.info('unsubscribe gps: ' + e); }
    },

    cardinalOf(deg) {
        var names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        return names[Math.round(deg / 45) % 8];
    },

    startCompass() {
        var self = this;
        try {
            sensor.subscribeCompass({
                success: function(ret) {
                    var d = ret.direction;
                    self.headingText = Math.round(d) + "°";
                    self.cardinal = self.cardinalOf(d);
                    self.compassStatus = "OK (magnetic)";
                    self.compassOk = true;
                },
                fail: function(data, code) {
                    self.compassStatus = "ERR " + code + " " + data;
                    self.compassOk = false;
                    console.info('compass fail: ' + code + ' ' + data);
                }
            });
        } catch (e) {
            this.compassStatus = "no disponible: " + e;
            this.compassOk = false;
        }
    },

    startGps() {
        var self = this;
        try {
            geolocation.subscribe({
                coordType: 'wgs84',
                success: function(data) {
                    self.latText = "lat: " + data.latitude.toFixed(5);
                    self.lonText = "lon: " + data.longitude.toFixed(5);
                    self.altText = "alt GPS: " + Math.round(data.altitude) + " m  ±" + Math.round(data.accuracy) + " m";
                    self.gpsStatus = "OK";
                    self.gpsOk = true;
                },
                fail: function(data, code) {
                    self.gpsStatus = "ERR " + code + " " + data;
                    self.gpsOk = false;
                    console.info('gps fail: ' + code + ' ' + data);
                }
            });
        } catch (e) {
            this.gpsStatus = "no disponible: " + e;
            this.gpsOk = false;
        }
    },

    startBaro() {
        var self = this;
        try {
            sensor.subscribeBarometer({
                success: function(ret) {
                    var p = ret.pressure;
                    // Altitud estandard a partir de la pressio (nomes orientativa, sense calibrar).
                    var alt = 44330 * (1 - Math.pow(p / 1013.25, 0.1903));
                    self.baroText = Math.round(p) + " hPa  ~" + Math.round(alt) + " m";
                    self.baroStatus = "OK";
                    self.baroOk = true;
                },
                fail: function(data, code) {
                    self.baroStatus = "ERR " + code + " " + data;
                    self.baroOk = false;
                    console.info('baro fail: ' + code + ' ' + data);
                }
            });
        } catch (e) {
            this.baroStatus = "no disponible: " + e;
            this.baroOk = false;
        }
    }
};
