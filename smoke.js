/* Test de humo de FIREcomendations con jsdom.
   node smoke.js   (npm i jsdom una vez) */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const now = Date.now();
const iso = ms => new Date(ms).toISOString();

const DATA = {
  ok: true,
  usuarios: [
    { username: 'nico', nombre: 'Nico', color: '#FF8A80', avatar: '', admin: 'TRUE', activo: 'TRUE' },
    { username: 'ana', nombre: 'Ana', color: '#6BA4FF', avatar: '', admin: '', activo: 'TRUE' },
  ],
  recomendaciones: [
    { id: 'r1', timestamp: iso(now - 2 * 3600e3), autor: 'ana', categoria: 'peliculas', titulo: 'Peli nueva', comentario_autor: 'buenísima', dirigido_a: 'nico', estado_enriquecimiento: 'ok', sinopsis: 'x', 'año': '2024' },
    { id: 'r2', timestamp: iso(now - 30 * 24 * 3600e3), autor: 'ana', categoria: 'series', titulo: 'Serie vieja', dirigido_a: 'nico', estado_enriquecimiento: 'ok' },
    { id: 'r3', timestamp: iso(now - 3 * 24 * 3600e3), autor: 'nico', categoria: 'musica', subcategoria: 'cancion', titulo: 'Tema mio', estado_enriquecimiento: 'ok' },
    { id: 'r4', timestamp: iso(now - 5 * 24 * 3600e3), autor: 'ana', categoria: 'peliculas', titulo: 'Peli en el Plex', estado_enriquecimiento: 'ok', robflix: 'TRUE' },
    { id: 'r5', timestamp: iso(now - 40 * 24 * 3600e3), autor: 'ana', categoria: 'series', titulo: 'Serie con robflix raro', estado_enriquecimiento: 'ok', robflix: 'TRUE' },
  ],
  valoraciones: [], reacciones: [], consumido: [], intereses: [],
};

let pasan = 0, fallan = 0;
const ok = (n, c, extra) => c ? pasan++ : (fallan++, console.log('  ✗ ' + n + (extra !== undefined ? ' → ' + extra : '')));

