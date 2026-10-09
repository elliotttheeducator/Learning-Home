
/* ============================================================
   EDIT MODE: drag polls, text, storyboards and more onto a frame;
   select (click, Shift+click or drag a box), move, resize, hide.
   Edits are a layer over the deck file: only the extras and the
   differences are kept (on Learning Home in D1 at
   /api/deck/<deck>/edits, and a copy in this browser). The layer
   goes onto the frames before either view is built, so the
   teacher deck and every student page come from the same frames.
   ============================================================ */
var LAYER = {v: 1, t: "", frames: {}}, LKEY = "kit2e:" + DECK;
var ED = {on: false, sel: [], hist: [], boot: "", drag: null, putT: null, status: ""};
// Things on a frame that can be picked, moved, resized or hidden.
var LIVETYPES = {poll: 1, wall: 1, question: 1, yt: 1};

function loadLayer(cb){
  var local = null; try{ local = JSON.parse(lsGet(LKEY, "null")); }catch(e){ local = null; }
  var done = false;
  function fin(cloud){
    if(done) return; done = true;
    var pick = cloud;
    if(local && local.frames && (!pick || (local.t || "") > (pick.t || ""))) pick = local;
    if(pick && pick.frames) LAYER = {v: 1, t: pick.t || "", frames: pick.frames};
    // A newer copy on this computer than in the cloud: send it up (teacher only, checked by the server).
    if(VIEW === "teacher" && ON_LH && local && pick === local && cloud !== local) ED.pushLater = true;
    try{ applyLayer(); }catch(e){ if(W.console) console.error(e); }
    cb();
  }
  if(!ON_LH){ fin(null); return; }
  setTimeout(function(){ fin(null); }, 2500);
  fetch("/api/deck/" + encodeURIComponent(DECK) + "/edits", {cache: "no-store"})
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){ fin(j && j.data ? j.data : null); }, function(){ fin(null); });
}

