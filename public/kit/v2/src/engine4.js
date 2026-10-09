
/* ============================================================
   LIVE: teacher deck, student pages and the phone remote share a room.
   On Learning Home the room is a Durable Object at /live/<class-id>:
   the teacher is recognised by the sign-in cookie, students by their
   class code, and student messages only ever reach the teacher.
   Anywhere else (claude.ai preview, a file on disk) a BroadcastChannel
   stands in, so the deck and a student tab in the same browser can be
   tested side by side.
   ============================================================ */
function Transport(role, name, id, opts){
  var T = this; T.role = role; T.name = name; T.id = id; T.h = []; T.ok = false; T.closed = false;
  opts = opts || {}; T.code = opts.code || ""; T.remote = !!opts.remote;
  T.room = CLASS || DECK;
  T.mode = ON_LH && CLASS ? "ws" : "bc";
}
Transport.prototype.on = function(fn){ this.h.push(fn); };
Transport.prototype.emit = function(m){ this.h.forEach(function(fn){ try{ fn(m); }catch(e){ console.error(e); } }); };
Transport.prototype.status = function(s){ this.emit({t: "_status", s: s}); };
Transport.prototype.open = function(){
  var T = this;
  if(T.mode === "bc"){
    if(!W.BroadcastChannel){ T.status("none"); return; }
    T.bc = new BroadcastChannel("kit2-live-" + T.room);
    T.bc.onmessage = function(ev){
      var m = ev.data; if(!m || !m.from || m.from.id === T.id) return;
      if(m.to && m.to !== T.id && T.role === "student") return;
      if(T.role === "student" && m.from.role === "student") return;
      if(m.t === "hello" && m.from.role === "student" && T.role === "teacher") T.emit({t: "join", from: m.from});
      if(m.t === "bye" && m.from.role === "student" && T.role === "teacher") T.emit({t: "leave", from: m.from});
      if(m.t === "whois" && T.role === "student") T.send({t: "hello"});
      T.emit(m);
    };
    T.ok = true; T.status("demo");
    T.send({t: T.role === "teacher" ? "whois" : "hello"});
    W.addEventListener("pagehide", function(){ T.send({t: "bye"}); });
    return;
  }
  var q = "?id=" + encodeURIComponent(T.id) + "&name=" + encodeURIComponent(T.name || "");
  if(T.role === "student") q += "&code=" + encodeURIComponent(T.code || "") + "&deck=" + encodeURIComponent(DECK);
  if(T.role === "student" && PREVIEW) q += "&as=student";
  if(T.remote) q += "&remote=1";
  var ws;
  try{ ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/live/" + encodeURIComponent(T.room) + q); }
  catch(e){ T.status("off"); return; }
  T.ws = ws; T.status("connecting");
  ws.onopen = function(){ T.ok = true; T.tries = 0; T.status("live"); T.emit({t: "_open"}); };
  ws.onmessage = function(ev){ var m; try{ m = JSON.parse(ev.data); }catch(e){ return; } T.emit(m); };
  ws.onclose = function(ev){
    T.ok = false; if(T.closed) return;
    if(ev.code === 4403){ T.status("denied"); return; }
    T.status("connecting"); T.tries = (T.tries || 0) + 1;
    setTimeout(function(){ if(!T.closed) T.open(); }, Math.min(15000, 800 * Math.pow(1.6, T.tries)));
  };
  if(!T.ping) T.ping = setInterval(function(){ if(T.ok && T.ws) try{ T.ws.send('{"t":"ping"}'); }catch(e){} }, 25000);
};
Transport.prototype.send = function(m){
  m.from = {role: this.role, id: this.id, name: this.name};
  if(this.mode === "bc"){ if(this.bc) this.bc.postMessage(m); return; }
  if(this.ok) try{ this.ws.send(JSON.stringify(m)); }catch(e){}
};
Transport.prototype.close = function(){ this.closed = true; if(this.bc){ this.send({t: "bye"}); this.bc.close(); } if(this.ws) this.ws.close(); clearInterval(this.ping); };

/* ---------- teacher side ---------- */
var LIVE = {on: false, T: null, roster: {}, used: [], status: "off"};
function liveData(){ var L = store.live || (store.live = {}); L.open = L.open || {}; L.polls = L.polls || {}; L.walls = L.walls || {}; L.pracs = L.pracs || {}; L.prog = L.prog || {}; return L; }
/* ---------- live view: students see the teacher's slide as it is, ink and all ----------
   The slide is sent whenever it changes (steps revealed, gaps filled, edits), and the ink on its
   own, quickly, while drawing. Teacher notes are taken out before anything is sent. */
var LV = {obs: null, inkT: 0, viewT: 0};
function sendView(){
  if(!LIVE.on || !LIVE.T) return;
  var f = frames[cur]; if(!f) return;
  var c = f.cloneNode(true); c.removeAttribute("style"); c.classList.remove("on");
  qa("aside.script,.k2ink", c).forEach(function(n){ n.remove(); }); // ink travels on its own, as strokes
  var html = c.outerHTML;
  if(html.length < 300000) LIVE.T.send({t: "view", deck: DECK, i: cur, html: html}); // bigger: students use their own copy
  sendInk();
}
// The slide's strokes (and the one being drawn), so students can watch it and replay it later.
function sendInk(){
  if(!LIVE.on || !LIVE.T) return;
  var f = frames[cur]; if(!f) return;
  var ss = (store.ink["f:" + f.dataset.id] || []).slice();
  if(live_ink && !live_ink.erase && live_ink.surf === surfaces["f:" + f.dataset.id]) ss.push(live_ink.st);
  var out = JSON.stringify(ss);
  if(out.length > 300000) out = JSON.stringify(ss.map(function(st){ return {c: st.c, w: st.w, h: st.h, p: st.p.map(function(q){ return [Math.round(q[0]), Math.round(q[1])]; })}; }));
  if(out.length > 380000) return;
  LIVE.T.send({t: "ink", deck: DECK, i: cur, s: JSON.parse(out)});
}
function queueView(kind){
  if(kind === "view"){ if(!LV.viewT) LV.viewT = setTimeout(function(){ LV.viewT = 0; clearTimeout(LV.inkT); LV.inkT = 0; sendView(); }, 350); }
  else if(!LV.inkT && !LV.viewT) LV.inkT = setTimeout(function(){ LV.inkT = 0; sendInk(); }, 110);
}
function watchView(){
  if(LV.obs || !W.MutationObserver) return;
  LV.obs = new MutationObserver(function(list){
    if(!LIVE.on) return;
    var f = frames[cur], kind = "";
    for(var i = 0; i < list.length; i++){
      var m = list[i], t = m.target.nodeType === 1 ? m.target : m.target.parentNode;
      if(!t || !f.contains(t)) continue;
      if(t === f && m.type === "attributes") continue; // camera moves and the on class
      if(t.closest && t.closest(".vid,.yt")) continue;   // a playing video: each student plays their own
      if(t.closest && t.closest(".k2ink")){ if(!kind) kind = "ink"; } else { kind = "view"; break; }
    }
    if(kind) queueView(kind);
  });
  LV.obs.observe(deckHost(), {subtree: true, childList: true, attributes: true, characterData: true});
}

function startLive(){
  if(LIVE.on) return;
  LIVE.on = true; LIVE.T = new Transport("teacher", "Teacher", "t-" + rid());
  LIVE.T.on(onTeacherMsg); LIVE.T.open();
  $("k2liveb").setAttribute("aria-pressed", "true");
  autoOpen(frames[cur]); sendState(); paintLive(); watchView(); setTimeout(sendView, 600);
  LIVE.tick = setInterval(sendState, 15000);
  store.liveOn = now(); save();
}
function stopLive(){ if(!LIVE.on) return; store.liveOn = 0; save(); LIVE.T.send({t: "end"}); LIVE.T.close(); LIVE.on = false; LIVE.roster = {}; clearInterval(LIVE.tick); $("k2liveb").setAttribute("aria-pressed", "false"); paintLive(); }
function onTeacherMsg(m){
  var f = m.from || {}, L = liveData(), R = LIVE.roster;
  if(m.t === "_status"){ LIVE.status = m.s; paintLive(); return; }
  if(m.t === "_open"){ sendState(); return; }
  if(m.t === "roster"){ (m.list || []).forEach(function(s){ R[s.id] = R[s.id] || {name: s.name, stuck: false}; }); paintLive(); return; }
  if(m.t === "join" || (m.t === "hello" && f.role === "student")){ R[f.id] = R[f.id] || {name: f.name, stuck: false}; R[f.id].name = f.name; paintLive(); if(m.t === "join" || LIVE.T.mode === "bc"){ sendState(); if(LIVE.T.mode === "bc") sendView(); } return; }
  if(m.t === "hello" && f.role === "teacher"){ sendState(); return; }
  if(m.t === "leave"){ delete R[f.id]; paintLive(); return; }
  if(f.role === "teacher" && m.t === "cmd"){ runCmd(m); return; }
  if(f.role !== "student") return;
  if(!R[f.id]) R[f.id] = {name: f.name, stuck: false};
  if(m.t === "stuck"){ R[f.id].stuck = !!m.on; paintLive(); if(m.on) toast(f.name + " is stuck"); }
  else if(m.t === "prog"){ var P = L.prog[m.act] || (L.prog[m.act] = {}); var me = P[f.id] || (P[f.id] = {name: f.name, q: {}}); me.name = f.name; me.q[m.q] = {ok: m.ok, tier: m.tier}; paintActs(); save(); }
  else if(m.t === "vote"){ var pl = L.polls[m.id]; if(pl && pl.open){ pl.votes[f.id] = m.choice; paintPoll(m.id); save(); } }
  else if(m.t === "post"){ var w = L.walls[m.id]; if(w && w.open){ var txt = String(m.text || "").slice(0, 400).trim(); if(txt){ w.posts.push({id: f.id, name: f.name, text: txt, at: now()}); w.posts = w.posts.slice(-120); paintWall(m.id); save(); } } }
  else if(m.t === "row"){ var pr = L.pracs[m.id]; if(pr && pr.open){ pr.rows[f.id] = {group: String(m.group || f.name).slice(0, 40), vals: (m.vals || []).slice(0, 12).map(function(v){ var n = parseFloat(v); return isFinite(n) ? n : null; })}; paintPrac(m.id); save(); } }
  else if(m.t === "nomans"){ var a = $("k2nomans"); if(a && LIVE.nom === f.id) a.textContent = String(m.text || "").slice(0, 300); }
}
function liveItems(f){ return qa(".activity,.live-poll,.live-wall,.live-prac", f); }
function itemId(e){ return e.dataset.id; }
function autoOpen(f){ var L = liveData(), ch = false; liveItems(f).forEach(function(e){ if(!L.open[itemId(e)]){ L.open[itemId(e)] = true; ch = true; setOpenUI(e); } }); if(ch) save(); }
function setOpen(id, on){ var L = liveData(); L.open[id] = on; var e = D.querySelector('[data-id="' + id + '"]'); if(e) setOpenUI(e); save(); sendState(); }
function setOpenUI(e){
  var on = !!liveData().open[itemId(e)], b = e.querySelector(".k2open");
  if(b){ b.textContent = on ? "Close for students" : "Open for students"; b.classList.toggle("solid", !on); }
  if(e.classList.contains("live-poll")){ var pl = liveData().polls[itemId(e)]; if(pl) pl.open = on; }
  if(e.classList.contains("live-wall")){ var w = liveData().walls[itemId(e)]; if(w) w.open = on; }
  if(e.classList.contains("live-prac")){ var pr = liveData().pracs[itemId(e)]; if(pr) pr.open = on; }
}
function sendState(){
  if(!LIVE.on || !LIVE.T) return;
  var f = frames[cur], L = liveData(), T = curTimer(), sc = f.querySelector("aside.script");
  var polls = {}, walls = {}, pracs = {};
  qa(".live-poll").forEach(function(e){ var id = itemId(e), p = L.polls[id]; polls[id] = {open: !!L.open[id], reveal: !!(p && p.reveal), counts: p && p.reveal ? pollCounts(e) : null}; });
  qa(".live-wall").forEach(function(e){ walls[itemId(e)] = {open: !!L.open[itemId(e)]}; });
  qa(".live-prac").forEach(function(e){ pracs[itemId(e)] = {open: !!L.open[itemId(e)]}; });
  var R = LIVE.roster, ids = Object.keys(R);
  LIVE.T.send({t: "state", at: now(), deck: DECK, title: D.title, url: location.pathname, mins: +BODY.dataset.mins || 80,
    frame: {i: cur, n: frames.length, id: f.dataset.id, title: frameTitle(f), kind: f.dataset.kind, mode: f.dataset.mode, script: sc ? sc.textContent.trim().slice(0, 1500) : "", hasSteps: !!f.querySelector(".stepbtn"), items: liveItems(f).map(itemId)},
    next: frames[cur + 1] ? frameTitle(frames[cur + 1]) : "",
    open: Object.keys(L.open).filter(function(k){ return L.open[k]; }), polls: polls, walls: walls, pracs: pracs,
    lesson: store.lesson, timer: T ? {left: Math.round(T.left), run: T.run} : null,
    class: {n: ids.length, stuck: ids.filter(function(k){ return R[k].stuck; }).length}, nom: LIVE.nom || null});
}
function runCmd(m){
  var c = m.c;
  if(c === "next") next(); else if(c === "prev") prev(); else if(c === "step") stepCurrent(); else if(c === "answers") answersCurrent();
  else if(c === "nominate") nominate(); else if(c === "timer") toggleTimer(); else if(c === "ws") cycleLayout(); else if(c === "blank") toggleBlank();
  else if(c === "open"){ liveItems(frames[cur]).forEach(function(e){ setOpen(itemId(e), true); }); }
  else if(c === "goto" && m.i != null) go(+m.i);
  else if(c === "start") startLesson();
  sendState();
}

/* live panel */
function buildLivePanel(){
  var p = mk("div"); p.id = "k2livepanel"; p.hidden = true; BODY.appendChild(p);
  p.addEventListener("click", function(e){
    var b = e.target.closest("[data-la]"); if(!b) return; var a = b.dataset.la;
    if(a === "start") startLive(); if(a === "stop") stopLive(); if(a === "close") toggleLivePanel();
    if(a === "nom") nominate(); if(a === "openall") liveItems(frames[cur]).forEach(function(e){ setOpen(itemId(e), true); });
    if(a === "student") W.open(location.pathname + "?view=student", "_blank");
    if(a === "unstuck"){ for(var k in LIVE.roster) LIVE.roster[k].stuck = false; paintLive(); }
  });
}
function toggleLivePanel(){ var p = $("k2livepanel"); p.hidden = !p.hidden; paintLive(); }
function paintLive(){
  var chip = $("k2livechip"), R = LIVE.roster, ids = Object.keys(R);
  var stuck = ids.filter(function(k){ return R[k].stuck; });
  if(chip){ chip.hidden = !LIVE.on; chip.textContent = ids.length + " in" + (stuck.length ? ", " + stuck.length + " stuck" : ""); }
  var p = $("k2livepanel"); if(!p || p.hidden) return;
  var h = '<h3>Live class <button class="dk" type="button" data-la="close" aria-label="Close">&#215;</button></h3>';
  if(!LIVE.on){
    h += '<div class="where">Going live lets students answer on their own page while you teach: activities, polls, the class wall, prac data and nominating.</div>' +
      '<button class="k2btn solid" type="button" data-la="start">Go live</button>';
  }else{
    var st = {live: "Connected", demo: "Demo mode", connecting: "Connecting", denied: "Sign in on Learning Home first", none: "This browser cannot go live", off: "Not connected"}[LIVE.status] || LIVE.status;
    h += '<div class="where"><b>' + esc(st) + '</b><br>' + (LIVE.T.mode === "ws" ?
      'Students open this lesson on Learning Home. Their page joins on its own with their class code.' :
      'Demo mode only reaches tabs in this browser. Open the student page here to try it. Real classes connect on Learning Home.') + '</div>';
    h += '<div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button class="k2btn solid" type="button" data-la="nom">Nominate</button><button class="k2btn" type="button" data-la="openall">Open this frame</button>' + (LIVE.T.mode === "bc" ? '<button class="k2btn" type="button" data-la="student">Student page</button>' : '') + '</div>';
    h += '<div><b>' + ids.length + '</b> ' + (ids.length === 1 ? 'student' : 'students') + ' in' + (stuck.length ? ', <b style="color:#9f1239">' + stuck.length + ' stuck</b> <button class="k2btn" type="button" data-la="unstuck" style="min-height:34px;padding:2px 10px;font-size:13px">Clear</button>' : '') + '</div>';
    h += '<div class="names">' + ids.map(function(k){ return '<span class="' + (R[k].stuck ? "stuck" : LIVE.used.indexOf(k) >= 0 ? "used" : "") + '">' + esc(R[k].name || "Student") + '</span>'; }).join("") + '</div>';
    h += '<button class="k2btn" type="button" data-la="stop">Stop live</button>';
  }
  p.innerHTML = h;
}
/* nominate: nobody twice until everyone has had a turn */
function nominate(){
  var R = LIVE.roster, ids = Object.keys(R);
  if(!LIVE.on || !ids.length){ toast("Nobody has joined yet. Go live and have students open the lesson."); return; }
  var pool = ids.filter(function(k){ return LIVE.used.indexOf(k) < 0; });
  if(!pool.length){ LIVE.used = []; pool = ids.slice(); }
  var pick = pool[Math.floor(Math.random() * pool.length)];
  LIVE.used.push(pick); LIVE.nom = pick;
  LIVE.T.send({t: "nominate", to: pick, name: R[pick].name});
  var o = $("k2nom");
  if(!o){ o = mk("div"); o.id = "k2nom"; BODY.appendChild(o); }
  o.hidden = false;
  o.innerHTML = '<div class="card"><div class="nm"></div><div class="ans" id="k2nomans"></div><div class="row"><button type="button" class="go" data-n="again">Pick someone else</button><button type="button" data-n="close">Done</button></div></div>';
  var nm = o.querySelector(".nm"), names = ids.map(function(k){ return R[k].name; }), n = 0;
  var spin = setInterval(function(){ nm.textContent = names[n++ % names.length]; }, 70);
  setTimeout(function(){ clearInterval(spin); nm.textContent = R[pick].name; }, 900);
  o.onclick = function(e){ var b = e.target.closest("[data-n]"); if(!b) return;
    if(b.dataset.n === "again"){ LIVE.T.send({t: "nominate", to: null}); nominate(); }
    else{ o.hidden = true; LIVE.nom = null; LIVE.T.send({t: "nominate", to: null}); sendState(); } };
  paintLive(); sendState();
}

/* ---------- activities, teacher view ---------- */
function qAnswerText(q){
  if(q.dataset.show) return q.dataset.show;
  if(q.dataset.answer) return q.dataset.answer.split("|")[0];
  if(q.dataset.num) return q.dataset.num;
  return "";
}
function initActivitiesTeacher(){
  qa(".activity").forEach(function(a, i){
    if(!a.dataset.id) a.dataset.id = "act" + (i + 1);
    var head = mk("div", "acthead");
    head.innerHTML = '<span class="acttitle">' + esc(a.dataset.title || "Activity") + '</span><span class="actlive" data-act="' + a.dataset.id + '"></span>' +
      '<button class="k2btn k2open" type="button">Open for students</button><button class="k2btn ansall" type="button">Show answers</button>';
    a.insertBefore(head, a.firstChild);
    head.querySelector(".k2open").onclick = function(){ setOpen(a.dataset.id, !liveData().open[a.dataset.id]); };
    qa(".q", a).forEach(function(q){
      if(!q.querySelector(":scope > .qbody")){ var b = mk("span", "qbody"); while(q.firstChild) b.appendChild(q.firstChild); q.appendChild(b); }
      var ans = qAnswerText(q);
      if(q.dataset.choices && !q.querySelector(".qch")){ q.querySelector(".qbody").insertAdjacentHTML("beforeend", '<span class="qch" style="display:block;font-size:.85em;color:var(--ink-2);margin-top:6px">' + q.dataset.choices.split("|").map(esc).join(" &nbsp; / &nbsp; ") + '</span>'); }
      if(ans && !q.querySelector(".pa")) q.insertAdjacentHTML("beforeend", '<span class="pa">' + (/[\\^_{}]/.test(ans) ? '<span class="tex inline" data-tex="' + esc(ans) + '"></span>' : esc(ans)) + '</span>');
    });
    setOpenUI(a);
  });
  paintActs();
}
function paintActs(){
  var L = liveData();
  qa(".actlive").forEach(function(s){
    var a = s.closest(".activity"), id = s.dataset.act, P = L.prog[id] || {};
    var qs = qa(".q", a), tiers = {bronze: [], silver: [], gold: []};
    qs.forEach(function(q, i){ var t = q.dataset.tier || "bronze"; (tiers[t] || tiers.bronze).push(String(i)); });
    var n = Object.keys(P).length;
    if(!n){ s.innerHTML = ""; return; }
    function done(list){ if(!list.length) return null; var c = 0; for(var k in P){ var me = P[k].q; if(list.every(function(qi){ return me[qi] && me[qi].ok; })) c++; } return c; }
    var b = done(tiers.bronze), sv = done(tiers.silver), g = done(tiers.gold);
    s.innerHTML = '<span class="pill">' + n + ' working</span>' + (b != null ? '<span class="pill b">Bronze ' + b + '</span>' : '') + (sv != null ? '<span class="pill s">Silver ' + sv + '</span>' : '') + (g != null ? '<span class="pill g">Gold ' + g + '</span>' : '');
  });
}

/* ---------- live blocks, teacher view ---------- */
function choicesOf(e){ return (e.dataset.choices || "").split("|").map(function(s){ return s.trim(); }).filter(Boolean); }
function initLiveBlocks(){
  var L = liveData();
  qa(".live-poll").forEach(function(e, i){
    if(!e.dataset.id) e.dataset.id = "poll" + (i + 1);
    var id = e.dataset.id, ch = choicesOf(e);
    L.polls[id] = L.polls[id] || {votes: {}, reveal: false, open: false};
    var q = e.innerHTML; e.classList.add("live", "hidebars");
    e.innerHTML = '<div class="lq">' + q + '</div><div class="pollrows">' + ch.map(function(c, k){ return '<div class="pollrow' + (e.dataset.answer === c ? ' isright' : '') + '" data-k="' + k + '"><span>' + esc(c) + '</span><span class="pollbar"><i style="width:0"></i></span><span class="cnt">0</span></div>'; }).join("") + '</div>' +
      '<div class="lctl"><button class="k2btn k2open solid" type="button">Open for students</button><button class="k2btn" type="button" data-p="reveal">Show results</button><button class="k2btn" type="button" data-p="reset">Reset</button><span class="lstat"></span></div>';
    e.querySelector(".k2open").onclick = function(){ setOpen(id, !L.open[id]); };
    e.querySelector('[data-p="reveal"]').onclick = function(){ L.polls[id].reveal = !L.polls[id].reveal; paintPoll(id); save(); sendState(); };
    e.querySelector('[data-p="reset"]').onclick = function(){ if(!confirm("Clear every vote on this poll?")) return; L.polls[id].votes = {}; L.polls[id].reveal = false; paintPoll(id); save(); sendState(); };
    setOpenUI(e); paintPoll(id);
  });
  qa(".live-wall").forEach(function(e, i){
    if(!e.dataset.id) e.dataset.id = "wall" + (i + 1);
    var id = e.dataset.id; L.walls[id] = L.walls[id] || {posts: [], open: false, anon: true};
    var q = e.innerHTML; e.classList.add("live");
    e.innerHTML = '<div class="lq">' + q + '</div><div class="lctl"><button class="k2btn k2open solid" type="button">Open for students</button><button class="k2btn" type="button" data-w="anon"></button><button class="k2btn" type="button" data-w="clear">Clear</button><span class="lstat"></span></div><div class="wallgrid"></div>';
    e.querySelector(".k2open").onclick = function(){ setOpen(id, !L.open[id]); };
    e.querySelector('[data-w="anon"]').onclick = function(){ L.walls[id].anon = !L.walls[id].anon; paintWall(id); save(); };
    e.querySelector('[data-w="clear"]').onclick = function(){ if(!confirm("Clear the wall?")) return; L.walls[id].posts = []; paintWall(id); save(); };
    e.querySelector(".wallgrid").addEventListener("click", function(ev){
      var c = ev.target.closest(".wallcard"); if(!c) return; var w = L.walls[id], post = w.posts[+c.dataset.i]; if(!post) return;
      var sp = mk("div", "wallspot"); sp.innerHTML = esc(post.text) + (w.anon ? "" : "<small>" + esc(post.name) + "</small>") + '<button class="k2btn" type="button" style="align-self:flex-start">Close</button>';
      sp.querySelector("button").onclick = function(){ sp.remove(); };
      e.closest(".frame").appendChild(sp);
    });
    setOpenUI(e); paintWall(id);
  });
  qa(".live-prac").forEach(function(e, i){
    if(!e.dataset.id) e.dataset.id = "prac" + (i + 1);
    var id = e.dataset.id; L.pracs[id] = L.pracs[id] || {rows: {}, open: false};
    var q = e.innerHTML; e.classList.add("live");
    e.innerHTML = '<div class="lq" style="font-size:28px">' + q + '</div><div class="lctl"><button class="k2btn k2open solid" type="button">Open for groups</button><button class="k2btn" type="button" data-d="clear">Clear</button><span class="lstat"></span></div>' +
      '<div class="pracgrid"><div class="pracwrap" style="overflow:auto;min-height:0"></div><div class="pracchart"></div></div><div class="pracnote"></div>';
    e.querySelector(".k2open").onclick = function(){ setOpen(id, !L.open[id]); };
    e.querySelector('[data-d="clear"]').onclick = function(){ if(!confirm("Clear every group's results?")) return; L.pracs[id].rows = {}; paintPrac(id); save(); };
    setOpenUI(e); paintPrac(id);
  });
}
function pollCounts(e){ var L = liveData(), p = L.polls[itemId(e)], c = choicesOf(e).map(function(){ return 0; }); for(var k in p.votes){ var v = +p.votes[k]; if(c[v] != null) c[v]++; } return c; }
function paintPoll(id){
  var e = D.querySelector('.live-poll[data-id="' + id + '"]'); if(!e) return;
  var p = liveData().polls[id], c = pollCounts(e), tot = c.reduce(function(a, b){ return a + b; }, 0), mx = Math.max.apply(null, c.concat([1]));
  e.classList.toggle("hidebars", !p.reveal);
  qa(".pollrow", e).forEach(function(r, k){ r.querySelector("i").style.width = (100 * c[k] / mx) + "%"; r.querySelector(".cnt").textContent = c[k]; r.classList.toggle("right", p.reveal && r.classList.contains("isright")); });
  e.querySelector('[data-p="reveal"]').textContent = p.reveal ? "Hide results" : "Show results";
  e.querySelector(".lstat").textContent = tot + (tot === 1 ? " vote" : " votes");
}
function paintWall(id){
  var e = D.querySelector('.live-wall[data-id="' + id + '"]'); if(!e) return;
  var w = liveData().walls[id];
  e.classList.toggle("anon", w.anon);
  e.querySelector('[data-w="anon"]').textContent = w.anon ? "Show names" : "Hide names";
  e.querySelector(".lstat").textContent = w.posts.length + (w.posts.length === 1 ? " answer" : " answers");
  e.querySelector(".wallgrid").innerHTML = w.posts.map(function(p, i){ return '<button class="wallcard" type="button" data-i="' + i + '">' + esc(p.text) + '<small>' + esc(p.name) + '</small></button>'; }).join("");
}
function median(a){ var s = a.slice().sort(function(x, y){ return x - y; }), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function pracSpec(e){
  var cols = (e.dataset.cols || "x|y").split("|").map(function(s){ return s.trim(); });
  var x = +(e.dataset.x || 0), ys = String(e.dataset.y || "1").split("-").map(Number);
  var yi = []; for(var i = ys[0]; i <= (ys[1] || ys[0]); i++) yi.push(i);
  return {cols: cols, x: x, yi: yi, ylabel: e.dataset.ylabel || (yi.length > 1 ? "Mean" : cols[yi[0]]), xlabel: e.dataset.xlabel || cols[x]};
}
function paintPrac(id){
  var e = D.querySelector('.live-prac[data-id="' + id + '"]'); if(!e) return;
  var P = liveData().pracs[id], S = pracSpec(e), rows = [], notes = [];
  for(var k in P.rows) rows.push(P.rows[k]);
  if(e.hasAttribute("data-tally")) return paintTally(e, S, rows);
  rows.sort(function(a, b){ return (a.vals[S.x] || 0) - (b.vals[S.x] || 0); });
  var h = '<table class="t"><tr><th>Group</th>' + S.cols.map(function(c){ return "<th>" + esc(c) + "</th>"; }).join("") + (S.yi.length > 1 ? "<th>Mean</th>" : "") + "</tr>";
  var pts = [];
  rows.forEach(function(r){
    var ys = S.yi.map(function(i){ return r.vals[i]; }).filter(function(v){ return v != null; });
    var med = ys.length >= 3 ? median(ys) : null, out = {};
    if(med){ S.yi.forEach(function(i){ var v = r.vals[i]; if(v != null && Math.abs(v - med) / Math.abs(med || 1) > 0.25){ out[i] = true; notes.push(r.group + ": " + v + " looks like an outlier"); } }); }
    var mean = ys.length ? ys.reduce(function(a, b){ return a + b; }, 0) / ys.length : null;
    h += "<tr><td>" + esc(r.group) + "</td>" + S.cols.map(function(c, i){ var v = r.vals[i]; return '<td class="num' + (out[i] ? " out" : "") + '">' + (v == null ? "" : v) + "</td>"; }).join("") + (S.yi.length > 1 ? '<td class="num"><b>' + (mean == null ? "" : +mean.toFixed(2)) + "</b></td>" : "") + "</tr>";
    if(mean != null && r.vals[S.x] != null) pts.push([r.vals[S.x], mean, r.group]);
  });
  e.querySelector(".pracwrap").innerHTML = h + "</table>";
  e.querySelector(".lstat").textContent = rows.length + (rows.length === 1 ? " group" : " groups");
  e.querySelector(".pracnote").textContent = notes.length ? notes.join(". ") + ". Talk about it before averaging?" : "";
  e.querySelector(".pracchart").innerHTML = chartSVG(pts, S.xlabel, S.ylabel);
}
/* Tally (live-prac with data-tally): groups send counts for each category, the board adds up the
   class and shows each as a percentage bar, with the expected percentage (data-expect="25|50|25") marked. */
function paintTally(e, S, rows){
  var tot = S.cols.map(function(){ return 0; }), exp = String(e.dataset.expect || "").split("|").map(parseFloat);
  rows.forEach(function(r){ S.cols.forEach(function(c, i){ var v = r.vals[i]; if(v != null && v >= 0) tot[i] += v; }); });
  var N = tot.reduce(function(a, b){ return a + b; }, 0);
  var h = '<table class="t"><tr><th>Group</th>' + S.cols.map(function(c){ return "<th>" + esc(c) + "</th>"; }).join("") + "</tr>" +
    rows.map(function(r){ return "<tr><td>" + esc(r.group) + "</td>" + S.cols.map(function(c, i){ return '<td class="num">' + (r.vals[i] == null ? "" : r.vals[i]) + "</td>"; }).join("") + "</tr>"; }).join("") +
    '<tr class="tot"><td><b>Class</b></td>' + tot.map(function(v){ return '<td class="num"><b>' + v + "</b></td>"; }).join("") + "</tr></table>";
  e.querySelector(".pracwrap").innerHTML = h;
  e.querySelector(".lstat").textContent = rows.length + (rows.length === 1 ? " group, " : " groups, ") + N + " in total";
  e.querySelector(".pracnote").textContent = N && exp.length === S.cols.length ? "The marks show what the Punnett square predicts. The more results, the closer the class gets." : "";
  e.querySelector(".pracchart").innerHTML = '<div class="tally">' + S.cols.map(function(c, i){
    var pc = N ? 100 * tot[i] / N : 0, ex = exp[i];
    return '<div class="trow"><span class="tl">' + esc(c) + '</span><span class="tbar"><i style="width:' + pc.toFixed(1) + '%"></i>' +
      (isFinite(ex) ? '<b class="tex2" style="left:' + ex + '%" title="Predicted ' + ex + '%"></b>' : "") + '</span><span class="tp">' + Math.round(pc) + "%</span></div>";
  }).join("") + "</div>";
}
function nice(mx){ if(mx <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(mx))), n = mx / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
function chartSVG(pts, xl, yl){
  var Wd = 640, Ht = 440, l = 80, b = 70, t = 24, r = 24;
  var mxX = nice(Math.max.apply(null, pts.map(function(p){ return p[0]; }).concat([1]))), mxY = nice(Math.max.apply(null, pts.map(function(p){ return p[1]; }).concat([1])));
  function X(v){ return l + (Wd - l - r) * v / mxX; } function Y(v){ return Ht - b - (Ht - b - t) * v / mxY; }
  var o = '<svg viewBox="0 0 ' + Wd + ' ' + Ht + '" xmlns="http://www.w3.org/2000/svg" font-family="Figtree,sans-serif">';
  for(var i = 0; i <= 5; i++){ var gy = Y(mxY * i / 5), gx = X(mxX * i / 5);
    o += '<line x1="' + l + '" x2="' + (Wd - r) + '" y1="' + gy + '" y2="' + gy + '" stroke="#e3e8f2"/><text x="' + (l - 10) + '" y="' + (gy + 6) + '" font-size="17" text-anchor="end" fill="#4d5872">' + +(mxY * i / 5).toFixed(2) + '</text>' +
      '<text x="' + gx + '" y="' + (Ht - b + 26) + '" font-size="17" text-anchor="middle" fill="#4d5872">' + +(mxX * i / 5).toFixed(2) + '</text>'; }
  o += '<line x1="' + l + '" y1="' + t + '" x2="' + l + '" y2="' + (Ht - b) + '" stroke="#1b2135" stroke-width="3"/><line x1="' + l + '" y1="' + (Ht - b) + '" x2="' + (Wd - r) + '" y2="' + (Ht - b) + '" stroke="#1b2135" stroke-width="3"/>';
  o += '<text x="' + ((l + Wd - r) / 2) + '" y="' + (Ht - 12) + '" font-size="20" font-weight="800" text-anchor="middle" fill="#1b2135">' + esc(xl) + '</text>';
  o += '<text transform="translate(22 ' + ((t + Ht - b) / 2) + ') rotate(-90)" font-size="20" font-weight="800" text-anchor="middle" fill="#1b2135">' + esc(yl) + '</text>';
  if(pts.length >= 2){
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0; pts.forEach(function(p){ sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
    var den = n * sxx - sx * sx; if(den){ var m = (n * sxy - sx * sy) / den, c = (sy - m * sx) / n, x0 = 0, x1 = mxX;
      o += '<line x1="' + X(x0) + '" y1="' + Y(clamp(c, 0, mxY)) + '" x2="' + X(x1) + '" y2="' + Y(clamp(m * x1 + c, 0, mxY)) + '" stroke="#DB2777" stroke-width="4" stroke-dasharray="10 8" opacity=".75"/>'; }
  }
  pts.forEach(function(p){ o += '<circle cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="11" fill="#4cc9f0" stroke="#1b2135" stroke-width="3"><title>' + esc(p[2]) + '</title></circle>'; });
  if(!pts.length) o += '<text x="' + ((l + Wd) / 2) + '" y="' + (Ht / 2) + '" font-size="22" text-anchor="middle" fill="#8494b0">Dots appear as groups send results</text>';
  return o + "</svg>";
}
function showRemoteInfo(){
  var url = location.origin + "/kit/v2/remote.html" + (CLASS ? "?room=" + encodeURIComponent(CLASS) : "");
  var o = mk("div", "svmodal");
  o.innerHTML = '<div class="box" style="max-width:520px"><b>Phone remote</b><p style="margin:0;line-height:1.45">On your phone, sign in to Learning Home, then open:</p><p style="margin:0;font:700 18px var(--mono);word-break:break-all">' + esc(url) + '</p><p style="margin:0;line-height:1.45;color:#4d5872">Press Go live on this deck first. The remote moves frames, reveals steps and answers, nominates, opens activities and runs the timer. It only works on Learning Home, because it needs the live room.</p><button class="k2btn solid" type="button">Done</button></div>';
  o.querySelector("button").onclick = function(){ o.remove(); };
  BODY.appendChild(o);
}
