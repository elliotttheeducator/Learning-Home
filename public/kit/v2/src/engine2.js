
/* ============================================================
   TEACHER VIEW
   ============================================================ */
var view, mainP, wsP, cur = -1, layout = "slide", wsWorld, wsPieces;
var INTERACTIVE = "button,a[href],input,textarea,select,label,video,summary,[contenteditable=\"true\"],[data-interactive],.k2noink";

function buildTeacher(){
  BODY.classList.add("k2-teacher");
  view = mk("div"); view.id = "k2view";
  var mainEl = mk("div", "k2panel"); mainEl.id = "k2main";
  var wsEl = mk("div", "k2panel"); wsEl.id = "k2ws";
  view.appendChild(mainEl); view.appendChild(wsEl);
  BODY.appendChild(view);
  mainP = new Panel(mainEl); wsP = new Panel(wsEl); wsP.kind = "ws";

  frames.forEach(function(f){
    mainEl.appendChild(f);
    var k = f.dataset.kind;
    var head = f.querySelector(":scope > .head");
    if(head && !head.querySelector(".k2chip")){
      var chip = mk("span", "k2chip", chipHTML(f.dataset.mode, f.dataset.say));
      chip.setAttribute("data-mode", f.dataset.mode);
      head.insertBefore(chip, head.firstChild);
    }
    qa(".sec[data-mode]", f).forEach(function(sec){
      var h = sec.querySelector(":scope > h3");
      if(h && !h.querySelector(".k2chip")){ var c = mk("span", "k2chip", chipHTML(sec.dataset.mode, sec.dataset.say)); c.setAttribute("data-mode", sec.dataset.mode); h.insertBefore(c, h.firstChild); }
    });
    if(k === "map") buildMap(f);
    surfaceFor("f:" + f.dataset.id, f);
  });
  qa("[data-piece]", deckHost()).forEach(function(p){ if(!p.querySelector(":scope > .k2pieceflag")) p.appendChild(mk("span", "k2pieceflag", "piece")); });
  wsWorld = mk("div", "wsworld"); wsEl.appendChild(wsWorld);
  wsPieces = mk("div", "wspieces"); wsWorld.appendChild(wsPieces);
  wsP.target = wsWorld;
  buildWsBar(wsEl);
  [mainP, wsP].forEach(bindPanel);
  buildChrome();
  initActivitiesTeacher(); initLiveBlocks();
  markEditable(); applyEdits();
  initWalk(); initGaps(); initMedia();
  renderTex(view);
  W.addEventListener("resize", function(){ refit(); });
  if(store.theme) setTheme(store.theme, true);
  go(clamp(+store.pos || 0, 0, frames.length - 1), true);
}
function deckHost(){ return $("k2main") || deckEl; }
function refit(){ fitTools(); if(mainP && mainP.target) mainP.fit(); if(wsP && layout !== "slide") wsP.fit(); }

/* ---------- map frames: connector lines between nodes ---------- */
function buildMap(f){
  f.style.width = (+f.dataset.w || 3600) + "px"; f.style.height = (+f.dataset.h || 2000) + "px";
  if(!f.querySelector(":scope > .mapbg")) f.insertBefore(mk("div", "mapbg"), f.firstChild);
  var links = (f.dataset.links || "").split(",").map(function(s){ return s.trim(); }).filter(Boolean);
  if(!links.length) return;
  var svg = D.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "k2links");
  f.insertBefore(svg, f.children[1] || null);
  f._drawLinks = function(){
    var out = [];
    links.forEach(function(l){
      var ab = l.split(">"); var a = f.querySelector('.node[data-id="' + ab[0].trim() + '"]'), b = f.querySelector('.node[data-id="' + (ab[1] || "").trim() + '"]');
      if(!a || !b) return;
      var ax = a.offsetLeft + a.offsetWidth / 2, ay = a.offsetTop + a.offsetHeight / 2, bx = b.offsetLeft + b.offsetWidth / 2, by = b.offsetTop + b.offsetHeight / 2;
      var mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay;
      out.push('<path d="M' + ax + ' ' + ay + ' Q' + (mx - dy * 0.18) + ' ' + (my + dx * 0.18) + ' ' + bx + ' ' + by + '"/>');
    });
    svg.innerHTML = out.join("");
  };
}