/* ---------- putting the layer on the frames ---------- */
// Every block on a frame gets a key from its place in the file, so a move or a hide finds the
// same thing again on the teacher deck and on every student page. Clicking picks the smallest
// block; "Select the bigger box" climbs out.
var NOKEY = /^(SPAN|B|I|EM|STRONG|SUP|SUB|BR|SMALL|KBD|CODE|U|S|MARK|ABBR|WBR|SCRIPT|STYLE|TEMPLATE|SOURCE|TRACK|OPTION)$/;
function keyFrames(){
  frames.forEach(function(f){
    (function walk(n, path){
      for(var i = 0; i < n.children.length; i++){
        var c = n.children[i], p = path ? path + "." + i : String(i);
        if(c.matches("aside.script,.k2ink,.k2add,.k2edui,.tex,.katex,.k2chip")) continue;
        if(!NOKEY.test(c.tagName) && !c.hasAttribute("data-k2key")) c.setAttribute("data-k2key", p);
        if(c.tagName.toLowerCase() !== "svg") walk(c, p);
      }
    })(f, "");
  });
}
function frameById(fid){ for(var i = 0; i < frames.length; i++) if(frames[i].dataset.id === fid) return frames[i]; return null; }
function applyLayer(){
  keyFrames();
  frames.forEach(function(f){ applyFrame(f, true); });
  ED.boot = liveSig();
}
// real: build polls, walls and questions as real blocks (at load). In edit mode they are previews
// until the deck reloads, which happens when you leave edit mode.
function applyFrame(f, real){
  var L = LAYER.frames[f.dataset.id] || {};
  qa("[data-k2key]", f).forEach(function(e){
    var m = (L.mod || {})[e.getAttribute("data-k2key")];
    if(e._k2html != null && !(m && m.html != null)){ e.innerHTML = e._k2html; e._k2html = null; }
    e.style.translate = ""; e.style.scale = ""; e.classList.remove("k2hidden");
    if(!m) return;
    if(m.x || m.y) e.style.translate = (m.x || 0) + "px " + (m.y || 0) + "px";
    if(m.s && m.s !== 1){ e.style.scale = String(m.s); e.style.transformOrigin = "0 0"; }
    if(m.hide) e.classList.add("k2hidden");
    if(m.html != null){ if(e._k2html == null) e._k2html = e.innerHTML; e.innerHTML = m.html; }
  });
  qa(":scope > .k2add", f).forEach(function(n){ n.remove(); });
  (L.add || []).forEach(function(it){ f.appendChild(renderItem(it, real)); });
}
function renderItem(it, real){
  var w = mk("div", "k2add"); w.dataset.add = it.id; w.dataset.type = it.type;
  w.style.left = (it.x || 0) + "px"; w.style.top = (it.y || 0) + "px"; w.style.width = (it.w || 400) + "px";
  if(it.h) w.style.height = it.h + "px";
  if(it.z) w.style.zIndex = it.z;
  if(it.rot) w.style.rotate = it.rot + "deg";
  var h = "";
  if(it.type === "text") h = '<div class="k2txt" style="font-size:' + (it.fs || 30) + 'px;color:' + esc(it.c || "#1b2135") + '">' + (it.html || "Text") + '</div>';
  else if(it.type === "note") h = '<div class="k2note" style="font-size:' + (it.fs || 26) + 'px;background:' + esc(it.c || "#FFE066") + '">' + (it.html || "Note") + '</div>';
  else if(it.type === "story") h = storyHTML(it);
  else if(it.type === "write") h = '<div class="work' + (it.lined === false ? "" : " lined") + '" data-label="' + esc(it.label || "Write here") + '"></div>';
  else if(it.type === "image") h = '<figure class="img k2img"><img src="' + esc(it.src || "") + '" alt="' + esc(it.alt || "") + '">' + (it.cap ? '<figcaption>' + esc(it.cap) + '</figcaption>' : '') + '</figure>';
  else if(it.type === "arrow") h = '<svg class="k2arrow" viewBox="0 0 200 40" preserveAspectRatio="none"><path d="M4 20H170" stroke="' + esc(it.c || "#E8590C") + '" stroke-width="10" stroke-linecap="round"/><path d="M160 4L196 20L160 36Z" fill="' + esc(it.c || "#E8590C") + '"/></svg>';
  else if(it.type === "start") h = '<div class="k2startw"><span class="pen">&#9998;</span>' + esc(it.text || "Pens on paper: start writing now") + '</div>';
  else if(!real) h = livePreview(it);
  else if(it.type === "poll") h = '<div class="live-poll" data-id="' + esc(it.id) + '" data-choices="' + esc((it.choices || []).join("|")) + '"' + (it.answer ? ' data-answer="' + esc(it.answer) + '"' : '') + '>' + esc(it.q || "Question") + '</div>';
  else if(it.type === "wall") h = '<div class="live-wall" data-id="' + esc(it.id) + '">' + esc(it.q || "Question") + '</div>';
  else if(it.type === "question") h = '<div class="activity" data-id="' + esc(it.id) + '" data-title="' + esc(it.title || "Your turn") + '">' + (it.qs || []).map(function(q){
      return '<div class="q" data-tier="' + esc(q.tier || "bronze") + '"' + (q.a ? ' data-answer="' + esc(q.a) + '"' : '') + (q.choices ? ' data-choices="' + esc(q.choices) + '"' : '') + '>' + esc(q.text || "") + '</div>';
    }).join("") + '</div>';
  else if(it.type === "yt") h = '<div class="yt" data-yt="' + esc(it.url || "") + '"' + (it.start ? ' data-start="' + esc(it.start) + '"' : '') + (it.end ? ' data-end="' + esc(it.end) + '"' : '') + '></div>';
  w.innerHTML = h;
  return w;
}
function storyHTML(it){
  var n = clamp(+it.n || 4, 2, 6), caps = it.caps || [];
  var h = '<div class="k2story">' + (it.title ? '<div class="sbt">' + esc(it.title) + '</div>' : '') + '<div class="sbrow">';
  for(var i = 0; i < n; i++) h += '<div class="sbp"><span class="sbn">' + (i + 1) + '</span><div class="sbbox"></div><div class="sbcap">' + esc(caps[i] || "") + '</div></div>';
  return h + '</div></div>';
}
function livePreview(it){
  var name = {poll: "Poll", wall: "Class wall", question: "Your turn questions", yt: "YouTube video"}[it.type] || it.type, body = "";
  if(it.type === "poll") body = '<b>' + esc(it.q || "") + '</b><ul>' + (it.choices || []).map(function(c){ return '<li' + (c === it.answer ? ' class="ok"' : '') + '>' + esc(c) + '</li>'; }).join("") + '</ul>';
  if(it.type === "wall") body = '<b>' + esc(it.q || "") + '</b>';
  if(it.type === "question") body = '<b>' + esc(it.title || "") + '</b><ol>' + (it.qs || []).map(function(q){ return '<li><span class="tierdot ' + esc(q.tier || "bronze") + '"></span>' + esc(q.text) + (q.a ? ' <i>(' + esc(q.a) + ')</i>' : '') + '</li>'; }).join("") + '</ol>';
  if(it.type === "yt") body = '<b>' + esc(it.url || "No link yet") + '</b>';
  return '<div class="k2pv"><span class="k2pvt">' + name + '</span>' + body + '<small>Ready for students when you finish editing.</small></div>';
}
// Fingerprint of the blocks that need a reload to switch on.
function liveSig(){
  var out = [];
  Object.keys(LAYER.frames).sort().forEach(function(fid){ (LAYER.frames[fid].add || []).forEach(function(it){ if(LIVETYPES[it.type]){ var c = {}; for(var k in it) if("xywhz".indexOf(k) < 0 || k.length > 1) c[k] = it[k]; out.push(fid + JSON.stringify(c)); } }); });
  return out.join("\n");
}

/* ---------- saving ---------- */
function saveLayer(){
  LAYER.t = new Date().toISOString();
  lsSet(LKEY, JSON.stringify(LAYER));
  edStatus("Saving");
  clearTimeout(ED.putT); ED.putT = setTimeout(pushLayer, 900);
}
function pushLayer(){
  if(!ON_LH){ edStatus("Saved on this computer"); return; }
  fetch("/api/deck/" + encodeURIComponent(DECK) + "/edits", {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify({data: LAYER})})
    .then(function(r){ edStatus(r.ok ? "Saved for every device" : "Saved on this computer only (sign in again to save online)"); }, function(){ edStatus("Saved on this computer only (offline)"); });
}
function edStatus(s){ ED.status = s; var e = $("k2edstat"); if(e) e.textContent = s; }
function frameLayer(f){ var fid = f.dataset.id; return LAYER.frames[fid] = LAYER.frames[fid] || {add: [], mod: {}}; }
function snapshot(){ var f = frames[cur]; ED.hist.push({fid: f.dataset.id, data: JSON.stringify(LAYER.frames[f.dataset.id] || {add: [], mod: {}})}); if(ED.hist.length > 60) ED.hist.shift(); }
function undoEdit(){
  var h = ED.hist.pop(); if(!h){ toast("Nothing to undo"); return; }
  LAYER.frames[h.fid] = JSON.parse(h.data); var f = frameById(h.fid);
  if(f){ applyFrame(f, false); }
  edSelect([]); saveLayer();
}

