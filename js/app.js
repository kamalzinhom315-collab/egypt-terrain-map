/* تضاريس مصر — خريطة تفاعلية. يعتمد على Leaflet و Pannellum (مجلد vendor). */
(() => {
'use strict';

const $ = id => document.getElementById(id);
const mob = () => matchMedia('(max-width:820px)').matches;
const RELIEF_BOUNDS = [[20.632784250388017, 22.5], [33.137551192346145, 37.96875]];
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const VOICES = { salma: 'سلمى', shakir: 'شاكر' };
const PLAY = 'M8 5v14l11-7z', PAUSE = 'M6 5h4v14H6zM14 5h4v14h-4z';

function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'vars') for (const [a, b] of Object.entries(v)) n.style.setProperty(a, b);
    else n.setAttribute(k, v);
  }
  kids.forEach(k => n.append(k));
  return n;
}
function link(href, text) {
  return el('a', { href, target: '_blank', rel: 'noopener noreferrer', text });
}
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const getJSON = url => fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });

let toastTimer;
function toast(msg, ms = 3500) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

async function boot() {
  $('fatal').hidden = true;
  let F, ring;
  try {
    [F, ring] = await Promise.all([getJSON('data/features.json'), getJSON('data/egypt-ring.json')]);
  } catch (e) {
    console.error(e);
    $('splash').classList.add('off');
    $('fatal').hidden = false;
    return;
  }
  start(F, ring);
  registerSW();
}