/* ---------- pointer input on a panel ---------- */
function bindPanel(P){
  var el = P.el;
  el.addEventListener("pointerdown", function(e){
    if(e.target.closest(".wsbar")) return;
    var inter = e.target.closest(INTERACTIVE);
    var isPen = e.pointerType === "pen";
    var draws = (isPen || (fingerInk && e.button === 0)) && !editing;
    var handle = P === wsP ? e.target.closest(".piece .h") : null;
    if(handle && !draws){
      e.preventDefault(); var pc = handle.closest(".piece");
      if(handle.classList.contains("del")){ removePiece(pc); return; }
      try{ el.setPointerCapture(e.pointerId); }catch(err){}
      P.ptrs[e.pointerId] = {x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: now(), target: e.target};
      P.g = {type: "piece", piece: pc, h: handle}; pieceStart(P, e); return;
    }
    if(inter || handle) return;
    if(draws && tool !== "move"){
      e.preventDefault();
      try{ el.setPointerCapture(e.pointerId); }catch(err){}
      P.inkId = e.pointerId;
      inkStart(P, P === wsP ? wsSurface() : surfaces["f:" + frames[cur].dataset.id], e);
      return;
    }
    if(e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    try{ el.setPointerCapture(e.pointerId); }catch(err){}
    P.ptrs[e.pointerId] = {x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: now(), target: e.target};
    var ids = Object.keys(P.ptrs);
    var piece = P === wsP ? e.target.closest(".piece") : null;
    if(ids.length === 1){
      if(piece){ selectPiece(piece); P.g = {type: "piece", piece: piece, h: e.target.closest(".h")}; pieceStart(P, e); }
      else{ selectPiece(null); P.g = {type: "pan"}; }
    }else if(ids.length === 2){
      var a = P.ptrs[ids[0]], b = P.ptrs[ids[1]];
      var dist = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      if(P.g && P.g.type === "piece"){ var st0 = pieceState(P.g.piece); P.g = {type: "pinchpiece", piece: P.g.piece, d0: dist, a0: ang, st: st0, st0s: st0.s, st0r: st0.r}; }
      else P.g = {type: "pinch", d0: dist, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cam: {s: P.cam.s, x: P.cam.x, y: P.cam.y}};
    }
  });
  el.addEventListener("pointermove", function(e){
    if(P.inkId === e.pointerId){ inkMove(e); return; }
    var pt = P.ptrs[e.pointerId];
    if(!pt){ return; }
    var dx = e.clientX - pt.x, dy = e.clientY - pt.y; pt.x = e.clientX; pt.y = e.clientY;
    var g = P.g; if(!g) return;
    var ids = Object.keys(P.ptrs);
    if(g.type === "pan" && ids.length === 1){ P.cam.x += dx; P.cam.y += dy; P.clampCam(); P.apply(); }
    else if(g.type === "piece"){ pieceMove(P, e); }
    else if((g.type === "pinch" || g.type === "pinchpiece") && ids.length >= 2){
      var a = P.ptrs[ids[0]], b = P.ptrs[ids[1]];
      var dist = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      if(g.type === "pinchpiece"){
        var st = g.st; st.s = clamp(g.st0s * dist / g.d0, 0.2, 8); st.r = g.st0r + (ang - g.a0) * 180 / Math.PI;
        placePiece(g.piece, st);
      }else{
        var r = el.getBoundingClientRect(), mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
        var k = dist / g.d0, c0 = g.cam;
        var s2 = c0.s * k;
        P.cam.s = s2; P.cam.x = mx - ((g.mx - r.left) - c0.x) * (s2 / c0.s); P.cam.y = my - ((g.my - r.top) - c0.y) * (s2 / c0.s);
        P.clampCam(); P.apply();
      }
    }
  });
  function up(e){
    if(P.inkId === e.pointerId){ P.inkId = null; inkEnd(); return; }
    var pt = P.ptrs[e.pointerId]; if(!pt) return;
    delete P.ptrs[e.pointerId];
    var moved = Math.abs(e.clientX - pt.x0) + Math.abs(e.clientY - pt.y0);
    if(P.g && P.g.type === "pinchpiece" && P.g.st){ savePiece(P.g.piece); }
    if(P.g && P.g.type === "piece"){ savePiece(P.g.piece); }
    if(moved < 8 && now() - pt.t0 < 500 && P === mainP && P.g && P.g.type === "pan"){
      var node = pt.target.closest && pt.target.closest(".node");
      if(node && P.kind === "map") zoomNode(node);
    }
    if(!Object.keys(P.ptrs).length) P.g = null;
    else if(P.g && (P.g.type === "pinch" || P.g.type === "pinchpiece")) P.g = {type: "pan"};
  }
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  el.addEventListener("wheel", function(e){
    if(e.target.closest(".wsbar")) return;
    e.preventDefault();
    var r = el.getBoundingClientRect();
    if(e.ctrlKey || e.metaKey) P.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-clamp(e.deltaY * (e.deltaMode === 1 ? 33 : 1), -120, 120) * 0.0035));
    else{
      var k = e.deltaMode === 1 ? 32 : 1;
      if(P.kind === "slide" && P.cam.s <= P.fitS * 1.001) return;
      P.cam.x -= (e.shiftKey ? e.deltaY : e.deltaX) * k; if(!e.shiftKey) P.cam.y -= e.deltaY * k; P.clampCam(); P.apply();
    }
  }, {passive: false});
  el.addEventListener("dblclick", function(e){ if(e.target.closest(INTERACTIVE + ",.node,.piece")) return; P.animateFit(); });
}
Panel.prototype.animateFit = function(){
  var c = this.cam, s0 = c.s, x0 = c.x, y0 = c.y; this.fit(); var s = c.s, x = c.x, y = c.y;
  c.s = s0; c.x = x0; c.y = y0; this.animateTo(s, x, y);
};
function zoomNode(node){
  var x = node.offsetLeft, y = node.offsetTop, w = node.offsetWidth, h = node.offsetHeight;
  qa(".node.now", frames[cur]).forEach(function(n){ n.classList.remove("now"); }); node.classList.add("now");
  mainP.zoomToRect(x, y, w, h);
}