/* ---------- the palette ---------- */
var PALETTE = [
  ["text", "Text", "T"], ["note", "Sticky note", "&#9632;"], ["start", "Start writing", "&#9998;"], ["poll", "Poll", "&#9636;"], ["wall", "Class wall", "&#9783;"],
  ["question", "Questions", "?"], ["story", "Storyboard", "&#9638;"], ["write", "Writing space", "&#9776;"],
  ["image", "Picture", "&#9635;"], ["yt", "YouTube", "&#9654;"], ["arrow", "Arrow", "&#10142;"]
];
function newItem(type){
  var it = {id: "e" + rid(), type: type, x: 0, y: 0, w: 420};
  if(type === "text"){ it.html = "Type here"; it.fs = 34; it.w = 520; }
  if(type === "note"){ it.html = "Note"; it.w = 300; it.h = 220; it.c = "#FFE066"; }
  if(type === "start"){ it.text = "Pens on paper: start writing now"; it.w = 760; }
  if(type === "poll"){ it.q = "Which is right?"; it.choices = ["A", "B", "C"]; it.w = 640; }
  if(type === "wall"){ it.q = "What do you think?"; it.w = 700; }
  if(type === "question"){ it.title = "Your turn"; it.qs = [{text: "Question", a: "", tier: "bronze"}]; it.w = 640; }
  if(type === "story"){ it.title = "Storyboard"; it.n = 4; it.caps = []; it.w = 1200; it.h = 380; }
  if(type === "write"){ it.label = "Write here"; it.w = 700; it.h = 260; }
  if(type === "image"){ it.src = ""; it.w = 500; }
  if(type === "yt"){ it.url = ""; it.w = 720; }
  if(type === "arrow"){ it.w = 260; it.h = 52; it.c = "#E8590C"; }
  return it;
}
function buildEditBar(){
  var p = mk("div"); p.id = "k2pal";
  p.innerHTML = '<div class="pt">Edit mode</div><div class="ph">Drag onto the slide, or click to add</div>' +
    PALETTE.map(function(x){ return '<button type="button" class="pi" data-add="' + x[0] + '"><span class="ic">' + x[2] + '</span>' + x[1] + '</button>'; }).join("") +
    '<div class="psep"></div><button type="button" class="pb" data-ed="undo">Undo<kbd>Ctrl Z</kbd></button><button type="button" class="pb" data-ed="unhide">Show hidden things</button>' +
    '<button type="button" class="pb" data-ed="reset">Reset this slide</button><button type="button" class="pb done" data-ed="done">Done</button><div class="pst" id="k2edstat"></div>';
  BODY.appendChild(p);
  var tb = mk("div"); tb.id = "k2edtb"; tb.hidden = true; BODY.appendChild(tb);
  tb.addEventListener("click", function(e){ var b = e.target.closest("[data-tb]"); if(b) toolbarAction(b.dataset.tb); });
  p.addEventListener("click", function(e){
    var b = e.target.closest("[data-ed]"); if(!b) return;
    var a = b.dataset.ed;
    if(a === "done") setEditMode(false);
    if(a === "undo") undoEdit();
    if(a === "unhide"){ var L = frameLayer(frames[cur]), n = 0; snapshot(); for(var k in L.mod){ if(L.mod[k].hide){ delete L.mod[k].hide; n++; } } applyFrame(frames[cur], false); saveLayer(); toast(n ? n + " brought back" : "Nothing hidden on this slide"); }
    if(a === "reset"){ if(!confirm("Take every edit off this slide? Added things are removed and moved things go back.")) return; snapshot(); delete LAYER.frames[frames[cur].dataset.id]; applyFrame(frames[cur], false); edSelect([]); saveLayer(); }
  });
  // Drag from the palette (or click to add in the middle of the view).
  p.addEventListener("pointerdown", function(e){
    var b = e.target.closest("[data-add]"); if(!b) return;
    e.preventDefault();
    var g = mk("div", "k2ghost", b.innerHTML); BODY.appendChild(g);
    ED.pal = {type: b.dataset.add, x0: e.clientX, y0: e.clientY, g: g, moved: false};
    g.style.left = e.clientX + "px"; g.style.top = e.clientY + "px";
  });
  W.addEventListener("pointermove", function(e){
    if(!ED.pal) return;
    ED.pal.g.style.left = e.clientX + "px"; ED.pal.g.style.top = e.clientY + "px";
    if(Math.hypot(e.clientX - ED.pal.x0, e.clientY - ED.pal.y0) > 8) ED.pal.moved = true;
  });
  W.addEventListener("pointerup", function(e){
    if(!ED.pal) return;
    var d = ED.pal; ED.pal = null; d.g.remove();
    var r = $("k2main").getBoundingClientRect(), inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom && !e.target.closest("#k2pal");
    if(d.moved && !inside) return;
    var pt = d.moved ? wpt(e.clientX, e.clientY) : wpt(r.left + r.width / 2, r.top + r.height / 2);
    addItem(newItem(d.type), pt, true);
  });
}
function addItem(it, pt, centre, quiet){
  var f = frames[cur];
  snapshot();
  var hh = it.h || 160;
  it.x = Math.round(pt.x - (centre ? it.w / 2 : 0)); it.y = Math.round(pt.y - (centre ? hh / 2 : 0));
  it.x = clamp(it.x, 0, Math.max(0, f.offsetWidth - 60)); it.y = Math.max(0, it.y);
  frameLayer(f).add.push(it);
  applyFrame(f, false); saveLayer();
  var el = f.querySelector('.k2add[data-add="' + it.id + '"]');
  edSelect(el ? [el] : []);
  if(quiet) return;
  if(it.type !== "text" && it.type !== "note" && it.type !== "arrow" && it.type !== "write") openItemForm(it);
  else if(el && it.type !== "arrow" && it.type !== "write") startTextEdit(el);
}

