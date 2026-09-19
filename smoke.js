/* Tests de FIREcomendations.
   npm i jsdom   (una vez)
   node smoke.js

   A) FRONTEND — index.html en jsdom con el backend simulado.
   B) CONTRATO — las funciones REALES de apps-script.gs contra un Sheet simulado.
      Es el bloque que más vale: front y backend pueden estar bien por separado
      y aun así no entenderse. */

const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const now = Date.now();
const iso = ms => new Date(ms).toISOString();

let pasan = 0, fallan = 0;
const ok = (n, c, extra) => c ? pasan++ : (fallan++, console.log('  ✗ ' + n + (extra !== undefined ? ' → ' + extra : '')));

const DATA = {
  ok: true,
  usuarios: [
    { username: 'nico', nombre: 'Nico', color: '#FF8A80', avatar: '', admin: 'TRUE', activo: 'TRUE', fav_pelicula: 'Pizza, birra, faso', fav_frase: 'Que la fuerza te acompañe' },
    { username: 'ana', nombre: 'Ana', color: '#6BA4FF', avatar: '', admin: '', activo: 'TRUE' },
    { username: 'leo', nombre: 'Leo', color: '#B99AE6', avatar: '', admin: '', activo: 'TRUE' },
    { username: 'sol', nombre: 'Sol', color: '#FFC857', avatar: '', admin: '', activo: 'TRUE' },
  ],
  recomendaciones: [
    { id: 'r1', timestamp: iso(now - 2 * 3600e3), autor: 'ana', categoria: 'peliculas', titulo: 'Peli de Ana', dirigido_a: 'nico', estado_enriquecimiento: 'ok' },
    { id: 'r2', timestamp: iso(now - 30 * 24 * 3600e3), autor: 'ana', categoria: 'series', titulo: 'Serie vieja', estado_enriquecimiento: 'ok' },
    { id: 'r3', timestamp: iso(now - 3 * 24 * 3600e3), autor: 'nico', categoria: 'musica', subcategoria: 'cancion', titulo: 'Tema mio', estado_enriquecimiento: 'ok' },
    { id: 'r4', timestamp: iso(now - 5 * 24 * 3600e3), autor: 'ana', categoria: 'peliculas', titulo: 'Peli en el Plex', estado_enriquecimiento: 'ok', robflix: 'TRUE' },
    { id: 'r5', timestamp: iso(now - 6 * 24 * 3600e3), autor: 'leo', categoria: 'peliculas', titulo: 'Peli de Leo', estado_enriquecimiento: 'ok' },
    { id: 'r6', timestamp: iso(now - 8 * 24 * 3600e3), autor: 'nico', categoria: 'peliculas', titulo: 'Peli de Nico', estado_enriquecimiento: 'ok' },
  ],
  valoraciones: [], reacciones: [], consumido: [], intereses: [],
  colecciones: [
    { id: 'c1', titulo: 'Pelis argentinas', categoria: 'peliculas', creador: 'ana', estado: 'abierta', timestamp: iso(now - 4 * 24 * 3600e3), ganadora_rec_id: '', cerrada_timestamp: '' },
    { id: 'c2', titulo: 'Pelis de terror', categoria: 'peliculas', creador: 'nico', estado: 'abierta', timestamp: iso(now - 9 * 24 * 3600e3), ganadora_rec_id: '', cerrada_timestamp: '' },
    { id: 'c3', titulo: 'Series noventeras', categoria: 'series', creador: 'leo', estado: 'cerrada', timestamp: iso(now - 40 * 24 * 3600e3), ganadora_rec_id: 'r2', cerrada_timestamp: iso(now - 20 * 24 * 3600e3) },
  ],
  coleccionItems: [
    { id: 'i1', coleccion_id: 'c1', rec_id: 'r1', usuario: 'ana', timestamp: iso(now - 4 * 24 * 3600e3) },
    { id: 'i2', coleccion_id: 'c1', rec_id: 'r5', usuario: 'leo', timestamp: iso(now - 3 * 24 * 3600e3) },
    { id: 'i3', coleccion_id: 'c2', rec_id: 'r4', usuario: 'ana', timestamp: iso(now - 9 * 24 * 3600e3) },
    { id: 'i4', coleccion_id: 'c2', rec_id: 'r5', usuario: 'leo', timestamp: iso(now - 9 * 24 * 3600e3) },
    { id: 'i5', coleccion_id: 'c2', rec_id: 'r6', usuario: 'nico', timestamp: iso(now - 8 * 24 * 3600e3) },
    { id: 'i6', coleccion_id: 'c3', rec_id: 'r2', usuario: 'ana', timestamp: iso(now - 40 * 24 * 3600e3) },
  ],
  coleccionVotos: [],
};