const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
  runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true,
  beforeParse(w) {
    w.__posts = [];
    w.fetch = (url) => {
      w.__posts.push(String(url));
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(DATA)) });
    };
    w.scrollTo = () => {};
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

  /* ---- arranque ---- */
  ok('el splash se fue', !d.getElementById('splash') || d.getElementById('splash').classList.contains('hide'));
  ok('saluda al usuario', txt('userName') === 'Nico', txt('userName'));
  ok('pinta el carrusel del home', d.getElementById('recsRow').children.length > 0);
  ok('la versión subió', w.APP_VERSION !== '0.1');

  /* ---- repertorios fuera ---- */
  const navScreens = [...d.querySelectorAll('.nav-item')].map(a => a.dataset.screen);
  ok('el nav ya no tiene repertorios', !navScreens.includes('repertorios'), navScreens.join(','));
  ok('el nav tiene novedades', navScreens.includes('novedades'));
  ok('la pantalla de repertorios no existe', !d.getElementById('screen-repertorios'));
  ok('hay botón de actualizar en el home', !!d.getElementById('homeRefresh'));

  /* ---- novedades: una sola regla ---- */
  ok('campana cuenta 2 (r1 y r4 de Ana)', txt('bellDot') === '2', txt('bellDot'));
  ok('campana visible', d.getElementById('bellDot').style.display === 'flex');
  ok('punto del nav visible', d.getElementById('navDot').style.display === 'block');
  ok('películas = 2', txt('cat-dot-peliculas') === '2', txt('cat-dot-peliculas'));
  ok('series (fuera de ventana) sin punto', d.getElementById('cat-dot-series').style.display === 'none');
  ok('música (mía) sin punto', d.getElementById('cat-dot-musica').style.display === 'none');

  await ir('#/novedades');
  const nov = txt('novedadesList');
  ok('la pantalla de novedades está activa', d.getElementById('screen-novedades').classList.contains('active'));
  ok('lista la peli nueva', nov.includes('Peli nueva'));
  ok('lista la mía de esta semana', nov.includes('Tema mio'));
  ok('no lista la de hace 30 días', !nov.includes('Serie vieja'));
  ok('tiene sección Para ti', nov.includes('Para ti'));
  await espera(80);
  ok('al abrir novedades se apaga la campana', d.getElementById('bellDot').style.display === 'none', d.getElementById('bellDot').style.display);
  ok('y el punto del nav', d.getElementById('navDot').style.display === 'none');

  /* ---- robflix ---- */
  ok('isRobflix lee TRUE', w.isRobflix({ categoria: 'peliculas', robflix: 'TRUE' }));
  ok('isRobflix lee booleano', w.isRobflix({ categoria: 'peliculas', robflix: true }));
  ok('isRobflix con vacío es false', !w.isRobflix({ categoria: 'peliculas', robflix: '' }));
  ok('isRobflix ignora las series', !w.isRobflix({ categoria: 'series', robflix: 'TRUE' }));

  await ir('#/rec/r4');
  ok('el detalle de la peli muestra el badge', txt('recDetailContent').includes('Robflix'));
  ok('hay toggle en el detalle', !!d.getElementById('robflixToggle'));
  ok('el toggle está marcado', d.getElementById('robflixToggle').getAttribute('aria-pressed') === 'true');

  // Desmarcar: optimista, se ve al instante
  d.getElementById('robflixToggle').dispatchEvent(new w.Event('click', { bubbles: true }));
  await espera(120);
  ok('al tocar se desmarca al instante', d.getElementById('robflixToggle').getAttribute('aria-pressed') === 'false');
  ok('llama a setRobflix', w.__posts.some(u => u.includes('action=setRobflix')), w.__posts.slice(-1)[0]);

  await ir('#/rec/r1');
  const tg = d.getElementById('robflixToggle');
  ok('peli sin robflix: toggle presente y apagado', tg && tg.getAttribute('aria-pressed') === 'false');

  await ir('#/rec/r3');
  ok('en música no hay toggle de Robflix', !d.getElementById('robflixToggle'));

  await ir('#/categoria/peliculas');
  ok('chip de Robflix en películas', !!d.getElementById('categoria-robflix-chip'));
  d.getElementById('categoria-robflix-chip').dispatchEvent(new w.Event('click', { bubbles: true }));
  await espera(80);
  const lista = txt('catList');
  ok('filtrando quedan solo las de Robflix', lista.includes('Peli en el Plex') && !lista.includes('Peli nueva'), lista.slice(0, 100));

  await ir('#/categoria/series');
  ok('en series no hay chip de Robflix', !d.getElementById('categoria-robflix-chip'));

  /* ---- formulario ---- */
  await ir('#/recomendar');
  ok('el check de Robflix arranca oculto', d.getElementById('robflixGroup').style.display === 'none');
  const btnPeli = d.querySelector('.cat-pick[data-cat="peliculas"]') || d.querySelector('[data-cat="peliculas"]');
  if (btnPeli) {
    btnPeli.dispatchEvent(new w.Event('click', { bubbles: true }));
    await espera(80);
    ok('al elegir Películas aparece el check', d.getElementById('robflixGroup').style.display === 'block', d.getElementById('robflixGroup').style.display);
    const otro = d.querySelector('[data-cat="musica"]');
    if (otro) {
      otro.dispatchEvent(new w.Event('click', { bubbles: true }));
      await espera(80);
      ok('al cambiar a Música se oculta', d.getElementById('robflixGroup').style.display === 'none');
    }
  }

  /* ---- ruta muerta ---- */
  await ir('#/repertorios');
  ok('ruta vieja de repertorios va al inicio', d.getElementById('screen-home').classList.contains('active'), w.location.hash);

  console.log('\n' + (fallan ? '✗' : '✓') + '  ' + pasan + ' pasan, ' + fallan + ' fallan');
  process.exit(fallan ? 1 : 0);
})();