/* ---------- turning it on and off ---------- */
function setEditMode(on){
  if(on === ED.on) return;
  ED.on = on; editing = on; BODY.classList.toggle("k2-editmode", on);
  if(!$("k2pal")) buildEditBar();
  $("k2pal").hidden = !on;
  setTimeout(function(){ refit(); paintSel(); }, 30);
  if(on){ ED.fid = frames[cur].dataset.id; toast("Edit mode: drag things in, click to select, drag to move. The pen is paused."); if(ED.status) edStatus(ED.status); return; }
  stopTextEdit(); edSelect([]);
  clearTimeout(ED.putT); if(ED.status === "Saving") pushLayer();
  // New or changed polls, walls and questions switch on with a reload (ink and answers are saved first).
  if(liveSig() !== ED.boot){
    toast("Switching on the new blocks");
    if(LIVE.on && LIVE.T) LIVE.T.send({t: "edits", at: LAYER.t});
    setTimeout(function(){ try{ doSave(); }catch(e){} location.reload(); }, 1400);
    return;
  }
  if(LIVE.on && LIVE.T) LIVE.T.send({t: "edits", at: LAYER.t});
  toast("Edits saved");
}
function edFrameChanged(){ if(!ED.on) return; stopTextEdit(); edSelect([]); ED.fid = frames[cur].dataset.id; }

/* ---------- selecting ---------- */
function pickable(t){
  var f = frames[cur]; if(!t || !f.contains(t)) return null;
  return t.closest(".k2add") || t.closest("[data-k2key]");
}
function edSelect(list){
  ED.sel = list.filter(function(e){ return e && e.isConnected; });
  paintSel();
}
function worldRect(el){
  var r = el.getBoundingClientRect(), a = wpt(r.left, r.top), b = wpt(r.right, r.bottom);
  return {x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y};
}
function paintSel(){
  var f = frames[cur], ov = f.querySelector(":scope > .k2edui");
  qa(".k2edui").forEach(function(o){ if(o !== ov) o.remove(); });
  var tb = $("k2edtb");
  if(!ED.on || !ED.sel.length){ if(ov) ov.remove(); if(tb) tb.hidden = true; return; }
  if(!ov){ ov = mk("div", "k2edui"); f.appendChild(ov); }
  var s = 1 / (mainP.cam.s || 1), h = "";
  ED.sel.forEach(function(el, i){
    var r = worldRect(el);
    h += '<div class="k2selbox" style="left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px;border-width:' + (3 * s) + 'px"></div>';
    if(i === ED.sel.length - 1 && ED.sel.length === 1) h += '<div class="k2rh" style="left:' + (r.x + r.w - 11 * s) + 'px;top:' + (r.y + r.h - 11 * s) + 'px;width:' + (22 * s) + 'px;height:' + (22 * s) + 'px"></div>';
  });
  if(ED.box) h += '<div class="k2marq" style="left:' + ED.box.x + 'px;top:' + ED.box.y + 'px;width:' + ED.box.w + 'px;height:' + ED.box.h + 'px;border-width:' + (2 * s) + 'px"></div>';
  ov.innerHTML = h;
  // toolbar above the selection, in screen space
  var one = ED.sel.length === 1 ? ED.sel[0] : null, add = one && one.classList.contains("k2add"), t = "";
  if(one && (add || textOnly(one))) t += '<button data-tb="edit">' + (add && !/text|note|start/.test(one.dataset.type) ? "Settings" : "Edit text") + '</button>';
  if(one && add && /text|note/.test(one.dataset.type)) t += '<button data-tb="smaller">A-</button><button data-tb="bigger">A+</button><button data-tb="colour">Colour</button>';
  if(one && add && one.dataset.type === "arrow") t += '<button data-tb="turn">Turn</button><button data-tb="colour">Colour</button>';
  if(ED.sel.some(function(e){ return e.classList.contains("k2add"); })) t += '<button data-tb="dup">Duplicate</button><button data-tb="front">To front</button>';
  if(one && !add && one.parentNode.closest("[data-k2key]")) t += '<button data-tb="bigger-sel">Select the bigger box</button>';
  if(ED.sel.some(function(e){ return !e.classList.contains("k2add"); })) t += '<button data-tb="reset">Put back</button>';
  t += '<button data-tb="del" class="del">' + (ED.sel.every(function(e){ return e.classList.contains("k2add"); }) ? "Delete" : "Hide") + '</button>';
  tb.innerHTML = t; tb.hidden = false;
  var rr = ED.sel[0].getBoundingClientRect();
  ED.sel.forEach(function(e){ var q = e.getBoundingClientRect(); rr = {left: Math.min(rr.left, q.left), top: Math.min(rr.top, q.top), right: Math.max(rr.right, q.right)}; });
  tb.style.left = clamp(rr.left, 100, innerWidth - tb.offsetWidth - 8) + "px";
  tb.style.top = (rr.top - tb.offsetHeight - 10 < 8 ? Math.min(innerHeight - tb.offsetHeight - 8, (rr.bottom || rr.top + 40) + 10) : rr.top - tb.offsetHeight - 10) + "px";
}
function textOnly(el){ return !el.querySelector("button,input,textarea,select,svg,canvas,img,video,iframe,.tex,.gap,.live,.activity,.k2add") && !el.closest(".live,.activity"); }

