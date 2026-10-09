
/* ============================================================
   WORKSPACE: a board beside or instead of the frame. Pieces marked
   data-piece on the current frame can be summoned onto it, then moved,
   turned and scaled with finger or mouse. The pen writes over them.
   Each frame has its own workspace board, saved with the ink.
   ============================================================ */
var lastInkPanel = null;
function activeSurface(){
  var useWs = layout === "wsonly" || (layout === "split" && lastInkPanel === wsP);
  return useWs ? wsSurface() : surfaces["f:" + frames[cur].dataset.id];
}
function cycleLayout(){
  layout = layout === "slide" ? "split" : layout === "split" ? "wsonly" : "slide";
  view.className = layout === "slide" ? "" : layout;
  $("k2wsb").setAttribute("aria-pressed", String(layout !== "slide"));
  if(layout !== "slide") loadWs();
  setTimeout(function(){ mainP.fit(); if(layout !== "slide") wsP.fit(); }, 30);
  toast(layout === "split" ? "Split screen: frame and workspace" : layout === "wsonly" ? "Workspace only. Press W again for the frame." : "Frame only");
}
function wsKey(){ return "w:" + frames[cur].dataset.id; }
function wsSurface(){ return surfaceFor(wsKey(), wsWorld); }
function wsData(){ var id = frames[cur].dataset.id; return store.ws[id] || (store.ws[id] = {pieces: []}); }
function loadWs(){
  var key = wsKey();
  for(var k in surfaces){ if(k.indexOf("w:") === 0) surfaces[k].svg.style.display = k === key ? "" : "none"; }
  wsSurface();
  renderPieces();
  $("k2wstitle").textContent = "Workspace: " + frameTitle(frames[cur]);
}
function buildWsBar(wsEl){
  var bar = mk("div", "wsbar");
  bar.innerHTML = '<span class="wstitle" id="k2wstitle">Workspace</span><button class="k2btn solid" type="button" id="k2summon">Summon</button>' +
    '<button class="k2btn" type="button" id="k2wsfit">Fit</button><button class="k2btn" type="button" id="k2wsclear">Clear board</button>';
  wsEl.appendChild(bar);
  $("k2summon").onclick = function(e){ e.stopPropagation(); openSummon(this); };
  $("k2wsfit").onclick = function(){ wsP.animateFit(); };
  $("k2wsclear").onclick = function(){
    if(!confirm("Clear everything on this workspace board?")) return;
    var d = wsData(); d.pieces = []; var s = wsSurface(); s.snap(); store.ink[s.key] = []; s.render(); renderPieces(); allowEmpty = true; save();
  };
  wsP.onCam = function(){};
  wsEl.addEventListener("pointerdown", function(){ lastInkPanel = wsP; }, true);
  $("k2main").addEventListener("pointerdown", function(){ lastInkPanel = mainP; }, true);
}
var BG = {
  graph: {label: "Graph paper", w: 1200, h: 800, html: '<div class="bg-graph"></div>'},
  line: {label: "Number line", w: 1400, h: 170, html: (function(){
    var o = '<svg width="1400" height="170" viewBox="0 0 1400 170" xmlns="http://www.w3.org/2000/svg"><line x1="20" y1="70" x2="1380" y2="70" stroke="#1b2135" stroke-width="4"/>';
    for(var i = -10; i <= 10; i++){ var x = 700 + i * 64; o += '<line x1="' + x + '" y1="' + (i % 5 ? 56 : 46) + '" x2="' + x + '" y2="' + (i % 5 ? 84 : 94) + '" stroke="#1b2135" stroke-width="' + (i % 5 ? 3 : 4) + '"/><text x="' + x + '" y="130" font-size="30" font-family="Figtree,sans-serif" font-weight="700" text-anchor="middle" fill="#1b2135">' + (i < 0 ? "\u2212" + (-i) : i) + '</text>'; }
    return o + '<path d="M20 70l18-12v24zM1380 70l-18-12v24z" fill="#1b2135"/></svg>'; })()},
  axes: {label: "Axes", w: 860, h: 860, html: (function(){
    var o = '<svg width="860" height="860" viewBox="0 0 860 860" xmlns="http://www.w3.org/2000/svg"><rect width="860" height="860" fill="#fff"/>';
    for(var i = 0; i <= 20; i++){ var p = 30 + i * 40; o += '<line x1="' + p + '" y1="30" x2="' + p + '" y2="830" stroke="#d5dff0" stroke-width="2"/><line x1="30" y1="' + p + '" x2="830" y2="' + p + '" stroke="#d5dff0" stroke-width="2"/>'; }
    o += '<line x1="30" y1="430" x2="830" y2="430" stroke="#1b2135" stroke-width="4"/><line x1="430" y1="30" x2="430" y2="830" stroke="#1b2135" stroke-width="4"/>';
    for(var j = -10; j <= 10; j += 2){ if(!j) continue; var q = 430 + j * 40; o += '<text x="' + q + '" y="458" font-size="20" font-family="Figtree,sans-serif" text-anchor="middle" fill="#1b2135">' + (j < 0 ? "\u2212" + (-j) : j) + '</text><text x="418" y="' + (860 - q + 7) + '" font-size="20" font-family="Figtree,sans-serif" text-anchor="end" fill="#1b2135">' + (j < 0 ? "\u2212" + (-j) : j) + '</text>'; }
    return o + '<text x="842" y="420" font-size="28" font-style="italic" font-family="Cambria Math,serif" text-anchor="end">x</text><text x="444" y="56" font-size="28" font-style="italic" font-family="Cambria Math,serif">y</text></svg>'; })()}
};
function openSummon(btn){
  var f = frames[cur], ps = qa("[data-piece]", f);
  var h = '<div class="mh">From this frame</div>' + (ps.length ? ps.map(function(p, i){ return '<button class="mi" type="button" data-p="' + i + '">' + esc(p.dataset.piece) + '</button>'; }).join("") : '<div class="mi" style="opacity:.6">Nothing on this frame is marked as a piece</div>') +
    '<div class="mh">Backgrounds</div>' + Object.keys(BG).map(function(k){ return '<button class="mi" type="button" data-bg="' + k + '">' + BG[k].label + '</button>'; }).join("");
  var p = pop(btn, h);
  var r = btn.getBoundingClientRect(); p.style.top = (r.bottom + 8) + "px";
  p.onclick = function(e){
    var b = e.target.closest(".mi"); if(!b) return; closePops();
    if(b.dataset.p != null){
      var src = ps[+b.dataset.p], c = src.cloneNode(true);
      qa("[id]", c).forEach(function(n){ n.removeAttribute("id"); }); c.removeAttribute("id");
      qa(".k2pieceflag,.k2ink", c).forEach(function(n){ n.remove(); });
      qa("[data-k2edit]", c).forEach(function(n){ n.removeAttribute("data-k2edit"); n.removeAttribute("contenteditable"); });
      c.removeAttribute("data-k2edit");
      var ow = src.style.width; src.style.width = "max-content";
      var w = Math.min(src.offsetWidth, src.parentNode ? src.parentNode.offsetWidth || 1600 : 1600), h = src.offsetHeight; src.style.width = ow;
      c.style.width = "100%"; c.style.height = "100%"; c.style.margin = "0";
      addPiece(c.outerHTML, w, h, f.dataset.skin);
    }else{ var g = BG[b.dataset.bg]; addPiece(g.html, g.w, g.h, frames[cur].dataset.skin, true); }
  };
}
function addPiece(html, w, h, theme, bg){
  var sz = wsP.size(), c = wsP.cam;
  var cx = (sz.w / 2 - c.x) / c.s, cy = (sz.h / 2 - c.y) / c.s;
  var st = {html: html, w: Math.round(w), h: Math.round(h), x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), s: 1, r: 0, theme: theme || THEME, bg: bg ? 1 : 0};
  var d = wsData();
  if(bg) d.pieces.unshift(st); else d.pieces.push(st);
  renderPieces(); save();
  var el = wsPieces.children[bg ? 0 : d.pieces.length - 1]; selectPiece(el);
}
function renderPieces(){
  var d = wsData(); wsPieces.innerHTML = "";
  d.pieces.forEach(function(st){
    var p = mk("div", "piece" + (st.bg ? " bgpiece" : "")); p.setAttribute("data-theme", st.theme); p._st = st;
    var pin = mk("div", "pin", st.html); p.appendChild(pin);
    p.insertAdjacentHTML("beforeend", '<button class="h rot" type="button" aria-label="Turn"></button><button class="h sc" type="button" aria-label="Resize"></button><button class="h del" type="button" aria-label="Remove">&#215;</button>');
    placePiece(p, st); wsPieces.appendChild(p);
  });
  renderTex(wsPieces);
}
function placePiece(p, st){
  p.style.left = st.x + "px"; p.style.top = st.y + "px"; p.style.width = st.w + "px"; p.style.height = st.h + "px";
  p.style.transformOrigin = "50% 50%"; p.style.transform = "rotate(" + st.r.toFixed(1) + "deg) scale(" + st.s.toFixed(3) + ")";
  p.style.setProperty("--inv", (1 / st.s).toFixed(3));
}
function pieceState(p){ return p._st; }
function selectPiece(p){ qa(".piece.sel", wsPieces).forEach(function(x){ if(x !== p) x.classList.remove("sel"); }); if(p) p.classList.add("sel"); }
function pieceStart(P, e){ var g = P.g, st = g.piece._st; g.start = P.toWorld(e.clientX, e.clientY); g.st0 = {x: st.x, y: st.y, s: st.s, r: st.r}; }
function pieceMove(P, e){
  var g = P.g, st = g.piece._st, p = P.toWorld(e.clientX, e.clientY);
  var cx = st.x + st.w / 2, cy = st.y + st.h / 2;
  if(!g.h){ st.x = Math.round(g.st0.x + p[0] - g.start[0]); st.y = Math.round(g.st0.y + p[1] - g.start[1]); }
  else if(g.h.classList.contains("rot")){
    var r = Math.atan2(p[1] - cy, p[0] - cx) * 180 / Math.PI + 90; r = ((r % 360) + 540) % 360 - 180;
    var near = Math.round(r / 45) * 45; if(Math.abs(r - near) < 4) r = near; st.r = r;
  }else if(g.h.classList.contains("sc")){
    var d0 = Math.hypot(g.start[0] - cx, g.start[1] - cy) || 1, d1 = Math.hypot(p[0] - cx, p[1] - cy);
    st.s = clamp(g.st0.s * d1 / d0, 0.2, 8);
  }
  placePiece(g.piece, st);
}
function savePiece(){ save(); }
function removePiece(p){ var d = wsData(), i = d.pieces.indexOf(p._st); if(i >= 0) d.pieces.splice(i, 1); renderPieces(); allowEmpty = true; save(); }