/* ---------- navigation ---------- */
function go(i, first){
  if(i < 0 || i >= frames.length) return;
  if(cur >= 0 && frames[cur]){ frames[cur].classList.remove("on"); stopMedia(frames[cur]); }
  var leaving = cur; cur = i;
  var f = frames[i]; f.classList.add("on");
  mainP.target = f; mainP.kind = f.dataset.kind === "map" ? "map" : f.dataset.kind;
  if(f._drawLinks) f._drawLinks();
  mainP.fit();
  if(fingerInk && !first) setFingerInk(false);
  store.pos = i; if(!first) save();
  if(layout !== "slide") loadWs();
  updateChrome();
  if(LIVE.on){ autoOpen(f); sendState(); sendView(); }
}
function next(){
  var f = frames[cur];
  if(f && f.dataset.kind === "scroll"){
    var sz = mainP.size(), d = mainP.dims();
    if(mainP.cam.y + d.h * mainP.cam.s > sz.h + 30){ scrollBy(sz.h * 0.8); return; }
  }
  go(cur + 1);
}
function prev(){
  var f = frames[cur];
  if(f && f.dataset.kind === "scroll" && mainP.cam.y < 0){ scrollBy(-mainP.size().h * 0.8); return; }
  go(cur - 1);
}
function scrollBy(px){ var c = mainP.cam; var y0 = c.y; c.y -= px; mainP.clampCam(); var y = c.y; c.y = y0; mainP.animateTo(c.s, c.x, y); }