/* ---------- what the toolbar does ---------- */
function itemOf(el){ var L = frameLayer(frames[cur]); for(var i = 0; i < L.add.length; i++) if(L.add[i].id === el.dataset.add) return L.add[i]; return null; }
function modOf(el){ var L = frameLayer(frames[cur]), k = el.getAttribute("data-k2key"); return L.mod[k] = L.mod[k] || {}; }
function cleanMod(el){ var L = frameLayer(frames[cur]), k = el.getAttribute("data-k2key"), m = L.mod[k]; if(m && !m.x && !m.y && !m.hide && (!m.s || m.s === 1) && m.html == null) delete L.mod[k]; }
var COLOURS = ["#1b2135", "#C2261D", "#E8590C", "#2F9E44", "#1971C2", "#7048E8", "#FFE066", "#B2F2BB", "#A5D8FF", "#FFC9C9"];
function toolbarAction(a){
  var f = frames[cur], one = ED.sel[0];
  if(a === "edit"){ if(one.classList.contains("k2add") && !/text|note|start/.test(one.dataset.type)) openItemForm(itemOf(one)); else if(one.dataset.type === "start") openItemForm(itemOf(one)); else startTextEdit(one); return; }
  snapshot();
  if(a === "smaller" || a === "bigger"){ var it = itemOf(one); it.fs = clamp((it.fs || 30) + (a === "bigger" ? 4 : -4), 14, 120); }
  if(a === "colour"){ var it2 = itemOf(one), i = COLOURS.indexOf(it2.c); it2.c = COLOURS[(i + 1) % COLOURS.length]; }
  if(a === "turn"){ var it3 = itemOf(one); it3.rot = ((it3.rot || 0) + 45) % 360; }
  if(a === "dup"){ var L = frameLayer(f), ids = []; ED.sel.forEach(function(e){ var o = itemOf(e); if(!o) return; var c = JSON.parse(JSON.stringify(o)); c.id = "e" + rid(); c.x += 30; c.y += 30; L.add.push(c); ids.push(c.id); });
    applyFrame(f, false); saveLayer(); edSelect(ids.map(function(id){ return f.querySelector('.k2add[data-add="' + id + '"]'); })); return; }
  if(a === "front"){ var z = 1; frameLayer(f).add.forEach(function(o){ z = Math.max(z, (o.z || 1) + 1); }); ED.sel.forEach(function(e){ var o = itemOf(e); if(o) o.z = z; }); }
  if(a === "bigger-sel"){ ED.hist.pop(); edSelect([one.parentNode.closest("[data-k2key]")]); return; }
  if(a === "reset"){ ED.sel.forEach(function(e){ if(!e.classList.contains("k2add")) delete frameLayer(f).mod[e.getAttribute("data-k2key")]; }); }
  if(a === "del"){ deleteSel(true); return; }
  var keep = ED.sel.map(selKey);
  applyFrame(f, false); saveLayer(); edSelect(keep.map(findKey));
}
function selKey(e){ return e.classList.contains("k2add") ? "a:" + e.dataset.add : "k:" + e.getAttribute("data-k2key"); }
function findKey(k){ var f = frames[cur]; return k.charAt(0) === "a" ? f.querySelector('.k2add[data-add="' + k.slice(2) + '"]') : f.querySelector('[data-k2key="' + k.slice(2) + '"]'); }
function deleteSel(snapped){
  if(!ED.sel.length) return;
  if(!snapped) snapshot();
  var f = frames[cur], L = frameLayer(f);
  ED.sel.forEach(function(e){
    if(e.classList.contains("k2add")) L.add = L.add.filter(function(o){ return o.id !== e.dataset.add; });
    else modOf(e).hide = true;
  });
  applyFrame(f, false); edSelect([]); saveLayer();
}

/* ---------- typing on the slide ---------- */
function startTextEdit(el){
  stopTextEdit();
  var t = el.classList.contains("k2add") ? el.querySelector(".k2txt,.k2note") : el;
  if(!t) return;
  ED.texting = {el: el, t: t, before: t.innerHTML};
  t.contentEditable = "true"; t.focus();
  try{ var r = D.createRange(); r.selectNodeContents(t); var s = W.getSelection(); s.removeAllRanges(); s.addRange(r); }catch(e){}
  BODY.classList.add("k2-typing");
}
function stopTextEdit(){
  var x = ED.texting; if(!x) return; ED.texting = null;
  BODY.classList.remove("k2-typing");
  x.t.removeAttribute("contenteditable");
  var html = x.t.innerHTML;
  if(html === x.before) return;
  ED.hist.push({fid: frames[cur].dataset.id, data: JSON.stringify(LAYER.frames[frames[cur].dataset.id] || {add: [], mod: {}})});
  // the snapshot above has the new text already in the DOM but not in the layer: that is the old state
  if(x.el.classList.contains("k2add")){ var it = itemOf(x.el); if(it) it.html = html; }
  else{ var m = modOf(x.el); if(x.el._k2html == null) x.el._k2html = x.before; m.html = html; if(html === x.el._k2html){ delete m.html; } cleanMod(x.el); }
  saveLayer(); paintSel();
}