/* ============================================================
   TOOLS: the Kit 1 calculator and protractor on a 1600 x 900 layer
   ============================================================ */
function buildTools(){
  var wrap = mk("div"); wrap.id = "k2tools";
  wrap.innerHTML = '<div id="stage">' + TOOLS_HTML + '</div>';
  BODY.appendChild(wrap);
  var hold = mk("div"); hold.hidden = true;
  hold.innerHTML = '<button id="btnCalc" type="button" aria-pressed="false"></button><button id="btnProto" type="button" aria-pressed="false"></button>';
  BODY.appendChild(hold);
  fitTools();
  initToolsKit1();
  $("btnCalc").addEventListener("click", function(){ var on = $("calc").hidden; W.CALC.show(on); this.setAttribute("aria-pressed", String(on)); });
}
function fitTools(){
  var st = $("stage"); if(!st) return;
  var s = Math.min(W.innerWidth / 1600, W.innerHeight / 900);
  st.style.transform = "translate(" + ((W.innerWidth - 1600 * s) / 2) + "px," + ((W.innerHeight - 900 * s) / 2) + "px) scale(" + s + ")";
}

/* ============================================================
   MEDIA: hotspots on images, videos with pause points
   ============================================================ */
function initMedia(){
  qa(".hot").forEach(function(h){ h.type = "button"; h.addEventListener("click", function(){ h.classList.toggle("on"); }); });
  qa(".vid").forEach(buildVideo);
}
function parseT(s){ s = String(s || "0"); var p = s.split(":").map(Number); return p.length > 1 ? p[0] * 60 + p[1] : p[0]; }
function buildVideo(box){
  var pauses = qa(".pause", box).map(function(p){ var o = {t: parseT(p.dataset.t), q: p.innerHTML, done: false}; p.remove(); return o; });
  var src = box.dataset.src;
  box.innerHTML = '<div class="vwrap"><video preload="metadata" playsinline src="' + esc(src) + '"></video><div class="vq" hidden><span class="vqk"></span><span class="vqt"></span><button type="button">Keep watching</button></div></div>' +
    '<div class="vbar"><span class="vfill"></span></div><div class="vctl"><button type="button" class="vplay">Play</button><button type="button" class="vback">Back 10 s</button><span class="vtime">0:00</span></div>';
  var v = box.querySelector("video"), q = box.querySelector(".vq"), bar = box.querySelector(".vbar"), fill = box.querySelector(".vfill"), play = box.querySelector(".vplay"), time = box.querySelector(".vtime");
  bar.setAttribute("data-interactive", "");
  function marks(){
    qa(".vmark", bar).forEach(function(m){ m.remove(); });
    if(!v.duration) return;
    pauses.forEach(function(p, i){ var m = mk("span", "vmark" + (p.done ? " done" : "")); m.style.left = (100 * p.t / v.duration) + "%"; m.title = "Pause point " + (i + 1); bar.appendChild(m); });
  }
  v.addEventListener("loadedmetadata", marks);
  v.addEventListener("timeupdate", function(){
    if(v.duration) fill.style.width = (100 * v.currentTime / v.duration) + "%";
    time.textContent = fmt(v.currentTime) + (v.duration ? " / " + fmt(v.duration) : "");
    pauses.forEach(function(p, i){
      if(!p.done && v.currentTime >= p.t && v.currentTime < p.t + 1.5){
        p.done = true; v.pause(); q.hidden = false; q.querySelector(".vqk").textContent = "Pause point " + (i + 1);
        q.querySelector(".vqt").innerHTML = p.q; renderTex(q); marks();
      }
    });
  });
  v.addEventListener("play", function(){ play.textContent = "Pause"; q.hidden = true; });
  v.addEventListener("pause", function(){ play.textContent = "Play"; });
  play.onclick = function(){ if(v.paused) v.play(); else v.pause(); };
  box.querySelector(".vback").onclick = function(){ v.currentTime = Math.max(0, v.currentTime - 10); pauses.forEach(function(p){ if(p.t > v.currentTime) p.done = false; }); marks(); };
  q.querySelector("button").onclick = function(){ q.hidden = true; v.play(); };
  bar.addEventListener("click", function(e){ if(!v.duration) return; var r = bar.getBoundingClientRect(); v.currentTime = v.duration * clamp((e.clientX - r.left) / r.width, 0, 1); pauses.forEach(function(p){ if(p.t > v.currentTime) p.done = false; }); marks(); });
}
function stopMedia(f){ qa("video", f).forEach(function(v){ try{ v.pause(); }catch(e){} }); }