const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
  runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true,
  beforeParse(w) {
    w.__calls = [];
    w.fetch = (url) => {
      w.__calls.push(String(url));
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(DATA)) });
    };
    w.scrollTo = () => {};
    w.open = () => {};
    Object.defineProperty(w.navigator, 'serviceWorker', { value: undefined, configurable: true });
    w.localStorage.setItem('br_user', 'nico');
  },
});
const w = dom.window, d = w.document;
const espera = ms => new Promise(r => setTimeout(r, ms));
const ir = async (hash, ms = 180) => { w.location.hash = hash; await espera(ms); };
const txt = id => (d.getElementById(id) || { textContent: '' }).textContent;

(async () => {
  await espera(600);

  /* ---------- arranque ---------- */
  ok('el splash se fue', !d.getElementById('splash') || d.getElementById('splash').classList.contains('hide'));
  ok('saluda al usuario', txt('userName') === 'Nico', txt('userName'));
  ok('hay botón de actualizar', !!d.getElementById('homeRefresh'));

  const navScreens = [...d.querySelectorAll('.nav-item')].map(a => a.dataset.screen);
  ok('el nav tiene colecciones', navScreens.includes('colecciones'), navScreens.join(','));
  ok('el nav ya no tiene repertorios', !navScreens.includes('repertorios'));

  /* ---------- novedades ---------- */
  // Ajenas y de menos de 7 días: r1 (Ana), r4 (Ana), r5 (Leo). r6 es mía, r2 es vieja.
  ok('campana cuenta 3 recs nuevas ajenas', txt('bellDot') === '3', txt('bellDot'));
  await ir('#/novedades');
  ok('novedades no lista lo de hace 30 días', !txt('novedadesList').includes('Serie vieja'));
  await espera(80);
  ok('al abrir novedades se apaga la campana', d.getElementById('bellDot').style.display === 'none');

  /* ---------- robflix ---------- */
  ok('isRobflix lee TRUE', w.isRobflix({ categoria: 'peliculas', robflix: 'TRUE' }));
  ok('isRobflix ignora series', !w.isRobflix({ categoria: 'series', robflix: 'TRUE' }));
  await ir('#/rec/r4');
  ok('toggle de robflix en la peli', !!d.getElementById('robflixToggle'));
  await ir('#/rec/r3');
  ok('sin toggle en música', !d.getElementById('robflixToggle'));

  /* ---------- colecciones: estados ---------- */
  ok('c1 está abierta (2 recs)', w.estadoColeccion(DATA.colecciones[0]) === 'abierta');
  ok('c2 está en votación (3 recs)', w.estadoColeccion(DATA.colecciones[1]) === 'votacion');
  ok('c3 está cerrada', w.estadoColeccion(DATA.colecciones[2]) === 'cerrada');

  await ir('#/colecciones');
  const lista = txt('coleccionesContent');
  ok('lista las tres colecciones', lista.includes('Pelis argentinas') && lista.includes('Pelis de terror') && lista.includes('Series noventeras'));
  ok('hay tabla de puntos', lista.includes('Colecciones ganadas'));
  ok('el punto va a Ana (propuso la ganadora de c3)', w.tablaPuntos()[0].username === 'ana', JSON.stringify(w.tablaPuntos()[0]));
  ok('botón de nueva colección', !!d.getElementById('nuevaColeccionBtn'));

  /* ---------- pendientes / punto del nav ---------- */
  const pend = w.coleccionesPendientes().map(c => c.id);
  ok('c1 pendiente (no puse la mía)', pend.includes('c1'), pend.join(','));
  ok('c2 pendiente (puse rec, falta votar)', pend.includes('c2'));
  ok('c3 no pendiente (cerrada)', !pend.includes('c3'));
  ok('el punto del nav está encendido', d.getElementById('navDot').style.display === 'block');

  /* ---------- detalle: abierta ---------- */
  await ir('#/coleccion/c1');
  const c1 = txt('coleccionContent');
  ok('c1 dice cuántas faltan', c1.includes('Falta'), c1.slice(0, 70));
  ok('c1 no deja votar todavía', !d.querySelector('#coleccionContent [data-votar]'));
  ok('c1 ofrece poner la mía', c1.includes('Poner mi recomendación'));
  ok('c1 tiene botón de WhatsApp', !!d.querySelector('#coleccionContent [data-wa]'));

  /* ---------- detalle: votación ---------- */
  await ir('#/coleccion/c2');
  const c2 = txt('coleccionContent');
  ok('c2 invita a votar', c2.includes('Ya podés votar'), c2.slice(0, 70));
  const votables = [...d.querySelectorAll('#coleccionContent [data-votar]')].map(e => e.dataset.votar);
  ok('hay 2 opciones votables', votables.length === 2, votables.join(','));
  ok('mi propia rec no es votable', !votables.includes('r6'));
  ok('con 0 votos no se ve el marcador', !d.querySelector('#coleccionContent .opt-votes'));

  // Sin await: el repintado optimista tiene que ser síncrono, antes de tocar la red.
  d.querySelector('#coleccionContent [data-votar="r4"]').dispatchEvent(new w.Event('click', { bubbles: true }));
  ok('el voto se pinta al instante, sin esperar al backend', txt('coleccionContent').includes('Tu voto'));
  await espera(80);
  ok('llama a voteColeccion', w.__calls.some(u => u.includes('action=voteColeccion')));

  /* ---------- colecciones dentro de la categoría ---------- */
  await ir('#/categoria/series');
  ok('la cerrada aparece en su categoría', txt('catList').includes('Series noventeras'));
  await ir('#/categoria/musica');
  ok('no aparece en otra categoría', !txt('catList').includes('Series noventeras'));

  /* ---------- favoritos ---------- */
  await ir('#/perfil');
  ok('el perfil muestra mis cosas', txt('perfilContent').includes('Mis cosas'));
  ok('muestra la peli favorita', txt('perfilContent').includes('Pizza, birra, faso'));
  ok('la frase va entrecomillada', txt('perfilContent').includes('“Que la fuerza te acompañe”'));
  ok('hay botón de editar', !!d.getElementById('editFavsBtn'));
  d.getElementById('editFavsBtn').dispatchEvent(new w.Event('click', { bubbles: true }));
  await espera(60);
  ok('el modal trae el valor actual', d.getElementById('fav_fav_pelicula').value === 'Pizza, birra, faso');
  d.getElementById('modalClose').dispatchEvent(new w.Event('click', { bubbles: true }));

  await ir('#/bromendator/ana');
  ok('Ana sin favoritos: no se pinta la tarjeta', !txt('bromendatorContent').includes('Mis cosas'));
  await ir('#/bromendator/nico');
  ok('en la ficha de Nico sí se ven', txt('bromendatorContent').includes('Pizza, birra, faso'));
  ok('sin botón de editar en ficha ajena', !d.querySelector('#bromendatorContent #editFavsBtn'));

  /* ---------- ruta muerta ---------- */
  await ir('#/repertorios');
  ok('ruta vieja de repertorios va al inicio', d.getElementById('screen-home').classList.contains('active'));

  contrato();
})();