/* ---------- chrome: dock, clock, timer, list, menus ---------- */
var ICON = {
  prev: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
  pen: '<path d="M15 4l5 5L9 20H4v-5z"/>', hi: '<path d="M8 20H4v-4l9-9 4 4z"/><path d="M14 4l6 6"/>',
  eraser: '<path d="M6 18l-3-3 9-9 6 6-6 6z"/><path d="M21 20H9"/>',
  undo: '<path d="M3 10h11a5 5 0 010 10h-4"/><path d="M7 6l-4 4 4 4"/>', redo: '<path d="M21 10H10a5 5 0 000 10h4"/><path d="M17 6l4 4-4 4"/>',
  clear: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  finger: '<path d="M9 11V5a2 2 0 014 0v6"/><path d="M13 9a2 2 0 014 0v4a7 7 0 01-7 7 6 6 0 01-5-3l-2-4a2 2 0 013-2l1 2"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  ws: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  tools: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  live: '<circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 000 11.4M17.7 6.3a8 8 0 010 11.4"/>',
  menu: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
};
function icon(n){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>'; }
function dk(id, ic, label, key){ return '<button class="dk" id="' + id + '" type="button" aria-label="' + label + '" title="' + label + (key ? ' (' + key + ')' : '') + '">' + icon(ic) + '</button>'; }

function buildChrome(){
  var tr = mk("div", "k2float"); tr.id = "k2tr";
  tr.innerHTML = '<button class="k2timer" id="k2timer" type="button" hidden></button><button class="k2live" id="k2livechip" type="button" hidden></button>' +
    '<button class="k2clock" id="k2clock" type="button" title="Tap to start or pause the lesson clock"><span id="k2time">--:--</span><small id="k2lesson"></small></button>';
  BODY.appendChild(tr);
  var tl = mk("div", "k2float"); tl.id = "k2tl"; tl.innerHTML = '<span class="k2badge" id="k2badge" hidden></span>'; BODY.appendChild(tl);
  var dock = mk("div"); dock.id = "k2dock"; dock.setAttribute("role", "toolbar"); dock.setAttribute("aria-label", "Teaching tools");
  dock.innerHTML = dk("k2prev", "prev", "Previous") + '<button class="dk wide" id="k2count" type="button" title="All frames (L)">1 / 1</button>' + dk("k2next", "next", "Next") +
    '<span class="dsep"></span>' + dk("k2pen", "pen", "Pen", "P") + dk("k2hi", "hi", "Highlighter", "H") + dk("k2er", "eraser", "Eraser", "E") +
    '<button class="dk" id="k2col" type="button" aria-label="Colour and thickness" title="Colour and thickness"><span class="cdot" id="k2cdot"></span></button>' +
    '<span class="dsep"></span>' + dk("k2undo", "undo", "Undo", "Ctrl+Z") + dk("k2redo", "redo", "Redo", "Ctrl+Y") + dk("k2clear", "clear", "Clear the ink here") +
    '<span class="dsep"></span>' + dk("k2finger", "finger", "Finger and mouse draw", "D") + dk("k2fit", "fit", "Fit to screen", "0") + dk("k2wsb", "ws", "Workspace", "W") +
    dk("k2toolsb", "tools", "Calculator and protractor") + dk("k2liveb", "live", "Live class") + dk("k2menub", "menu", "Menu");
  BODY.appendChild(dock);
  buildList();
  var edge = mk("div"); edge.id = "k2edge"; BODY.appendChild(edge);
  edge.addEventListener("pointerdown", showDock);
  W.addEventListener("pointermove", function(e){ if(e.clientY > W.innerHeight - 110 && !e.buttons) showDock(); }, {passive: true});

  $("k2prev").onclick = prev; $("k2next").onclick = next; $("k2count").onclick = toggleList;
  $("k2pen").onclick = function(){ setTool("pen"); }; $("k2hi").onclick = function(){ setTool("hi"); }; $("k2er").onclick = function(){ setTool("eraser"); };
  $("k2col").onclick = function(e){ e.stopPropagation(); openColour(this); };
  $("k2undo").onclick = function(){ undoInk(false); }; $("k2redo").onclick = function(){ undoInk(true); }; $("k2clear").onclick = clearInk;
  $("k2finger").onclick = function(){ setFingerInk(!fingerInk); };
  $("k2fit").onclick = function(){ (layout === "wsonly" ? wsP : mainP).animateFit(); };
  $("k2wsb").onclick = function(){ cycleLayout(); };
  $("k2toolsb").onclick = function(e){ e.stopPropagation(); openTools(this); };
  $("k2liveb").onclick = function(){ toggleLivePanel(); };
  $("k2menub").onclick = function(e){ e.stopPropagation(); openMenu(this); };
  $("k2clock").onclick = toggleLessonClock;
  $("k2timer").onclick = toggleTimer;
  $("k2timer").ondblclick = resetTimer;
  $("k2livechip").onclick = toggleLivePanel;
  qa(".k2start").forEach(function(b){ b.onclick = function(){ startLesson(); b.textContent = "Lesson started"; }; });
  setTool("pen"); paintColour();
  setInterval(tickClock, 1000); tickClock();
  D.addEventListener("click", function(e){ if(!e.target.closest(".k2pop")) closePops(); });
  D.addEventListener("keydown", onKey);
  D.addEventListener("fullscreenchange", function(){ BODY.classList.toggle("k2-fs", !!D.fullscreenElement); setTimeout(refit, 60); });
  buildTools();
}
var dockTimer = null;
function hideDock(){ var d = $("k2dock"); if(d) d.classList.add("away"); }
function showDock(){ var d = $("k2dock"); if(d) d.classList.remove("away"); }
function setTool(t){ tool = t; ["pen", "hi", "er"].forEach(function(k){ var b = $("k2" + k); if(b) b.setAttribute("aria-pressed", String((k === "er" ? "eraser" : k) === t)); }); }
function setFingerInk(on){ fingerInk = on; var b = $("k2finger"); if(b) b.setAttribute("aria-pressed", String(on)); toast(on ? "Finger and mouse now draw. They go back to moving on the next frame." : "Finger and mouse move, zoom and pan"); }
function paintColour(){ var d = $("k2cdot"); if(d) d.style.background = colour; }
function closePops(){ qa(".k2pop").forEach(function(p){ p.remove(); }); }
function pop(anchor, html){
  closePops();
  var p = mk("div", "k2pop", html); BODY.appendChild(p);
  var r = anchor.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight;
  p.style.left = clamp(r.left + r.width / 2 - pw / 2, 8, W.innerWidth - pw - 8) + "px";
  p.style.top = Math.max(8, r.top - ph - 10) + "px";
  return p;
}
function openColour(btn){
  var h = '<div class="row">' + COLOURS.map(function(c){ return '<button class="sw" type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Colour ' + c + '" aria-pressed="' + (c === colour) + '"></button>'; }).join("") + '</div>' +
    '<div class="row">' + [3, 5, 9, 16].map(function(w){ return '<button class="wd" type="button" data-w="' + w + '" aria-pressed="' + (w === widthPx) + '" aria-label="Thickness ' + w + '"><i style="width:' + (w + 2) + 'px;height:' + (w + 2) + 'px"></i></button>'; }).join("") + '</div>';
  var p = pop(btn, h);
  p.onclick = function(e){
    var s = e.target.closest(".sw"), w = e.target.closest(".wd");
    if(s){ colour = s.dataset.c; if(tool === "eraser") setTool("pen"); paintColour(); closePops(); }
    if(w){ widthPx = +w.dataset.w; closePops(); }
  };
}
function menuItem(id, label, key, cls){ return '<button class="mi ' + (cls || "") + '" type="button" data-a="' + id + '">' + esc(label) + (key ? '<kbd>' + key + '</kbd>' : '') + '</button>'; }
function openMenu(btn){
  var h = '<div class="mh">Lesson</div>' + menuItem("start", store.lesson ? "Restart the lesson clock" : "Start the lesson clock") +
    menuItem("list", "All frames and teacher notes", "L") + menuItem("fs", "Full screen", "F") + menuItem("hide", "Hide the controls", "U") +
    menuItem("edit", editing ? "Stop editing text" : "Edit text on the frames") + (editing ? menuItem("revert", "Undo my text edits on this frame") : "") +
    '<div class="mh">Look</div><div class="row" style="padding:2px 8px 6px">' + Object.keys(FONTS).map(function(t){ return '<button class="mi" type="button" data-theme-pick="' + t + '" style="padding:6px 10px">' + ({kit: "Kit", professional: "Professional", biology: "Biology", maths: "Maths", chemistry: "Chemistry", physics: "Physics", year7: "Year 7"})[t] + '</button>'; }).join("") + '</div>' +
    '<div class="mh">Students</div>' + menuItem("student", "Preview the student page") + menuItem("remote", "Phone remote") +
    '<div class="mh nofs">Saving</div>' + menuItem("dl", "Download with my ink", "", "nofs") + menuItem("backup", "Save a backup file", "", "nofs") +
    menuItem("restore", "Load a backup file", "", "nofs") + menuItem("recover", "Recover earlier ink", "", "nofs") +
    '<div class="mh nofs" style="font-weight:600">Saved in this browser <span id="k2save" data-s="ok"></span></div>';
  var p = pop(btn, h);
  p.onclick = function(e){
    var t = e.target.closest("[data-theme-pick]"); if(t){ setTheme(t.dataset.themePick); closePops(); return; }
    var b = e.target.closest(".mi"); if(!b) return; closePops();
    var a = b.dataset.a;
    if(a === "start") startLesson();
    if(a === "list") toggleList();
    if(a === "fs") toggleFS();
    if(a === "hide") toggleUI();
    if(a === "edit") setEditing(!editing);
    if(a === "revert") revertEdits();
    if(a === "student") W.open(location.pathname + "?view=student" + location.hash, "_blank");
    if(a === "remote") showRemoteInfo();
    if(a === "dl") downloadWithInk();
    if(a === "backup") downloadFile(DECK + "-backup.json", JSON.stringify(store), "application/json");
    if(a === "restore") loadBackup();
    if(a === "recover") recover();
  };
}
function openTools(btn){
  var p = pop(btn, '<button class="mi" type="button" data-t="calc">Calculator<kbd>C</kbd></button><button class="mi" type="button" data-t="proto">Protractor<kbd>R</kbd></button>');
  p.onclick = function(e){ var b = e.target.closest(".mi"); if(!b) return; closePops(); (b.dataset.t === "calc" ? $("btnCalc") : $("btnProto")).click(); };
}
function setTheme(t, quiet){
  THEME = t; BODY.setAttribute("data-theme", t); store.theme = t;
  frames.forEach(function(f){ if(!f.dataset.theme) f.dataset.skin = t; });
  if(usedThemes.indexOf(t) < 0){ usedThemes.push(t); loadFonts([t]); }
  if(!quiet){ save(); toast("Theme: " + t + ". Frames with their own theme keep it."); }
  setTimeout(refit, 50);
}
function toggleFS(){ if(D.fullscreenElement) D.exitFullscreen(); else if(D.documentElement.requestFullscreen) D.documentElement.requestFullscreen(); }
var uiHidden = false;
function toggleUI(){ uiHidden = !uiHidden; ["k2dock", "k2tr", "k2tl", "k2edge"].forEach(function(id){ var e = $(id); if(e) e.style.display = uiHidden ? "none" : ""; }); if(uiHidden) toast("Controls hidden. Press U to bring them back."); }
var toastT = null;
function toast(msg){ var t = $("k2toast"); if(!t){ t = mk("div"); t.id = "k2toast"; t.setAttribute("role", "status"); BODY.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function(){ t.hidden = true; }, 2600); }

function updateChrome(){
  var f = frames[cur];
  $("k2count").textContent = (cur + 1) + " / " + frames.length;
  var badge = $("k2badge");
  if(f.dataset.kind !== "slide" && !f.querySelector(":scope > .head")){ badge.hidden = false; badge.innerHTML = '<span class="k2chip" data-mode="' + f.dataset.mode + '">' + chipHTML(f.dataset.mode, f.dataset.say) + '</span>'; }
  else badge.hidden = true;
  setupTimer(f);
  if(!$("k2list").hidden) renderList();
}
/* clock and lesson clock */
function fmt(sec){ sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }
function tickClock(){
  var d = new Date(); var h = d.getHours() % 12 || 12;
  $("k2time").textContent = h + ":" + String(d.getMinutes()).padStart(2, "0");
  var L = store.lesson;
  $("k2lesson").textContent = L ? Math.floor(((L.paused || now()) - L.start) / 60000) + " / " + (+BODY.dataset.mins || 80) + " min" + (L.paused ? " paused" : "") : "";
  tickTimer();
}
function startLesson(){ store.lesson = {start: now()}; save(); tickClock(); toast("Lesson clock started"); if(LIVE.on) sendState(); }
function toggleLessonClock(){
  var L = store.lesson; if(!L){ startLesson(); return; }
  if(L.paused){ L.start += now() - L.paused; L.paused = 0; } else L.paused = now();
  save(); tickClock();
}
/* per frame countdown */
var timers = {};
function setupTimer(f){
  var b = $("k2timer"), secs = +f.dataset.timer;
  if(!secs){ b.hidden = true; return; }
  var T = timers[f.dataset.id] || (timers[f.dataset.id] = {total: secs, left: secs, run: false, last: 0});
  b.hidden = false; paintTimer(T);
}
function curTimer(){ var f = frames[cur]; return f && timers[f.dataset.id]; }
function paintTimer(T){ var b = $("k2timer"); b.textContent = fmt(T.left); b.classList.toggle("paused", !T.run); b.classList.toggle("over", T.left <= 0); b.title = T.run ? "Tap to pause. Double tap to reset." : "Tap to start the timer. Double tap to reset."; }
function toggleTimer(){ var T = curTimer(); if(!T) return; if(T.left <= 0){ T.left = T.total; } T.run = !T.run; T.last = now(); paintTimer(T); if(LIVE.on) sendState(); }
function resetTimer(){ var T = curTimer(); if(!T) return; T.left = T.total; T.run = false; paintTimer(T); }
function tickTimer(){
  for(var k in timers){
    var T = timers[k]; if(!T.run) continue;
    var dt = (now() - T.last) / 1000; T.last = now(); var was = T.left; T.left -= dt;
    if(was > 0 && T.left <= 0){ T.left = 0; T.run = false; chime(); }
  }
  var c = curTimer(); if(c) paintTimer(c);
}
function chime(){
  try{
    var A = W.AudioContext || W.webkitAudioContext; if(!A) return; var a = new A();
    [0, 0.22].forEach(function(t, i){ var o = a.createOscillator(), g = a.createGain(); o.frequency.value = i ? 880 : 660; o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(0.0001, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.5);
      o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.55); });
  }catch(e){}
}
/* frame list with teacher notes */
function buildList(){
  var l = mk("div"); l.id = "k2list"; l.hidden = true;
  l.innerHTML = '<div class="lh">All frames<button class="dk" type="button" id="k2listx" aria-label="Close">&#215;</button></div><div class="li" id="k2li"></div>';
  BODY.appendChild(l); $("k2listx").onclick = toggleList;
}
function toggleList(){ var l = $("k2list"); l.hidden = !l.hidden; if(!l.hidden) renderList(); }
function renderList(){
  var h = [], part = null, mins = 0;
  frames.forEach(function(f, i){
    if(f.dataset.part && f.dataset.part !== part){ part = f.dataset.part; h.push('<div class="part">' + esc(part) + '</div>'); }
    var kind = {slide: "slide", scroll: "page", map: "map"}[f.dataset.kind] || "slide";
    mins += +f.dataset.mins || 0;
    h.push('<button class="it' + (i === cur ? ' on' : '') + '" type="button" data-i="' + i + '"><i style="background:var(--' + f.dataset.mode + ')"></i>' + esc(frameTitle(f)) + '<span class="kd">' + kind + (f.dataset.mins ? ' ' + f.dataset.mins + 'm' : '') + '</span></button>');
    if(i === cur){ var s = f.querySelector("aside.script"); if(s) h.push('<div class="script">' + s.innerHTML.trim() + '</div>'); }
  });
  h.push('<div class="part">Planned ' + mins + ' of ' + (+BODY.dataset.mins || 80) + ' minutes</div>');
  var li = $("k2li"); li.innerHTML = h.join("");
  li.onclick = function(e){ var b = e.target.closest(".it"); if(b) go(+b.dataset.i); };
}
function onKey(e){
  var t = e.target; if(t && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
  if((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")){ e.preventDefault(); undoInk(e.shiftKey); return; }
  if((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")){ e.preventDefault(); undoInk(true); return; }
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  var k = e.key, f = frames[cur], done = true;
  if(k === "ArrowRight" || k === "PageDown" || k === " ") next();
  else if(k === "ArrowLeft" || k === "PageUp") prev();
  else if(k === "ArrowDown" && f.dataset.kind !== "slide"){ scrollBy(160); }
  else if(k === "ArrowUp" && f.dataset.kind !== "slide"){ scrollBy(-160); }
  else if(k === "Home") go(0); else if(k === "End") go(frames.length - 1);
  else if(k === "p" || k === "P") setTool("pen"); else if(k === "h" || k === "H") setTool("hi"); else if(k === "e" || k === "E") setTool("eraser");
  else if(k === "d" || k === "D") setFingerInk(!fingerInk);
  else if(k === "0" || k === "Escape"){ closePops(); (layout === "wsonly" ? wsP : mainP).animateFit(); }
  else if(k === "w" || k === "W") cycleLayout();
  else if(k === "l" || k === "L") toggleList();
  else if(k === "f" || k === "F") toggleFS();
  else if(k === "u" || k === "U") toggleUI();
  else if(k === "s" || k === "S") stepCurrent();
  else if(k === "a" || k === "A") answersCurrent();
  else if(k === "g" || k === "G"){ var g = f.querySelector(".gapall"); if(g) g.click(); }
  else if(k === "c" || k === "C"){ $("btnCalc").click(); }
  else if(k === "n" || k === "N"){ if(LIVE.on) nominate(); }
  else if(k === "b" || k === "B"){ toggleBlank(); }
  else if(k === "t" || k === "T"){ toggleTimer(); }
  else done = false;
  if(done && k !== "c" && k !== "C") e.preventDefault();
}
function toggleBlank(){ var b = $("k2blank"); if(!b){ b = mk("div"); b.id = "k2blank"; b.hidden = true; b.onclick = toggleBlank; BODY.appendChild(b); } b.hidden = !b.hidden; }

/* ---------- walkthrough steps, gaps, answers ---------- */
function initWalk(){
  qa(".stepbtn").forEach(function(b){
    var ol = $(b.dataset.steps); if(!ol) return;
    var items = qa("li", ol); items.forEach(function(li){ li.classList.add("hid"); });
    b._label = b.textContent;
    b.onclick = function(){
      var nextLi = items.filter(function(li){ return li.classList.contains("hid"); })[0];
      if(nextLi){ nextLi.classList.remove("hid"); }
      else{ items.forEach(function(li){ li.classList.add("hid"); }); }
      var left = items.filter(function(li){ return li.classList.contains("hid"); }).length;
      b.textContent = left ? (left === items.length ? b._label : "Next step") : "Hide the steps";
      if(LIVE.on) sendState();
    };
  });
}
function stepCurrent(){ var b = frames[cur].querySelector(".stepbtn"); if(b) b.click(); }
function answersCurrent(){
  var f = frames[cur]; var b = f.querySelector(".ansall");
  if(b) b.click(); else{ f.classList.toggle("showans"); toast(f.classList.contains("showans") ? "Answers showing" : "Answers hidden"); }
}
function initGaps(){
  qa(".gap").forEach(function(g){ g.type = "button"; g.addEventListener("click", function(){ g.classList.toggle("on"); }); });
  qa(".gapall").forEach(function(b){ b.onclick = function(){
    var host = b.closest(".sec") || b.closest(".frame"), gs = qa(".gap", host);
    var anyOff = gs.some(function(g){ return !g.classList.contains("on"); });
    gs.forEach(function(g){ g.classList.toggle("on", anyOff); }); b.textContent = anyOff ? "Hide the gaps" : "Fill the gaps";
  }; });
  qa(".ansall").forEach(function(b){ b.onclick = function(){
    var host = b.closest(".sec") || b.closest(".frame"), on = !host.classList.contains("showans");
    host.classList.toggle("showans", on); b.textContent = on ? "Hide answers" : "Show answers";
  }; });
}

/* ---------- edit mode: retype text on the frames ---------- */
function markEditable(){
  frames.forEach(function(f){
    var i = 0;
    qa("h1,h2,h3,p,li,td,th,figcaption,.qbody,.lq,.node p", f).forEach(function(e){
      if(e.closest(".k2chip,.k2ink,.live .lctl,button,.tex") || e.querySelector("button,input,.tex,svg,.gap")) return;
      e.setAttribute("data-k2edit", f.dataset.id + ":" + (i++));
    });
  });
}
function applyEdits(){
  for(var fid in store.edits){ var m = store.edits[fid]; for(var k in m){ var e = D.querySelector('[data-k2edit="' + fid + ":" + k + '"]'); if(e) e.innerHTML = m[k]; } }
}
function setEditing(on){
  editing = on; BODY.classList.toggle("k2-edit", on);
  qa("[data-k2edit]").forEach(function(e){
    if(on){ e._orig = e._orig == null ? e.innerHTML : e._orig; e.contentEditable = "true"; e.oninput = function(){ var p = e.dataset.k2edit.split(":"); (store.edits[p[0]] = store.edits[p[0]] || {})[p[1]] = e.innerHTML; save(); }; }
    else{ e.removeAttribute("contenteditable"); e.oninput = null; }
  });
  toast(on ? "Editing: tap any text to retype it. The pen is paused." : "Edits saved");
}
function revertEdits(){
  var fid = frames[cur].dataset.id; delete store.edits[fid];
  qa('[data-k2edit^="' + fid + ':"]').forEach(function(e){ if(e._orig != null) e.innerHTML = e._orig; });
  save(); toast("Text on this frame is back to the original");
}

/* ---------- saving to files ---------- */
function downloadFile(name, text, type){
  var a = mk("a"); a.href = URL.createObjectURL(new Blob([text], {type: type || "text/html"})); a.download = name;
  BODY.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function inlineAssets(html){
  var jobs = [];
  var cssM = html.match(/<link[^>]+href="([^"]*kit\.css)"[^>]*>/), jsM = html.match(/<script[^>]+src="([^"]*kit\.js)"[^>]*><\/script>/);
  if(cssM) jobs.push(fetch(cssM[1]).then(function(r){ return r.text(); }).then(function(t){ html = html.replace(cssM[0], function(){ return "<style>" + t + "</style>"; }); }));
  if(jsM) jobs.push(fetch(jsM[1]).then(function(r){ return r.text(); }).then(function(t){ html = html.replace(jsM[0], function(){ return "<script>" + t.replace(/<\/script/gi, "<\\/script") + "</script>"; }); }));
  return Promise.all(jobs).then(function(){ return html; });
}
function downloadWithInk(){
  doSave();
  var html = SOURCE.replace(/<script type="application\/json" id="k2baked">[\s\S]*?<\/script>/, "");
  var baked = '<script type="application/json" id="k2baked">' + JSON.stringify(store).replace(/</g, "\\u003c") + "</script>";
  html = html.replace(/<main id="deck"/, baked + '\n<main id="deck"');
  inlineAssets(html).then(function(h){ downloadFile(DECK + "-with-ink.html", h); toast("Downloaded a copy with your ink"); }).catch(function(){ toast("Could not fetch the engine to bundle it. Try again on Learning Home."); });
}
function loadBackup(){
  var inp = mk("input"); inp.type = "file"; inp.accept = ".json,application/json";
  inp.onchange = function(){ var fl = inp.files[0]; if(!fl) return; fl.text().then(function(t){ try{ var s = JSON.parse(t); if(!s || !s.ink) throw 0; replaceStore(s); toast("Backup loaded"); }catch(e){ toast("That file is not a Kit 2 backup"); } }); };
  inp.click();
}
function recover(){
  var raw = readLS(LS + "-prev"); if(!raw){ toast("No earlier copy is stored in this browser"); return; }
  try{ var s = JSON.parse(raw); if(!confirm("Load the earlier copy of your ink? What is on screen now will be replaced.")) return; replaceStore(s); toast("Earlier ink recovered"); }catch(e){ toast("The earlier copy could not be read"); }
}
function replaceStore(s){
  for(var k in store) if(s[k] != null) store[k] = s[k];
  for(var key in surfaces){ surfaces[key].undo = []; surfaces[key].redo = []; surfaces[key].render(); }
  applyEdits(); if(layout !== "slide") loadWs(); allowEmpty = true; doSave();
}