function start(F, ring) {
  const byId = new Map(F.map(f => [f.id, f]));
  const EG = ring.map(p => [p[1], p[0]]);

  /* ---------- الخريطة ---------- */
  const map = L.map('map', {
    zoomControl: false, minZoom: 4, maxZoom: 10, zoomSnap: .25, attributionControl: false,
    maxBounds: [[17, 19], [37, 41]], maxBoundsViscosity: .7
  });
  L.control.zoom({ position: 'topleft' }).addTo(map);
  const attr = L.control.attribution({
    position: 'bottomright',
    prefix: '<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>'
  }).addTo(map);
  attr.addAttribution('Natural Earth');

  // خريطة احتياطية محفوظة محليًا تظهر تحت البلاطات: تعمل بدون إنترنت وأثناء التحميل
  map.createPane('base'); map.getPane('base').style.zIndex = 150;
  const localRelief = L.imageOverlay('assets/relief.webp', RELIEF_BOUNDS, {
    pane: 'base', interactive: false, alt: '',
    attribution: 'Mapzen/Tilezen · USGS · NOAA'
  }).addTo(map);
  const tileOpts = { maxZoom: 13, maxNativeZoom: 13, errorTileUrl: BLANK };
  const relief = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    { ...tileOpts, attribution: '© Esri' }).addTo(map);
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { ...tileOpts, attribution: '© Esri, Maxar, Earthstar Geographics' });

  L.polygon([[[-85, -180], [-85, 180], [85, 180], [85, -180]], EG],
    { stroke: false, fillColor: '#0b2622', fillOpacity: .72, interactive: false }).addTo(map);
  L.polygon(EG, { color: '#e2b25c', weight: 2, fill: false, interactive: false }).addTo(map);

  const getBounds = () => L.latLngBounds([[21.9, mob() ? 22.8 : 24.6], [31.8, 36.9]]);
  let cur = null, pano = null;
  const fit = () => map.fitBounds(getBounds(), {
    paddingTopLeft: [8, mob() ? 84 : 70], paddingBottomRight: [8, mob() ? 64 : 30], animate: false
  });
  const refit = () => { map.invalidateSize(); if (!cur) fit(); };
  fit();
  addEventListener('load', refit); addEventListener('resize', refit); setTimeout(refit, 400);

  [['القاهرة', 30.0444, 31.2357, ''], ['البحر المتوسط', 32.75, 28.0, 'sea'],
   ['البحر الأحمر', 24.6, 35.6, 'sea'], ['بحيرة ناصر', 22.9, 32.9, 'sea']].forEach(g =>
    L.marker([g[1], g[2]], {
      interactive: false, keyboard: false,
      icon: L.divIcon({ className: '', iconSize: [0, 0], html: el('div', { class: 'geo ' + g[3], text: g[0] }) })
    }).addTo(map));

  /* ---------- العلامات والأزرار السفلية ---------- */
  const markers = {};
  F.forEach((f, i) => {
    const mk = el('div', { class: 'mk ' + f.dir, vars: { '--c': f.color } },
      el('div', { class: 'pin', text: String(i + 1) }), el('div', { class: 'lab', text: f.short }));
    const m = L.marker([f.lat, f.lon], {
      keyboard: true, title: f.ar, icon: L.divIcon({ className: '', iconSize: [0, 0], html: mk })
    }).addTo(map);
    m.on('click', () => show(f.id));
    markers[f.id] = m;
    const b = el('button', { type: 'button' }, el('i', { vars: { '--c': f.color } }), f.short);
    b.onclick = () => show(f.id);
    $('chips').appendChild(b);
  });
  setTimeout(() => { $('hint').style.opacity = 0; }, 9000);

  /* ---------- نوع الخريطة + حالة الاتصال ---------- */
  let basemap = 'relief';
  function setBasemap(b, silent) {
    if (b === 'sat' && !navigator.onLine) { if (!silent) toast('القمر الصناعي يحتاج اتصالًا بالإنترنت'); return; }
    basemap = b;
    if (b === 'sat') { map.removeLayer(relief); sat.addTo(map); } else { map.removeLayer(sat); relief.addTo(map); }
    document.body.classList.toggle('sat', b === 'sat');
    [...$('basemap').children].forEach(x => {
      const on = x.dataset.b === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on);
    });
  }
  $('basemap').onclick = e => { const b = e.target.closest('button'); if (b && !b.disabled) setBasemap(b.dataset.b); };
  function netState() {
    const on = navigator.onLine;
    $('net').hidden = on;
    const sb = $('basemap').querySelector('[data-b=sat]');
    sb.disabled = !on; sb.title = on ? '' : 'يحتاج إنترنت';
    if (!on && basemap === 'sat') setBasemap('relief', true);
    if (cur) update360(cur);
  }
  addEventListener('online', netState); addEventListener('offline', netState);

  /* ---------- الصوت ---------- */
  const audio = $('audio'), playIc = $('play-ic');
  let voice = 'salma';
  const setIcon = playing => playIc.setAttribute('d', playing ? PAUSE : PLAY);
  const effVoice = f => (f.audio[voice] ? voice : 'salma');
  audio.addEventListener('play', () => setIcon(true));
  audio.addEventListener('pause', () => setIcon(false));
  audio.addEventListener('ended', () => { setIcon(false); $('seek').value = 0; });
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) $('seek').value = audio.currentTime / audio.duration * 100;
    $('time').textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
  });
  audio.addEventListener('loadedmetadata', () => { $('time').textContent = '0:00 / ' + fmt(audio.duration); });
  audio.addEventListener('error', () => { if (audio.getAttribute('src')) toast('تعذّر تشغيل الصوت. جرّب مرة أخرى.'); });
  $('seek').oninput = e => { if (audio.duration) audio.currentTime = e.target.value / 100 * audio.duration; };
  $('play').onclick = () => {
    if (!cur) return;
    if (!audio.getAttribute('src')) audio.src = cur.audio[effVoice(cur)];
    if (audio.paused) audio.play().catch(() => toast('تعذّر تشغيل الصوت. اضغط مرة أخرى.')); else audio.pause();
  };
  function loadAudio(f, autoplay) {
    const v = effVoice(f);
    [...$('voice').children].forEach(b => {
      b.disabled = !f.audio[b.dataset.v];
      const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    });
    const n = $('note');
    n.hidden = v === voice;
    if (v !== voice) n.textContent = 'صوت «' + VOICES[voice] + '» غير متاح لهذا الموقع حاليًا، تم تشغيل الصوت الآخر.';
    audio.src = f.audio[v];
    $('seek').value = 0; $('time').textContent = '0:00'; setIcon(false);
    if (autoplay) audio.play().catch(() => {});
  }
  function stopAudio() { audio.pause(); audio.removeAttribute('src'); audio.load(); setIcon(false); $('seek').value = 0; }
  $('voice').onclick = e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    voice = b.dataset.v;
    if (cur) loadAudio(cur, !audio.paused);
  };

  /* ---------- لوحة التفاصيل ---------- */
  function centerOn(f) {
    const z = 7; let p = map.project([f.lat, f.lon], z);
    p = mob() ? p.add([0, innerHeight * .62 / 2 - 30]) : p.add([-215, 0]);
    map.flyTo(map.unproject(p, z), z, { duration: 1.1, easeLinearity: .2 });
  }
  function update360(f) {
    const a = $('link360'), n = $('note360');
    const s = f.street360;
    if (!s || !navigator.onLine) { a.hidden = true; n.hidden = true; return; }
    a.href = 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + encodeURIComponent(s.viewpoint);
    a.hidden = false;
    n.textContent = 'أقرب موقع متاح: ' + s.label + ' (يفتح في Google Maps).'; n.hidden = false;
  }
  function setCredit(f) {
    const c = $('d-credit'); c.replaceChildren();
    c.append('الصورة: ', link(f.page, f.file.replace('File:', '')), ' — المصوّر: ' + f.author + ' — الترخيص: ');
    c.append(f.license_url ? link(f.license_url, f.license) : f.license);
    c.append(' — المصدر: ويكيميديا كومنز');
  }
  function showImage(f, v, bd) {
    const img = new Image();
    img.alt = f.alt || f.ar; img.decoding = 'async';
    if (f.w && f.h) { img.width = f.w; img.height = f.h; }
    bd.textContent = 'جاري تحميل الصورة…'; bd.style.opacity = 1;
    img.onload = () => { bd.textContent = 'اضغط على الصورة للتكبير'; setTimeout(() => { bd.style.opacity = 0; }, 4000); };
    img.onerror = () => { bd.textContent = 'تعذّر تحميل الصورة'; };
    img.onclick = () => { $('lightbox').hidden = false; $('lightbox').querySelector('img').src = f.img; };
    img.src = f.img;
    v.appendChild(img);
  }
  function setViewer(f) {
    const v = $('viewer'), bd = $('viewer-badge');
    if (pano) { try { pano.destroy(); } catch (e) { /* تجاهل */ } pano = null; }
    v.replaceChildren(); bd.style.opacity = 1;
    if (f.mode === 'panorama' && window.pannellum) {
      const vaov = 60, haov = Math.min(360, f.w / f.h * vaov);
      try {
        pano = pannellum.viewer('viewer', {
          type: 'equirectangular', panorama: f.img, autoLoad: true, haov, vaov,
          minPitch: -vaov / 2, maxPitch: vaov / 2, minYaw: -haov / 2, maxYaw: haov / 2,
          hfov: 62, minHfov: 30, maxHfov: 80, compass: false, autoRotate: -4,
          showFullscreenCtrl: true, showZoomCtrl: false, mouseZoom: false
        });
        pano.on('error', () => { if (cur === f) { try { pano.destroy(); } catch (e) { /* تجاهل */ } pano = null; v.replaceChildren(); showImage(f, v, bd); } });
        bd.textContent = '↔ بانوراما حقيقية: اسحب للتحرك';
        setTimeout(() => { bd.style.opacity = 0; }, 5000);
        return;
      } catch (e) { console.warn('pannellum failed', e); v.replaceChildren(); }
    }
    showImage(f, v, bd);
  }
  function show(id, opts) {
    const f = byId.get(id); if (!f) return;
    cur = f;
    Object.values(markers).forEach(m => m.getElement() && m.getElement().firstChild.classList.remove('on'));
    markers[id].getElement().firstChild.classList.add('on');
    const sheet = $('sheet');
    sheet.hidden = false; sheet.classList.remove('tall'); document.body.classList.add('open');
    $('d-ar').textContent = f.ar; $('d-en').textContent = f.en; $('d-kind').textContent = f.kind + ' · ' + f.sub;
    $('d-loc').textContent = f.lat.toFixed(3) + '°N  ' + f.lon.toFixed(3) + '°E';
    $('d-text').textContent = f.text;
    $('d-facts').replaceChildren(...f.facts.map(t => el('li', { text: t })));
    setCredit(f); update360(f); setViewer(f);
    loadAudio(f, !(opts && opts.noAutoplay));
    sheet.querySelector('.scroller').scrollTop = 0;
    centerOn(f);
    history.replaceState(null, '', '#' + id);
  }
  function close() {
    stopAudio();
    document.body.classList.remove('open');
    if (cur) markers[cur.id].getElement().firstChild.classList.remove('on');
    cur = null; history.replaceState(null, '', location.pathname + location.search); fit();
  }
  $('close').onclick = close;
  $('grab').onclick = () => $('sheet').classList.toggle('tall');
  $('prev').onclick = () => show(F[(F.indexOf(cur) + F.length - 1) % F.length].id);
  $('next').onclick = () => show(F[(F.indexOf(cur) + 1) % F.length].id);
  $('lb-close').onclick = () => { $('lightbox').hidden = true; };
  $('lightbox').onclick = e => { if (e.target.id === 'lightbox') $('lightbox').hidden = true; };
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('lightbox').hidden) $('lightbox').hidden = true; else if (cur) close();
  });
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (byId.has(h) && (!cur || cur.id !== h)) show(h, { noAutoplay: true }); });

  /* ---------- المصادر ---------- */
  (function credits() {
    const cb = $('credits-body'); cb.replaceChildren();
    const sec = (title, ...items) => { cb.append(el('h4', { text: title })); cb.append(el('ul', null, ...items.map(i => el('li', null, ...[].concat(i))))); };
    sec('الصور (ويكيميديا كومنز)', ...F.map(f => [el('b', { text: f.short }), ': ', link(f.page, f.file.replace('File:', '')), ' — ' + f.author + ' — ' + f.license]));
    sec('الخريطة والبيانات',
      'خريطة الأساس: Esri World Shaded Relief وEsri World Imagery (Esri, USGS, NOAA, Maxar وآخرون)',
      'الخريطة المحلية (بدون إنترنت): Terrain Tiles on AWS (Mapzen/Tilezen) — بيانات SRTM وGMTED2010 (USGS) وETOPO1 (NOAA)',
      'حدود مصر: Natural Earth (ملكية عامة)',
      'Leaflet 1.9.4 (BSD) وPannellum 2.5.6 (MIT) وخط Cairo (OFL)');
    sec('الصوت', 'تعليق صوتي مولَّد بالذكاء الاصطناعي: Microsoft Edge neural TTS (ar-EG-Salma / ar-EG-Shakir)');
    sec('ملاحظات',
      'روابط 360° تفتح في Google Street View (تحتاج إنترنت) وهي أقرب نقطة متاحة وليست بالضبط عند العلامة.',
      'الدلتا والصحراء الشرقية والقطارة: صور عريضة (والدلتا صورة قمر صناعي).',
      'مواقع العلامات تقريبية.');
    $('about').onclick = () => $('credits').showModal();
  })();

  /* ---------- الشاشة الافتتاحية والرابط المباشر ---------- */
  const t0 = Date.now(); let splashDone = false;
  const hideSplash = () => { if (splashDone) return; splashDone = true; setTimeout(() => $('splash').classList.add('off'), Math.max(0, 500 - (Date.now() - t0))); };
  localRelief.once('load', hideSplash); relief.once('load', hideSplash); setTimeout(hideSplash, 3500);
  const hs = location.hash.slice(1);
  if (byId.has(hs)) setTimeout(() => show(hs, { noAutoplay: true }), 900);
  netState();
}

/* ---------- العمل بدون إنترنت ---------- */
function registerSW() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'activated') toast(hadController ? '✓ تم تحديث الخريطة' : '✓ جاهز للعمل بدون إنترنت', 4500);
      });
    });
  }).catch(e => console.warn('SW registration failed', e));
}

$('retry').onclick = boot;
boot();
})();
