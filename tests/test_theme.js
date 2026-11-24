// Vigila el canvi de fons negre/blanc i les dades lligades a l'HML sense haver de provar-ho al rellotge.
// Us: node tests/test_theme.js
//  - cap color de fons ni de text a l'CSS (tot ve de dades del tema), amb l'excepcio de .err;
//  - cada <text> te el seu color lligat a dades i cada contenidor el seu fons;
//  - tot el que l'HML llegeix ({{...}}) i tots els controladors (onclick, onswipe...) existeixen a la pagina;
//  - amb el tema negre i amb el blanc, el color del text i el del fons mai son el mateix.
var fs = require('fs'), assert = require('assert'), path = require('path');
var dir = path.join(__dirname, '../entry/src/main/js/MainAbility/pages/index/');
var hml = fs.readFileSync(dir + 'index.hml', 'utf8').replace(/<!--[\s\S]*?-->/g, '');
var css = fs.readFileSync(dir + 'index.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
var src = fs.readFileSync(dir + 'index.js', 'utf8');

// Dades i metodes de la pagina
var page = new Function(src.replace(/^import .*$/gm, '').replace('export default {', 'var PAGE = {') + '\nreturn PAGE;')();
var data = page.data;

// 1. CSS sense colors (excepte .err)
css.split('}').forEach(function (rule) {
    var sel = rule.split('{')[0].trim(), body = rule.split('{')[1] || '';
    if (!sel) { return; }
    assert(!/background-color/.test(body), 'color de fons fix a ' + sel);
    if (sel !== '.err') { assert(!/(^|[;\s])color\s*:/.test(body), 'color de text fix a ' + sel); }
});

// 2. Cada <text> i cada contenidor tenen el color lligat
var tags = hml.match(/<(text|div|canvas)\b[^>]*>/g) || [];
var texts = 0, boxes = 0;
tags.forEach(function (tag) {
    var cls = (tag.match(/class="([^"]*)"/) || [, ''])[1], style = (tag.match(/style="([^"]*)"/) || [, ''])[1];
    if (/^<text/.test(tag)) {
        texts++;
        if (cls !== 'err') { assert(/(^|;|\s)color:\s*\{\{\w+\}\}/.test(style), 'text sense color lligat: ' + tag); }
    } else if (/\b(root|col|menu-item|relief|mk)\b/.test(cls)) {
        boxes++;
        assert(/background-color:\s*\{\{\w+\}\}/.test(style), 'contenidor sense fons lligat: ' + tag);
    }
});
assert(texts > 20 && boxes >= 8, 'ha trobat ' + texts + ' textos i ' + boxes + ' contenidors');

// 3. Tot el que es llegeix existeix
var used = {};
(hml.match(/\{\{[^}]+\}\}/g) || []).forEach(function (e) {
    (e.replace(/'[^']*'/g, '').match(/[A-Za-z_]\w*/g) || []).forEach(function (id) { used[id] = true; });
});
Object.keys(used).forEach(function (id) { assert(id in data, "l'HML llegeix {{" + id + "}} i no es a data"); });
(hml.match(/\bon\w+="(\w+)"/g) || []).forEach(function (h) {
    var name = h.match(/"(\w+)"/)[1];
    assert(typeof page[name] === 'function', 'controlador inexistent: ' + name);
});
// totes les dades que es lliguen a style existeixen i son colors o mides
['bg', 'fg', 'sub', 'itemBg', 'mc'].forEach(function (k) { assert(/^#[0-9a-f]{6}$/i.test(data[k]), 'color invalid a data.' + k); });
['mx', 'my'].forEach(function (k) { assert(typeof data[k] === 'number'); });

// 4. Contrast dels dos temes (a data i a setTheme)
var inst = Object.create(page);
Object.keys(data).forEach(function (k) { inst[k] = data[k]; });
inst.showPage = false;
[false, true].forEach(function (dark) {
    inst.setTheme(dark);
    assert.notStrictEqual(inst.bg, inst.fg, 'fons i text iguals amb dark=' + dark);
    assert.notStrictEqual(inst.bg, inst.sub, 'fons i text secundari iguals amb dark=' + dark);
    assert.notStrictEqual(inst.bg, inst.itemBg, 'fons i botons iguals amb dark=' + dark);
    assert.notStrictEqual(inst.itemBg, inst.fg, 'botons i text iguals amb dark=' + dark);
});
inst.setTheme(true);
assert.deepStrictEqual([inst.bg, inst.fg, inst.sub, inst.itemBg], [data.bg, data.fg, data.sub, data.itemBg], 'el tema negre es el de data');

console.log('ok  tema: ' + texts + ' textos i ' + boxes + ' contenidors amb color lligat, ' + Object.keys(used).length + ' dades llegides, cap color fix a l\'CSS');