/* ---------- settings for polls, questions, storyboards ---------- */
function openItemForm(it){
  if(!it) return;
  var o = mk("div", "k2edform"), h = "";
  if(it.type === "poll") h = field("q", "Question", it.q) + area("choices", "Choices, one per line", (it.choices || []).join("\n")) + field("answer", "Right answer (optional, copy it from the choices)", it.answer);
  if(it.type === "wall") h = field("q", "Question for the class wall", it.q);
  if(it.type === "start") h = field("text", "What it says", it.text);
  if(it.type === "story") h = field("title", "Title", it.title) + field("n", "How many boxes (2 to 6)", it.n) + area("caps", "Captions, one per line (leave blank for students to write)", (it.caps || []).join("\n"));
  if(it.type === "write") h = field("label", "Label", it.label);
  if(it.type === "yt") h = field("url", "YouTube link", it.url) + field("start", "Start at (like 1:20, optional)", it.start) + field("end", "Stop at (optional)", it.end);
  if(it.type === "image") h = field("src", "Picture link (or upload one)", it.src) + '<label class="k2up">Upload a picture<input type="file" accept="image/*" data-up></label>' + field("alt", "What it shows (for screen readers)", it.alt) + field("cap", "Caption or source (optional)", it.cap);
  if(it.type === "question") h = field("title", "Title", it.title) + '<div class="qrows">' + (it.qs || []).map(qRow).join("") + '</div><button type="button" class="k2btn" data-addq>Add a question</button>';
  o.innerHTML = '<form class="box"><b>' + esc({poll: "Poll", wall: "Class wall", start: "Start writing", story: "Storyboard", write: "Writing space", yt: "YouTube video", image: "Picture", question: "Questions"}[it.type] || "Settings") + '</b>' + h +
    '<div class="row"><button class="k2btn solid" type="submit">Save</button><button class="k2btn" type="button" data-x>Cancel</button></div><div class="msg"></div></form>';
  BODY.appendChild(o);
  var form = o.querySelector("form"), msg = o.querySelector(".msg");
  o.querySelector("[data-x]").onclick = function(){ o.remove(); };
  var aq = o.querySelector("[data-addq]"); if(aq) aq.onclick = function(){ o.querySelector(".qrows").insertAdjacentHTML("beforeend", qRow({tier: "silver"})); };
  var up = o.querySelector("[data-up]");
  if(up) up.onchange = function(){
    var file = up.files[0]; if(!file) return; msg.textContent = "Uploading...";
    uploadPicture(file, function(err, url){ if(err){ msg.textContent = err; return; } form.elements.src.value = url; if(!form.elements.alt.value) form.elements.alt.value = file.name.replace(/\.[^.]+$/, ""); msg.textContent = "Uploaded"; });
  };
  var first = form.querySelector("input,textarea"); if(first) first.focus();
  form.onsubmit = function(e){
    e.preventDefault(); snapshot();
    var v = function(n){ return form.elements[n] ? form.elements[n].value.trim() : ""; };
    if(it.type === "poll"){ it.q = v("q"); it.choices = v("choices").split("\n").map(function(s){ return s.trim(); }).filter(Boolean).slice(0, 8); it.answer = v("answer"); }
    if(it.type === "wall") it.q = v("q");
    if(it.type === "start") it.text = v("text");
    if(it.type === "story"){ it.title = v("title"); it.n = clamp(parseInt(v("n"), 10) || 4, 2, 6); it.caps = form.elements.caps.value.split("\n"); }
    if(it.type === "write") it.label = v("label");
    if(it.type === "yt"){ it.url = v("url"); it.start = v("start"); it.end = v("end"); }
    if(it.type === "image"){ it.src = v("src"); it.alt = v("alt"); it.cap = v("cap"); }
    if(it.type === "question"){
      it.title = v("title");
      it.qs = qa(".qrow", form).map(function(r){ return {text: r.querySelector("[data-qt]").value.trim(), a: r.querySelector("[data-qa]").value.trim(), tier: r.querySelector("[data-qtier]").value}; }).filter(function(q){ return q.text; });
    }
    o.remove();
    var keep = ED.sel.map(selKey);
    applyFrame(frames[cur], false); saveLayer(); edSelect(keep.map(findKey));
  };
}
function field(n, label, val){ return '<label>' + esc(label) + '<input name="' + n + '" value="' + esc(val == null ? "" : val) + '"></label>'; }
function area(n, label, val){ return '<label>' + esc(label) + '<textarea name="' + n + '" rows="4">' + esc(val || "") + '</textarea></label>'; }
function qRow(q){
  return '<div class="qrow"><input data-qt placeholder="Question" value="' + esc(q.text || "") + '"><input data-qa placeholder="Answer (alternatives split by |, blank for open)" value="' + esc(q.a || "") + '">' +
    '<select data-qtier>' + ["bronze", "silver", "gold"].map(function(t){ return '<option value="' + t + '"' + ((q.tier || "bronze") === t ? " selected" : "") + '>' + t.charAt(0).toUpperCase() + t.slice(1) + '</option>'; }).join("") + '</select></div>';
}
function uploadPicture(file, cb){
  if(!ON_LH || !CLASS){ var rd = new FileReader(); rd.onload = function(){ if(String(rd.result).length > 400000) cb("That picture is too big to keep without Learning Home. Use a link."); else cb(null, rd.result); }; rd.readAsDataURL(file); return; }
  var fd = new FormData(); fd.append("file", file); fd.append("classId", CLASS); fd.append("for", "students"); fd.append("type", "link"); fd.append("title", DECK + " " + file.name.replace(/\.[^.]+$/, ""));
  fetch("/api/teacher/files", {method: "POST", body: fd}).then(function(r){ return r.json().then(function(j){ if(!r.ok) throw new Error(j.error || "Upload failed"); return j; }); })
    .then(function(j){ cb(null, j.url); }, function(e){ cb(e.message); });
}

