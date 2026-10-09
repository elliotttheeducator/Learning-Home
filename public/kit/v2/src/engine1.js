/* ============================================================
   WOODCROFT DECK KIT 2 ENGINE
   One lesson file. Frames can be slides (16:9), scroll pages or maps.
   The same file opens as the teacher deck or, for students on Learning
   Home, as the student page with checking questions and live blocks.
   Input rule: only a pen draws. Finger and mouse move, zoom and pan,
   unless finger ink is switched on (it switches off again on the next frame).
   ============================================================ */
(function(){
"use strict";
var D = document, W = window;
var SOURCE = "<!doctype html>\n" + D.documentElement.outerHTML;
function $(id){ return D.getElementById(id); }
function qa(sel, root){ return Array.prototype.slice.call((root || D).querySelectorAll(sel)); }
function mk(tag, cls, html){ var e = D.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function slug(s){ return String(s || "deck").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "deck"; }
function now(){ return Date.now(); }
function rid(){ return Math.random().toString(36).slice(2, 10); }

var BODY = D.body;
var THEME = BODY.getAttribute("data-theme") || "kit";
var DECK = BODY.getAttribute("data-deck") || slug(D.title);
var CLASS = BODY.getAttribute("data-class") || "";
var LS = "kit2:" + DECK;
var deckEl = $("deck");
if(!deckEl){ console.error("Kit 2: no #deck element"); return; }

var MODES = {
  listen: ["Listen", "Eyes on me, pens down"], notes: ["Notes", "Copy this into your book"],
  ido: ["I do", "Watch, pens down"], wedo: ["We do", "Work it out with me"],
  youdo: ["You do", "Start writing now"], check: ["Check", "Show what you know"]
};

/* ---------- fonts: only the families the deck's themes use ---------- */
var FONTS = {
  kit: "Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Figtree:wght@400;500;600;700;800",
  professional: "Instrument+Serif&family=Instrument+Sans:wght@400;500;600;700",
  biology: "Young+Serif&family=Nunito+Sans:wght@400;600;700;800",
  maths: "Space+Grotesk:wght@500;700&family=Atkinson+Hyperlegible:wght@400;700",
  chemistry: "Lexend:wght@300;400;600;800",
  physics: "Manrope:wght@400;500;700;800",
  year7: "Fredoka:wght@400;500;600;700"
};
function loadFonts(themes){
  var fam = ["JetBrains+Mono:wght@500;700", "Figtree:wght@400;500;600;700;800"];
  themes.forEach(function(t){ if(FONTS[t]) fam.push(FONTS[t]); });
  var l = mk("link"); l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=" + fam.join("&family=") + "&display=swap";
  D.head.appendChild(l);
}

/* ---------- LaTeX to MathML (KaTeX, MathML output only, Cambria Math) ---------- */
function renderTex(root){
  if(typeof katex === "undefined") return;
  qa("[data-tex]", root).forEach(function(el){
    if(el._texDone) return;
    var src = el.getAttribute("data-tex");
    try{
      var s = katex.renderToString(src, {output: "mathml", throwOnError: false, displayMode: el.hasAttribute("data-tex-display")});
      var m = s.match(/<math[\s\S]*<\/math>/); s = m ? m[0] : s;
      el.innerHTML = s.replace(/<annotation[\s\S]*?<\/annotation>/g, "");
      el._texDone = true;
    }catch(err){ el.textContent = src; }
  });
}

/* ---------- which view: teacher deck or student page ---------- */
var ON_LH = false, VIEW = "teacher";
function decide(cb){
  var p = new URLSearchParams(location.search);
  var forced = p.get("view");
  if(location.protocol === "file:" || location.protocol === "blob:"){ return cb(forced === "student" ? "student" : "teacher"); }
  var done = false;
  var t = setTimeout(function(){ if(!done){ done = true; cb(forced === "student" ? "student" : "teacher"); } }, 2500);
  fetch("/api/me", {credentials: "same-origin", cache: "no-store"}).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
    if(done) return; done = true; clearTimeout(t);
    if(j && typeof j.teacher === "boolean"){ ON_LH = true; }
    if(forced) return cb(forced === "student" ? "student" : "teacher");
    cb(ON_LH && j.teacher === false ? "student" : "teacher");
  }).catch(function(){ if(done) return; done = true; clearTimeout(t); cb(forced === "student" ? "student" : "teacher"); });
}

/* ---------- frames ---------- */
var frames = qa("#deck > .frame");
frames.forEach(function(f, i){
  if(!f.dataset.id) f.dataset.id = "f" + (i + 1);
  if(!f.dataset.kind) f.dataset.kind = "slide";
  if(!f.dataset.mode) f.dataset.mode = "listen";
  f.dataset.skin = f.dataset.theme || THEME;
  if(f.dataset.theme) f.setAttribute("data-theme", f.dataset.theme);
});
var usedThemes = [THEME];
frames.forEach(function(f){ if(usedThemes.indexOf(f.dataset.skin) < 0) usedThemes.push(f.dataset.skin); });

function chipHTML(mode, say){
  var m = MODES[mode] || MODES.listen;
  return '<b>' + esc(m[0]) + '</b><em>' + esc(say || m[1]) + '</em>';
}
function frameTitle(f){
  if(f.dataset.t) return f.dataset.t;
  var h = f.querySelector("h1,h2,.maptitle");
  return h ? h.textContent.trim() : "Frame";
}

/* ============================================================
   SAVING: ink, workspace, edits, lesson clock and live results.
   Guards carried over from Kit 1: nothing is written before the stored
   state is read, an empty state never overwrites a stored one unless Clear
   was just pressed, a rolling -prev backup, and Recover.
   ============================================================ */
var store = {v: 2, t: 0, ink: {}, ws: {}, edits: {}, lesson: null, live: {}, pos: 0, theme: "", liveOn: 0};
var loaded = false, allowEmpty = false, saveTimer = null, lastPrev = 0;
function inkCount(s){
  var n = 0, k;
  for(k in s.ink) n += (s.ink[k] || []).length;
  for(k in s.ws) n += ((s.ws[k] && s.ws[k].pieces) || []).length;
  return n;
}
function readLS(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
function writeLS(key, v){ try{ localStorage.setItem(key, v); return true; }catch(e){ toast("Could not save: browser storage is full or blocked"); return false; } }
function loadStore(){
  var raw = readLS(LS), got = null;
  if(raw){ try{ got = JSON.parse(raw); }catch(e){ got = null; } }
  if(!got){
    var b = $("k2baked");
    if(b){ try{ got = JSON.parse(b.textContent); }catch(e){ got = null; } }
  }
  if(got && typeof got === "object"){
    for(var k in store) if(got[k] != null) store[k] = got[k];
  }
  if(raw){ writeLS(LS + "-prev", raw); lastPrev = now(); }
  loaded = true;
}
function save(){ clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 500); setSaveDot("busy"); }
function doSave(){
  clearTimeout(saveTimer);
  if(!loaded || VIEW !== "teacher") return;
  if(inkCount(store) === 0 && !allowEmpty){
    var raw = readLS(LS);
    if(raw){ try{ if(inkCount(JSON.parse(raw)) > 0){ store.t = now(); var keep = JSON.parse(raw); keep.edits = store.edits; keep.lesson = store.lesson; keep.live = store.live; keep.pos = store.pos; keep.theme = store.theme; writeLS(LS, JSON.stringify(keep)); setSaveDot("ok"); return; } }catch(e){} }
  }
  if(now() - lastPrev > 60000){ var cur = readLS(LS); if(cur) writeLS(LS + "-prev", cur); lastPrev = now(); }
  store.t = now();
  if(writeLS(LS, JSON.stringify(store))) setSaveDot("ok");
  allowEmpty = false;
}
function setSaveDot(s){ var d = $("k2save"); if(d) d.setAttribute("data-s", s); }

/* ============================================================
   PANELS AND CAMERA
   A panel shows one world (a frame, or the workspace board). The
   camera is scale s and offset x, y in panel pixels.
   ============================================================ */
function Panel(el){ this.el = el; this.cam = {s: 1, x: 0, y: 0}; this.fitS = 1; this.target = null; this.kind = "slide"; this.ptrs = {}; this.g = null; }
Panel.prototype.size = function(){ return {w: this.el.clientWidth, h: this.el.clientHeight}; };
Panel.prototype.dims = function(){
  var t = this.target; if(!t) return {w: 1600, h: 900};
  if(this.kind === "ws") return {w: 3200, h: 1800};
  if(this.kind === "map") return {w: +t.dataset.w || 3600, h: +t.dataset.h || 2000};
  if(this.kind === "scroll") return {w: 1600, h: Math.max(900, t.offsetHeight)};
  return {w: 1600, h: 900};
};
// One panel on screen: slides and maps run edge to edge, and any spare strip (a screen that is not
// 16:9) takes the frame's own background. Two panels side by side keep the margin.
Panel.prototype.isSplit = function(){ var v = document.getElementById("k2view"); return !!(v && v.classList.contains("split")); };
Panel.prototype.fillBg = function(){
  var t = this.target, bg = "";
  if(t && !this.isSplit() && (this.kind === "slide" || this.kind === "map")){
    var src = this.kind === "map" ? (t.querySelector(".mapbg") || t) : t;
    bg = getComputedStyle(src).backgroundColor;
    if(/rgba\(.*,\s*0\)$|transparent/.test(bg)) bg = "";
  }
  this.el.style.background = bg;
  // carry the slide's coloured mode stripe down the spare strips too
  // only when the spare strips are above and below: with strips at the sides the slide's own stripe shows
  var sideGap = this.size().w - 1600 * this.cam.s > 4;
  var stripe = bg && this.kind === "slide" && !sideGap ? getComputedStyle(t).getPropertyValue("--m").trim() : "";
  this.el.style.boxShadow = stripe ? "inset " + Math.round(16 * this.cam.s) + "px 0 0 " + stripe : "";
};
Panel.prototype.fit = function(){
  var sz = this.size(), d = this.dims(), c = this.cam, pad = 14;
  if((this.kind === "slide" || this.kind === "map") && !this.isSplit()) pad = 0;
  if(this.kind === "scroll"){
    c.s = Math.min((sz.w - pad * 2) / 1600, 1.6); c.x = (sz.w - 1600 * c.s) / 2; c.y = pad;
  }else if(this.kind === "ws"){
    c.s = Math.min((sz.w - pad * 2) / 2000, (sz.h - pad * 2) / 1125);
    c.x = sz.w / 2 - 1600 * c.s; c.y = sz.h / 2 - 900 * c.s;
  }else{
    c.s = Math.min((sz.w - pad * 2) / d.w, (sz.h - pad * 2) / d.h);
    c.x = (sz.w - d.w * c.s) / 2; c.y = (sz.h - d.h * c.s) / 2;
  }
  this.fitS = c.s; this.fillBg(); this.apply();
};
Panel.prototype.clampCam = function(){
  var sz = this.size(), d = this.dims(), c = this.cam;
  var minS = this.kind === "ws" || this.kind === "map" ? this.fitS * 0.4 : this.fitS;
  c.s = clamp(c.s, minS, this.fitS * 8);
  if(this.kind === "slide" && c.s <= this.fitS * 1.001){ this.fit(); return; }
  var cw = d.w * c.s, ch = d.h * c.s, m = 60;
  if(cw <= sz.w) c.x = this.kind === "scroll" || this.kind === "slide" ? (sz.w - cw) / 2 : clamp(c.x, -cw + m, sz.w - m);
  else c.x = clamp(c.x, sz.w - cw - m, m);
  if(this.kind === "scroll"){
    if(ch <= sz.h) c.y = 14; else c.y = clamp(c.y, sz.h - ch - 40, 14);
  }else if(ch <= sz.h && this.kind === "slide") c.y = (sz.h - ch) / 2;
  else c.y = clamp(c.y, Math.min(sz.h - ch - m, m), Math.max(m, sz.h - m));
};
Panel.prototype.apply = function(){
  if(!this.target) return;
  var c = this.cam;
  this.target.style.transform = "translate(" + c.x.toFixed(2) + "px," + c.y.toFixed(2) + "px) scale(" + c.s.toFixed(5) + ")";
  if(this.onCam) this.onCam();
};
Panel.prototype.zoomAt = function(px, py, k){
  var c = this.cam, s2 = c.s * k;
  var minS = this.kind === "ws" || this.kind === "map" ? this.fitS * 0.4 : this.fitS;
  s2 = clamp(s2, minS, this.fitS * 8); k = s2 / c.s;
  c.x = px - (px - c.x) * k; c.y = py - (py - c.y) * k; c.s = s2;
  this.clampCam(); this.apply();
};
Panel.prototype.toWorld = function(cx, cy){
  var r = this.el.getBoundingClientRect(), c = this.cam;
  return [(cx - r.left - c.x) / c.s, (cy - r.top - c.y) / c.s];
};
Panel.prototype.animateTo = function(s, x, y){
  var p = this, c = this.cam, s0 = c.s, x0 = c.x, y0 = c.y, t0 = now(), dur = 420;
  if(W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches) dur = 1;
  (function step(){
    var k = Math.min(1, (now() - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    c.s = s0 + (s - s0) * e; c.x = x0 + (x - x0) * e; c.y = y0 + (y - y0) * e; p.apply();
    if(k < 1) requestAnimationFrame(step);
  })();
};
Panel.prototype.zoomToRect = function(x, y, w, h){
  var sz = this.size(), pad = 60;
  var s = Math.min((sz.w - pad * 2) / w, (sz.h - pad * 2) / h);
  s = clamp(s, this.fitS * 0.4, this.fitS * 8);
  this.animateTo(s, sz.w / 2 - (x + w / 2) * s, sz.h / 2 - (y + h / 2) * s);
};

/* ============================================================
   INK: vector strokes in world units, one SVG per surface
   ============================================================ */
var tool = "pen", colour = "#1b2135", widthPx = 5, fingerInk = false, editing = false;
var COLOURS = ["#1b2135", "#2563eb", "#dc2626", "#16a34a", "#ea580c", "#7c3aed", "#db2777"];
var surfaces = {};
function Surface(key, svg){ this.key = key; this.svg = svg; this.undo = []; this.redo = []; if(!store.ink[key]) store.ink[key] = []; }
Surface.prototype.strokes = function(){ return store.ink[this.key] || (store.ink[this.key] = []); };
Surface.prototype.render = function(){
  var h = [], ss = this.strokes();
  for(var i = 0; i < ss.length; i++) h.push(strokePath(ss[i]));
  this.svg.innerHTML = h.join("");
};
Surface.prototype.snap = function(){ this.undo.push(this.strokes().slice()); if(this.undo.length > 80) this.undo.shift(); this.redo = []; };
function strokeD(p){
  if(!p.length) return "";
  if(p.length < 3){ var a = p[0], b = p[p.length - 1]; return "M" + a[0] + " " + a[1] + "L" + (b[0] + 0.01) + " " + (b[1] + 0.01); }
  var d = "M" + p[0][0] + " " + p[0][1];
  for(var i = 1; i < p.length - 1; i++){
    var mx = ((p[i][0] + p[i + 1][0]) / 2).toFixed(1), my = ((p[i][1] + p[i + 1][1]) / 2).toFixed(1);
    d += "Q" + p[i][0] + " " + p[i][1] + " " + mx + " " + my;
  }
  var l = p[p.length - 1]; return d + "L" + l[0] + " " + l[1];
}
function strokePath(s){
  return '<path d="' + strokeD(s.p) + '" stroke="' + s.c + '" stroke-width="' + s.w + '"' + (s.h ? ' class="hi" stroke-opacity=".38"' : '') + '/>';
}
function surfaceFor(key, host){
  if(surfaces[key]) return surfaces[key];
  var svg = D.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "k2ink"); host.appendChild(svg);
  var s = new Surface(key, svg); surfaces[key] = s; s.render(); return s;
}
var live_ink = null;
function inkStart(panel, surf, e){
  var p = panel.toWorld(e.clientX, e.clientY);
  var erase = tool === "eraser" || e.button === 5 || (e.buttons & 32);
  surf.snap();
  if(erase){ live_ink = {surf: surf, panel: panel, erase: true, removed: false}; eraseAt(surf, p, panel); return; }
  var hi = tool === "hi";
  var st = {c: colour, w: +((hi ? widthPx * 4 : widthPx) / panel.cam.s).toFixed(2), h: hi ? 1 : 0, p: [[+p[0].toFixed(1), +p[1].toFixed(1)]]};
  var path = D.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("stroke", st.c); path.setAttribute("stroke-width", st.w);
  if(hi){ path.setAttribute("class", "hi"); path.setAttribute("stroke-opacity", ".38"); }
  surf.svg.appendChild(path);
  live_ink = {surf: surf, panel: panel, st: st, path: path};
  path.setAttribute("d", strokeD(st.p));
  hideDock();
}
function inkMove(e){
  if(!live_ink) return;
  var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  if(!evs.length) evs = [e];
  for(var i = 0; i < evs.length; i++){
    var p = live_ink.panel.toWorld(evs[i].clientX, evs[i].clientY);
    if(live_ink.erase){ eraseAt(live_ink.surf, p, live_ink.panel); continue; }
    var pts = live_ink.st.p, l = pts[pts.length - 1];
    var dd = Math.abs(p[0] - l[0]) + Math.abs(p[1] - l[1]);
    if(dd * live_ink.panel.cam.s < 1.2) continue;
    pts.push([+p[0].toFixed(1), +p[1].toFixed(1)]);
  }
  if(!live_ink.erase) live_ink.path.setAttribute("d", strokeD(live_ink.st.p));
}
function inkEnd(){
  if(!live_ink) return;
  if(live_ink.erase){ if(!live_ink.removed) live_ink.surf.undo.pop(); }
  else live_ink.surf.strokes().push(live_ink.st);
  live_ink = null; save();
}
function eraseAt(surf, p, panel){
  var r = 16 / panel.cam.s, ss = surf.strokes(), keep = [], hit = false;
  for(var i = 0; i < ss.length; i++){
    var s = ss[i], gone = false, rr = r + s.w / 2;
    for(var j = 0; j < s.p.length; j++){ var dx = s.p[j][0] - p[0], dy = s.p[j][1] - p[1]; if(dx * dx + dy * dy < rr * rr){ gone = true; break; } }
    if(gone) hit = true; else keep.push(s);
  }
  if(hit){ store.ink[surf.key] = keep; surf.render(); live_ink.removed = true; }
}
function undoInk(redo){
  var s = activeSurface(); if(!s) return;
  var from = redo ? s.redo : s.undo, to = redo ? s.undo : s.redo;
  if(!from.length) return;
  to.push(s.strokes().slice()); store.ink[s.key] = from.pop(); s.render(); save();
}
function clearInk(){
  var s = activeSurface(); if(!s || !s.strokes().length) return;
  s.snap(); store.ink[s.key] = []; s.render(); allowEmpty = true; save();
}