/* ═════════════════ B) CONTRATO ═════════════════ */

function hojaFalsa(headers, filas) {
  const rows = [headers.slice()].concat((filas || []).map(f => headers.map(h => (f[h] === undefined ? '' : f[h]))));
  const sh = {
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0].length,
    appendRow: r => { rows.push(r.slice()); return sh; },
    deleteRow: i => { rows.splice(i - 1, 1); return sh; },
    getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        const out = [];
        for (let i = 0; i < (nr || 1); i++) {
          const fila = rows[r - 1 + i] || [], trozo = [];
          for (let j = 0; j < (nc || 1); j++) trozo.push(fila[c - 1 + j] === undefined ? '' : fila[c - 1 + j]);
          out.push(trozo);
        }
        return out;
      },
      setValue: v => { if (!rows[r - 1]) rows[r - 1] = []; rows[r - 1][c - 1] = v; return sh; },
      setValues: v => {
        v.forEach((fila, i) => {
          if (!rows[r - 1 + i]) rows[r - 1 + i] = [];
          fila.forEach((val, j) => { rows[r - 1 + i][c - 1 + j] = val; });
        });
        return sh;
      },
    }),
    _rows: rows,
  };
  return sh;
}

function contrato() {
  const iso2 = ms => new Date(ms).toISOString();
  const n = Date.now();

  const hojas = {
    /* A propósito en un orden DISTINTO al que usa el código: si algo escribe por
       posición en vez de por nombre de cabecera, aquí salta. */
    Recomendaciones: hojaFalsa(
      ['id', 'autor', 'titulo', 'timestamp', 'categoria', 'subcategoria', 'comentario_autor', 'estado_enriquecimiento', 'dirigido_a', 'robflix'],
      [{ id: 'r4', autor: 'ana', titulo: 'Peli en el Plex', categoria: 'peliculas', robflix: 'TRUE' },
       { id: 'r5', autor: 'leo', titulo: 'Peli de Leo', categoria: 'peliculas' },
       { id: 'r6', autor: 'nico', titulo: 'Peli de Nico', categoria: 'peliculas' }]),
    Valoraciones: hojaFalsa(['id', 'recomendacion_id', 'usuario', 'estrellas', 'comentario', 'timestamp']),
    Reacciones: hojaFalsa(['id', 'recomendacion_id', 'usuario', 'tipo', 'timestamp']),
    Consumido: hojaFalsa(['id', 'recomendacion_id', 'usuario', 'timestamp']),
    Usuarios: hojaFalsa(['username', 'nombre', 'color', 'avatar', 'admin', 'activo', 'fav_pelicula', 'fav_frase'],
      [{ username: 'nico', nombre: 'Nico', admin: 'TRUE', activo: 'TRUE' },
       { username: 'ana', nombre: 'Ana', activo: 'TRUE' },
       { username: 'leo', nombre: 'Leo', activo: 'TRUE' },
       { username: 'sol', nombre: 'Sol', activo: 'TRUE' }]),
    Intereses: hojaFalsa(['id', 'recomendacion_id', 'usuario', 'timestamp']),
    Colecciones: hojaFalsa(['id', 'titulo', 'categoria', 'creador', 'estado', 'timestamp', 'ganadora_rec_id', 'cerrada_timestamp'],
      [{ id: 'c2', titulo: 'Pelis de terror', categoria: 'peliculas', creador: 'nico', estado: 'abierta', timestamp: iso2(n - 2 * 3600e3) }]),
    ColeccionItems: hojaFalsa(['id', 'coleccion_id', 'rec_id', 'usuario', 'timestamp'],
      [{ id: 'i3', coleccion_id: 'c2', rec_id: 'r4', usuario: 'ana', timestamp: iso2(n - 2 * 3600e3) },
       { id: 'i4', coleccion_id: 'c2', rec_id: 'r5', usuario: 'leo', timestamp: iso2(n - 2 * 3600e3) },
       { id: 'i5', coleccion_id: 'c2', rec_id: 'r6', usuario: 'nico', timestamp: iso2(n - 2 * 3600e3) }]),
    ColeccionVotos: hojaFalsa(['id', 'coleccion_id', 'rec_id', 'usuario', 'timestamp']),
  };

  const ctx = {
    console,
    SpreadsheetApp: { openById: () => ({ getSheetByName: x => hojas[x] || null }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ setMimeType: () => ({ getContent: () => t }) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => true, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    UrlFetchApp: { fetch: () => { throw new Error('sin red en los tests'); } },
    Logger: { log: () => {} },
    Utilities: { getUuid: () => 'u' + Math.random().toString(36).slice(2, 10) },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script.gs', 'utf8'), ctx);
  const llamar = params => JSON.parse(ctx.doGet({ parameter: params }).getContent());

  ok('CONTRATO: ping responde', llamar({ action: 'ping' }).ok === true);
  ok('CONTRATO: acción inventada avisa', llamar({ action: 'noExiste' }).ok === false);

  /* createRec escribe por nombre de cabecera, no por posición */
  const cr = llamar({ action: 'createRec', autor: 'nico', categoria: 'peliculas', titulo: 'Nueva peli', comentario: 'buena', robflix: 'TRUE' });
  ok('CONTRATO: createRec ok', cr.ok === true, cr.error);
  const rowsR = hojas.Recomendaciones._rows, H = rowsR[0];
  const ultima = () => hojas.Recomendaciones._rows[hojas.Recomendaciones._rows.length - 1];
  const val = k => ultima()[H.indexOf(k)];
  ok('CONTRATO: el id va en su columna', String(val('id')).indexOf('rec_') === 0, val('id'));
  ok('CONTRATO: el autor va en su columna', val('autor') === 'nico', val('autor'));
  ok('CONTRATO: el título va en su columna', val('titulo') === 'Nueva peli', val('titulo'));
  ok('CONTRATO: robflix se guarda', val('robflix') === 'TRUE', val('robflix'));
  // El enriquecimiento corre justo después y mueve el estado; lo que se comprueba
  // aquí es que la columna se escribe por nombre, no que valga 'pendiente'.
  ok('CONTRATO: el estado se escribe en su columna', String(val('estado_enriquecimiento')).length > 0, val('estado_enriquecimiento'));

  llamar({ action: 'createRec', autor: 'nico', categoria: 'series', titulo: 'Serie', robflix: 'TRUE' });
  ok('CONTRATO: robflix se ignora en series', val('robflix') === '', val('robflix'));

  const sr = llamar({ action: 'setRobflix', recId: 'r5', valor: 'TRUE' });
  ok('CONTRATO: setRobflix ok', sr.ok === true, sr.error);
  const filaR5 = hojas.Recomendaciones._rows.find(x => x[H.indexOf('id')] === 'r5');
  ok('CONTRATO: r5 quedó marcada', filaR5[H.indexOf('robflix')] === 'TRUE');

  /* Votación */
  const vSinRec = llamar({ action: 'voteColeccion', coleccionId: 'c2', recId: 'r4', usuario: 'sol' });
  ok('CONTRATO: sin proponer no se vota', vSinRec.ok === false && /recomendación primero/i.test(vSinRec.error), vSinRec.error);

  const vAuto = llamar({ action: 'voteColeccion', coleccionId: 'c2', recId: 'r6', usuario: 'nico' });
  ok('CONTRATO: no se puede votar a uno mismo', vAuto.ok === false && /vos mismo/i.test(vAuto.error), vAuto.error);

  ok('CONTRATO: voto de nico ok', llamar({ action: 'voteColeccion', coleccionId: 'c2', recId: 'r4', usuario: 'nico' }).ok);
  ok('CONTRATO: voto de ana ok', llamar({ action: 'voteColeccion', coleccionId: 'c2', recId: 'r5', usuario: 'ana' }).ok);
  const v3 = llamar({ action: 'voteColeccion', coleccionId: 'c2', recId: 'r4', usuario: 'leo' });
  ok('CONTRATO: con 3 de 4 votos NO cierra', v3.ok === true && v3.cerrada === false, JSON.stringify(v3));

  const antes = hojas.ColeccionVotos._rows.length;
  llamar({ action: 'voteColeccion', coleccionId: 'c2', recId: 'r5', usuario: 'leo' });
  ok('CONTRATO: cambiar el voto no duplica filas', hojas.ColeccionVotos._rows.length === antes, hojas.ColeccionVotos._rows.length + ' vs ' + antes);
  llamar({ action: 'voteColeccion', coleccionId: 'c2', recId: 'r4', usuario: 'leo' });

  const inexistente = llamar({ action: 'addToColeccion', coleccionId: 'c2', recId: 'rZZ', usuario: 'sol' });
  ok('CONTRATO: una rec que no existe falla limpio', inexistente.ok === false, inexistente.error);

  llamar({ action: 'createRec', autor: 'sol', categoria: 'peliculas', titulo: 'Peli de Sol' });
  const idSol = val('id');
  ok('CONTRATO: sol añade la suya', llamar({ action: 'addToColeccion', coleccionId: 'c2', recId: idSol, usuario: 'sol' }).ok);
  const vFinal = llamar({ action: 'voteColeccion', coleccionId: 'c2', recId: 'r4', usuario: 'sol' });
  ok('CONTRATO: con todos los votos cierra', vFinal.cerrada === true, JSON.stringify(vFinal));

  const HC = hojas.Colecciones._rows[0];
  const c2row = hojas.Colecciones._rows.find(x => x[HC.indexOf('id')] === 'c2');
  ok('CONTRATO: queda cerrada', c2row[HC.indexOf('estado')] === 'cerrada');
  ok('CONTRATO: guarda la ganadora', c2row[HC.indexOf('ganadora_rec_id')] === 'r4', c2row[HC.indexOf('ganadora_rec_id')]);
  ok('CONTRATO: guarda la fecha de cierre', String(c2row[HC.indexOf('cerrada_timestamp')]).length > 0);

  ok('CONTRATO: cerrada no admite votos', llamar({ action: 'voteColeccion', coleccionId: 'c2', recId: 'r5', usuario: 'ana' }).ok === false);
  ok('CONTRATO: cerrada no admite recs', llamar({ action: 'addToColeccion', coleccionId: 'c2', recId: 'r5', usuario: 'ana' }).ok === false);

  /* Empate */
  hojas.Colecciones.appendRow(['c9', 'Empatada', 'peliculas', 'nico', 'abierta', iso2(n), '', '']);
  hojas.ColeccionItems.appendRow(['i9a', 'c9', 'r4', 'ana', iso2(n)]);
  hojas.ColeccionItems.appendRow(['i9b', 'c9', 'r5', 'leo', iso2(n)]);
  hojas.ColeccionItems.appendRow(['i9c', 'c9', 'r6', 'nico', iso2(n)]);
  hojas.ColeccionItems.appendRow(['i9d', 'c9', idSol, 'sol', iso2(n)]);
  llamar({ action: 'voteColeccion', coleccionId: 'c9', recId: 'r4', usuario: 'nico' });
  llamar({ action: 'voteColeccion', coleccionId: 'c9', recId: 'r4', usuario: 'leo' });
  llamar({ action: 'voteColeccion', coleccionId: 'c9', recId: 'r5', usuario: 'ana' });
  const emp = llamar({ action: 'voteColeccion', coleccionId: 'c9', recId: 'r5', usuario: 'sol' });
  ok('CONTRATO: 2-2 con todos los votos NO cierra', emp.cerrada === false, JSON.stringify(emp));
  const c9 = hojas.Colecciones._rows.find(x => x[HC.indexOf('id')] === 'c9');
  ok('CONTRATO: la empatada sigue abierta', c9[HC.indexOf('estado')] !== 'cerrada');
  const des = llamar({ action: 'voteColeccion', coleccionId: 'c9', recId: 'r4', usuario: 'sol' });
  ok('CONTRATO: al desempatar cierra', des.cerrada === true, JSON.stringify(des));

  /* Una rec por persona */
  hojas.Colecciones.appendRow(['c8', 'Otra', 'peliculas', 'nico', 'abierta', iso2(n), '', '']);
  llamar({ action: 'addToColeccion', coleccionId: 'c8', recId: 'r6', usuario: 'nico' });
  llamar({ action: 'addToColeccion', coleccionId: 'c8', recId: 'r5', usuario: 'nico' });
  const misEnC8 = hojas.ColeccionItems._rows.filter(x => x[1] === 'c8' && x[3] === 'nico');
  ok('CONTRATO: una rec por persona (se sustituye)', misEnC8.length === 1, misEnC8.length);
  ok('CONTRATO: queda la nueva', misEnC8[0][2] === 'r5', misEnC8[0][2]);

  llamar({ action: 'createRec', autor: 'ana', categoria: 'series', titulo: 'Serie suelta' });
  const mix = llamar({ action: 'addToColeccion', coleccionId: 'c8', recId: val('id'), usuario: 'ana' });
  ok('CONTRATO: no entra una rec de otra categoría', mix.ok === false && /categoría/i.test(mix.error), mix.error);

  /* Borrado */
  ok('CONTRATO: no la borra quien no es creador', llamar({ action: 'deleteColeccion', id: 'c8', usuario: 'ana' }).ok === false);
  ok('CONTRATO: el creador sí la borra', llamar({ action: 'deleteColeccion', id: 'c8', usuario: 'nico' }).ok === true);
  ok('CONTRATO: se lleva sus items', hojas.ColeccionItems._rows.filter(x => x[1] === 'c8').length === 0);

  /* Perfil */
  const up = llamar({ action: 'updateProfile', username: 'nico', fav_pelicula: 'Pizza, birra, faso', fav_frase: 'Hasta la vista' });
  ok('CONTRATO: updateProfile ok', up.ok === true && up.campos === 2, JSON.stringify(up));
  const HU = hojas.Usuarios._rows[0];
  const filaNico = hojas.Usuarios._rows.find(x => x[HU.indexOf('username')] === 'nico');
  ok('CONTRATO: guarda la peli favorita', filaNico[HU.indexOf('fav_pelicula')] === 'Pizza, birra, faso');
  const up2 = llamar({ action: 'updateProfile', username: 'nico', fav_actor: 'Darín' });
  ok('CONTRATO: una columna que no existe no rompe', up2.ok === true && up2.campos === 0, JSON.stringify(up2));

  console.log('\n' + (fallan ? '✗' : '✓') + '  ' + pasan + ' pasan, ' + fallan + ' fallan');
  process.exit(fallan ? 1 : 0);
}