/* ---------- pointer: select, drag, resize, box select ---------- */
function bindEditor(){
  var el = $("k2main");
  function stop(e){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
  el.addEventListener("pointerdown", function(e){
    if(!ED.on) return;
    if(ED.texting && ED.texting.t.contains(e.target)) { e.stopPropagation(); e.stopImmediatePropagation(); return; }
    if(e.button !== 0 && e.pointerType === "mouse") return;
    stopTextEdit();
    var f = frames[cur], pt = wpt(e.clientX, e.clientY);
    if(e.target.closest(".k2rh") && ED.sel.length === 1){
      stop(e); snapshot();
      var s0 = ED.sel[0], r0 = worldRect(s0);
      ED.drag = {type: "resize", el: s0, p0: pt, r0: r0, it: s0.classList.contains("k2add") ? JSON.parse(JSON.stringify(itemOf(s0))) : null, m0: s0.classList.contains("k2add") ? null : JSON.parse(JSON.stringify(modOf(s0)))};
      try{ el.setPointerCapture(e.pointerId); }catch(er){}
      return;
    }
    var hit = pickable(e.target);
    stop(e);
    try{ el.setPointerCapture(e.pointerId); }catch(er){}
    if(hit){
      var i = ED.sel.indexOf(hit);
      if(e.shiftKey || e.ctrlKey || e.metaKey){ if(i >= 0) ED.sel.splice(i, 1); else ED.sel.push(hit); edSelect(ED.sel.slice()); if(i >= 0) return; }
      else if(i < 0) edSelect([hit]);
      snapshot();
      ED.drag = {type: "move", p0: pt, moved: false, start: ED.sel.map(function(s){
        if(s.classList.contains("k2add")){ var o = itemOf(s); return {el: s, x: o.x, y: o.y}; }
        var m = modOf(s); return {el: s, x: m.x || 0, y: m.y || 0};
      })};
      return;
    }
    if(!f.contains(e.target) && e.target !== f){ edSelect([]); ED.drag = {type: "pan0"}; return; }
    ED.drag = {type: "box", p0: pt, add: e.shiftKey ? ED.sel.slice() : []};
  }, true);
  el.addEventListener("pointermove", function(e){
    if(!ED.on || !ED.drag) return;
    var d = ED.drag, pt = wpt(e.clientX, e.clientY), dx = pt.x - (d.p0 ? d.p0.x : 0), dy = pt.y - (d.p0 ? d.p0.y : 0);
    e.stopPropagation(); e.stopImmediatePropagation();
    if(d.type === "move"){
      if(!d.moved && Math.hypot(dx, dy) * (mainP.cam.s || 1) < 4) return;
      d.moved = true;
      d.start.forEach(function(s){
        var nx = Math.round(s.x + dx), ny = Math.round(s.y + dy);
        if(s.el.classList.contains("k2add")){ s.el.style.left = nx + "px"; s.el.style.top = ny + "px"; }
        else s.el.style.translate = nx + "px " + ny + "px";
      });
      paintSel();
    }
    if(d.type === "resize"){
      var w = Math.max(40, d.r0.w + dx), h = Math.max(30, d.r0.h + dy);
      if(d.it){ d.el.style.width = Math.round(d.it.w * w / d.r0.w) + "px"; if(d.it.h || d.el.dataset.type === "arrow" || d.el.dataset.type === "note") d.el.style.height = Math.round((d.it.h || d.r0.h) * h / d.r0.h) + "px"; }
      else d.el.style.scale = String(Math.max(.2, (d.m0.s || 1) * w / d.r0.w).toFixed(3));
      paintSel();
    }
    if(d.type === "box"){
      ED.box = {x: Math.min(d.p0.x, pt.x), y: Math.min(d.p0.y, pt.y), w: Math.abs(dx), h: Math.abs(dy)};
      var b = ED.box, f = frames[cur], hits = [];
      qa(".k2add, [data-k2key]", f).forEach(function(c){
        if(c.classList.contains("k2hidden") || c.closest(".k2hidden")) return;
        var r = worldRect(c); if(!r.w || !r.h) return;
        if(r.x >= b.x && r.y >= b.y && r.x + r.w <= b.x + b.w && r.y + r.h <= b.y + b.h) hits.push(c);
      });
      // keep the outermost of anything nested inside the box
      hits = hits.filter(function(c){ return !hits.some(function(o){ return o !== c && o.contains(c); }); });
      ED.sel = d.add.concat(hits.filter(function(c){ return d.add.indexOf(c) < 0; }));
      paintSel();
    }
  }, true);
  function end(e){
    if(!ED.on || !ED.drag) return;
    var d = ED.drag; ED.drag = null; e.stopPropagation(); e.stopImmediatePropagation();
    var f = frames[cur];
    if(d.type === "move"){
      if(!d.moved){ ED.hist.pop(); return; }
      d.start.forEach(function(s){
        if(s.el.classList.contains("k2add")){ var o = itemOf(s.el); o.x = parseInt(s.el.style.left, 10); o.y = parseInt(s.el.style.top, 10); }
        else{ var m = modOf(s.el), t = (s.el.style.translate || "0px 0px").split(" "); m.x = parseInt(t[0], 10) || 0; m.y = parseInt(t[1] || "0", 10) || 0; cleanMod(s.el); }
      });
      saveLayer();
    }
    if(d.type === "resize"){
      if(d.it){ var o2 = itemOf(d.el); o2.w = parseInt(d.el.style.width, 10); if(d.el.style.height) o2.h = parseInt(d.el.style.height, 10); }
      else{ var m2 = modOf(d.el); m2.s = +d.el.style.scale || 1; cleanMod(d.el); }
      saveLayer();
    }
    if(d.type === "box"){ ED.box = null; if(!d.add.length && (!ED.sel.length)) edSelect([]); else paintSel(); }
  }
  el.addEventListener("pointerup", end, true);
  el.addEventListener("pointercancel", end, true);
  // No buttons, links or double tap to fit while editing; double click edits text.
  el.addEventListener("click", function(e){ if(ED.on && !(ED.texting && ED.texting.t.contains(e.target))){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); } }, true);
  el.addEventListener("dblclick", function(e){
    if(!ED.on) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    var hit = pickable(e.target); if(!hit) return;
    edSelect([hit]);
    if(hit.classList.contains("k2add")){ if(/text|note/.test(hit.dataset.type)) startTextEdit(hit); else openItemForm(itemOf(hit)); }
    else if(textOnly(hit)) startTextEdit(hit);
    else toast("That one has buttons or maths inside: move, resize or hide it, or pick a smaller part");
  }, true);
  // Pictures dropped from the computer.
  el.addEventListener("dragover", function(e){ if(ED.on){ e.preventDefault(); } });
  el.addEventListener("drop", function(e){
    if(!ED.on) return; e.preventDefault();
    var files = Array.prototype.filter.call(e.dataTransfer.files || [], function(x){ return /^image\//.test(x.type); });
    var pt = wpt(e.clientX, e.clientY);
    if(!files.length){ var u = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain"); if(/^https:\/\//.test(u || "")){ var it0 = newItem(/youtu\.?be/.test(u) ? "yt" : "image"); if(it0.type === "yt") it0.url = u; else it0.src = u; addItem(it0, pt, true, true); } return; }
    files.forEach(function(file, i){
      toast("Uploading " + file.name);
      uploadPicture(file, function(err, url){ if(err){ toast(err); return; } var it = newItem("image"); it.src = url; it.alt = file.name.replace(/\.[^.]+$/, ""); addItem(it, {x: pt.x + i * 30, y: pt.y + i * 30}, true, true); });
    });
  });
  W.addEventListener("keydown", function(e){
    if(!ED.on) return;
    if(e.target.closest && e.target.closest("input,textarea,select,[contenteditable],.k2edform")){ if(e.key === "Escape" && ED.texting){ stopTextEdit(); e.preventDefault(); } return; }
    var k = e.key, used = true;
    if((e.ctrlKey || e.metaKey) && (k === "z" || k === "Z")) undoEdit();
    else if((e.ctrlKey || e.metaKey) && (k === "d" || k === "D")) toolbarAction("dup");
    else if(k === "Delete" || k === "Backspace") deleteSel();
    else if(k === "Escape"){ if(ED.sel.length) edSelect([]); else setEditMode(false); }
    else if(ED.sel.length && /^Arrow/.test(k)){
      snapshot(); var st = e.shiftKey ? 20 : 4, dx = k === "ArrowLeft" ? -st : k === "ArrowRight" ? st : 0, dy = k === "ArrowUp" ? -st : k === "ArrowDown" ? st : 0;
      ED.sel.forEach(function(s){ if(s.classList.contains("k2add")){ var o = itemOf(s); o.x += dx; o.y += dy; } else { var m = modOf(s); m.x = (m.x || 0) + dx; m.y = (m.y || 0) + dy; cleanMod(s); } });
      var keep = ED.sel.map(selKey); applyFrame(frames[cur], false); saveLayer(); edSelect(keep.map(findKey));
    }
    else used = false;
    if(used){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
  }, true);
  W.addEventListener("resize", function(){ if(ED.on) paintSel(); });
  el.addEventListener("wheel", function(){ if(ED.on) setTimeout(paintSel, 30); });
}
function wpt(cx, cy){ var a = mainP.toWorld(cx, cy); return {x: a[0], y: a[1]}; }
// Short fingerprint of one frame's edits ("" when it has none).
function layerSig(fid){
  var L = LAYER.frames[fid]; if(!L || (!(L.add || []).length && !Object.keys(L.mod || {}).length)) return "";
  var t = JSON.stringify(L), h = 5381; for(var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
