
/* ============================================================
   STUDENT VIEW: the same lesson file as a scrolling page.
   Activities become checking questions, live blocks appear when the
   teacher opens them, frames marked data-student="notes" are copied in.
   The name is typed once and kept in this browser.
   ============================================================ */
var SV = {T: null, state: null, id: "", name: "", ans: {}};
var SKEY = "kit2s:" + DECK;
function lsGet(k, d){ try{ var v = localStorage.getItem(k); return v == null ? d : v; }catch(e){ return d; } }
function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
function normAns(s){ return String(s == null ? "" : s).toLowerCase().replace(/\u2212/g, "-").replace(/\s+/g, " ").replace(/[.,;!]+$/, "").trim(); }
function toNum(s){
  s = String(s || "").replace(/\u2212/g, "-").replace(/,/g, "").trim();
  var m = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/); if(m) return +m[1] / +m[2];
  m = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/); if(m) return +m[1] + (m[1][0] === "-" ? -1 : 1) * (+m[2] / +m[3]);
  m = s.replace(/[a-z%°\s]+$/i, "").match(/^-?\d*\.?\d+(e-?\d+)?$/i); return m ? parseFloat(m[0]) : NaN;
}
function checkQ(q, v){
  if(q.dataset.num != null && q.dataset.num !== ""){
    var x = toNum(v), want = toNum(q.dataset.num), tol = q.dataset.tol != null ? +q.dataset.tol : Math.max(1e-9, Math.abs(want) * 0.005);
    return isFinite(x) && Math.abs(x - want) <= tol;
  }
  if(q.dataset.answer){ var a = normAns(v); return q.dataset.answer.split("|").some(function(s){ return normAns(s) === a; }); }
  return null;
}
function buildStudent(){
  BODY.classList.add("k2-student");
  SV.ans = {}; try{ SV.ans = JSON.parse(lsGet(SKEY, "{}")) || {}; }catch(e){ SV.ans = {}; }
  SV.id = lsGet("kit2-id", ""); if(!SV.id){ SV.id = "s-" + rid() + rid(); lsSet("kit2-id", SV.id); }
  SV.name = lsGet("kit2-name", "");
  var top = mk("div", "svtop");
  top.innerHTML = '<span class="ttl">' + esc(D.title) + '</span><span class="sp"></span><span class="svpill off" id="svstat">Not live</span><button class="svpill" type="button" id="svname"></button>';
  BODY.appendChild(top);
  buildSlides();
  var main = mk("main", "sv"); main.id = "svmain"; BODY.appendChild(main);
  var tf = frames[0], sub = tf && tf.querySelector(".title-frame p");
  main.innerHTML = '<h1>' + esc(D.title) + '</h1><p class="intro">' + (sub ? esc(sub.textContent) : "Work through each part when your teacher opens it. Your answers save in this browser.") + '</p>';
  frames.forEach(function(f){
    if(f.dataset.student === "notes"){
      var c = mk("section", "svcard svnotes"); var fc = f.cloneNode(true);
      qa("aside.script,.work,.k2ink,.activity,.live-poll,.live-wall,.live-prac,.stepbtn,.ansall,.gapall", fc).forEach(function(n){ n.remove(); });
      qa("ol.wsteps li", fc).forEach(function(li){ li.classList.remove("hid"); });
      fc.classList.add("on"); fc.removeAttribute("style"); c.appendChild(fc); main.appendChild(c);
    }
    qa(".activity,.live-poll,.live-wall,.live-prac", f).forEach(function(e){ main.appendChild(studentBlock(e)); });
  });
  var stuck = mk("button"); stuck.id = "svstuck"; stuck.type = "button"; stuck.setAttribute("aria-pressed", "false"); stuck.textContent = "I'm stuck";
  stuck.onclick = function(){ var on = stuck.getAttribute("aria-pressed") !== "true"; stuck.setAttribute("aria-pressed", String(on)); stuck.textContent = on ? "Help is coming" : "I'm stuck"; if(SV.T) SV.T.send({t: "stuck", on: on}); };
  BODY.appendChild(stuck);
  initGaps(); initMedia();
  renderTex(BODY);
  paintName(); paintLocks();
  if(ON_LH && CLASS){ whoAmI(); return; }
  if(!SV.name) askName(connectStudent); else connectStudent();
}
// On Learning Home the name comes from the class list: typed once when joining the class,
// and only the teacher can change it.
function whoAmI(){
  var code = classCode();
  if(!code){ setStat("off", "Add this class on Learning Home to join"); return; }
  fetch("/api/join", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({code: code, id: SV.id})})
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){
      if(!j){ setStat("off", "Check your class code on Learning Home"); return; }
      if(j.student){ SV.name = j.student; lsSet("kit2-name", j.student); paintName(); connectStudent(); return; }
      askName(function(){
        fetch("/api/join", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({code: code, id: SV.id, student: SV.name})})
          .then(function(r){ return r.ok ? r.json() : null; })
          .then(function(k){ if(k && k.student){ SV.name = k.student; lsSet("kit2-name", k.student); } paintName(); connectStudent(); });
      });
    }, function(){ setStat("off", "Offline: your answers still save on this computer"); });
}
function paintName(){
  var b = $("svname"); b.textContent = SV.name ? SV.name : "Add your name";
  if(ON_LH && CLASS){ b.onclick = null; b.disabled = !!SV.name; b.title = SV.name ? "Only your teacher can change your name" : ""; if(!SV.name) b.onclick = whoAmI; return; }
  b.onclick = function(){ askName(function(){ if(SV.T){ SV.T.close(); SV.T = null; } connectStudent(); }); };
}
function askName(done){
  var o = mk("div", "svmodal");
  o.innerHTML = '<form class="box"><b>What is your name?</b><label for="svnm" style="color:#4d5872">' + (ON_LH && CLASS ? "Your first and last name. You only do this once, and only your teacher can change it." : "Your teacher sees this when you answer. This browser remembers it.") + '</label><input id="svnm" type="text" maxlength="30" autocomplete="given-name" value="' + esc(SV.name) + '"><button class="svbtn" type="submit">Save</button></form>';
  BODY.appendChild(o);
  var inp = o.querySelector("input"); setTimeout(function(){ inp.focus(); }, 50);
  o.querySelector("form").onsubmit = function(e){ e.preventDefault(); var v = inp.value.trim().replace(/\s+/g, " ").slice(0, 30); if(!v){ inp.focus(); return; } SV.name = v; lsSet("kit2-name", v); o.remove(); paintName(); if(done) done(); };
}
function classCode(){
  try{ var list = JSON.parse(lsGet("lh-classes", "[]")); for(var i = 0; i < list.length; i++) if(list[i].id === CLASS) return list[i].code; }catch(e){}
  return "";
}
function connectStudent(){
  if(!SV.name) return;
  if(ON_LH && CLASS && !classCode()){ setStat("off", "Add this class on Learning Home to join"); return; }
  var T = SV.T = new Transport("student", SV.name, SV.id, {code: classCode()});
  T.on(onStudentMsg); T.open();
  if(!SV.watch) SV.watch = setInterval(function(){
    if(SV.state && now() - SV.at > 50000){ SV.state = null; setStat("off", "Not live yet: work at your own pace"); paintLocks(); turnBanner(null); slidesLive(); }
  }, 10000);
}
/* ---------- the slides, keeping up with the teacher ----------
   Live: the student follows the teacher's slide. They can go back to earlier slides, never past
   the teacher's, and Go live takes them back to it. Not live: every slide, to look back over. */
var SL = {i: 0, follow: true, made: {}};
function liveIdx(){ var st = SV.state; return st && st.frame && st.frame.i != null && st.frame.i < frames.length ? +st.frame.i : -1; }
function buildSlides(){
  if(!frames.length) return;
  var sec = mk("section", "svslides"); sec.id = "svslides"; sec.setAttribute("aria-label", "Slides");
  sec.innerHTML = '<div class="svsbox" id="svsbox"><div class="svsstage" id="svstage"></div></div>' +
    '<div class="svsbar"><button type="button" class="svsnav" id="svprev" aria-label="Previous slide">&#8249; Back</button>' +
    '<span class="svspos" id="svpos"></span>' +
    '<button type="button" class="svsnav" id="svnext" aria-label="Next slide">Next &#8250;</button>' +
    '<span class="sp"></span><span class="svsflag" id="svflag"></span>' +
    '<button type="button" class="svgolive" id="svgolive" hidden>Go live</button></div>';
  BODY.appendChild(sec);
  $("svprev").onclick = function(){ slideGo(SL.i - 1, false); };
  $("svnext").onclick = function(){ slideGo(SL.i + 1, false); };
  $("svgolive").onclick = function(){ var L = liveIdx(); if(L >= 0) slideGo(L, true); };
  sec.addEventListener("click", function(e){
    var b = e.target.closest("[data-goact]"); if(!b) return;
    var c = D.querySelector('.svcard[data-act="' + b.dataset.goact + '"]');
    if(c){ c.hidden = false; c.scrollIntoView({behavior: "smooth", block: "start"}); }
  });
  D.addEventListener("keydown", function(e){
    if(e.target.closest && e.target.closest("input,textarea,select,[contenteditable]")) return;
    if(e.key === "ArrowLeft"){ slideGo(SL.i - 1, false); e.preventDefault(); }
    else if(e.key === "ArrowRight"){ slideGo(SL.i + 1, false); e.preventDefault(); }
  });
  W.addEventListener("resize", slideFit);
  slideGo(0, true);
}
// A copy of a frame for students: no teacher notes, ink or teacher buttons; activities point to the page below.
function studentFrame(i){
  if(SL.made[i]) return SL.made[i];
  var f = frames[i].cloneNode(true);
  f.removeAttribute("style"); f.classList.remove("on");
  qa("aside.script,.work,.k2ink,.stepbtn,.ansall,.gapall,.k2pieceflag,.vctl", f).forEach(function(n){ n.remove(); });
  qa(".activity,.live-poll,.live-wall,.live-prac", f).forEach(function(e){
    var b = mk("button", "svgoact"); b.type = "button"; b.dataset.goact = e.dataset.id || "";
    b.textContent = e.classList.contains("activity") ? "Answer this below \u2193" : "Join in below \u2193";
    e.replaceWith(b);
  });
  qa("video", f).forEach(function(v){ v.controls = true; });
  var head = f.querySelector(":scope > .head");
  if(head && !head.querySelector(".k2chip")){ var chip = mk("span", "k2chip", chipHTML(f.dataset.mode, f.dataset.say)); chip.setAttribute("data-mode", f.dataset.mode); head.insertBefore(chip, head.firstChild); }
  $("svstage").appendChild(f);
  if(f.dataset.kind === "map") buildMap(f);
  renderTex(f);
  SL.made[i] = f;
  return f;
}
function slideGo(i, follow){
  var L = liveIdx(), max = L >= 0 ? L : frames.length - 1;
  i = clamp(i, 0, max);
  var old = SL.made[SL.i]; if(old) old.classList.remove("on");
  SL.i = i; SL.follow = L >= 0 ? (follow || i === L) : true;
  var f = studentFrame(i); f.classList.add("on");
  if(f._drawLinks) f._drawLinks();
  slideFit(); paintSlideBar();
}
function slideFit(){
  var f = SL.made[SL.i], box = $("svsbox"); if(!f || !box) return;
  var k = f.dataset.kind, w = k === "map" ? (+f.dataset.w || 3600) : 1600;
  var h = k === "map" ? (+f.dataset.h || 2000) : k === "scroll" ? Math.max(900, f.offsetHeight) : 900;
  // fit the window: the whole slide plus its buttons stay on screen
  var top = $("svslides").parentNode.querySelector(".svtop"), room = W.innerHeight - (top ? top.offsetHeight : 0) - 110;
  var sec = $("svslides"), full = sec.clientWidth - 36;
  box.style.maxWidth = k === "scroll" ? "" : Math.max(320, Math.min(full, Math.floor(room * w / h))) + "px";
  box.style.margin = "0 auto";
  var s = box.clientWidth / w;
  f.style.transform = "scale(" + s.toFixed(5) + ")";
  $("svstage").style.height = Math.round(h * s) + "px";
  box.classList.toggle("tall", k === "scroll");
}
function paintSlideBar(){
  var L = liveIdx(), max = L >= 0 ? L : frames.length - 1;
  $("svpos").textContent = "Slide " + (SL.i + 1) + " of " + frames.length;
  $("svprev").disabled = SL.i <= 0;
  $("svnext").disabled = SL.i >= max;
  $("svnext").title = L >= 0 && SL.i >= L ? "This is where your teacher is up to" : "";
  var behind = L >= 0 && SL.i !== L;
  $("svgolive").hidden = !behind;
  var fl = $("svflag");
  fl.textContent = L < 0 ? "Not live: look back over any slide" : behind ? "Your teacher is on slide " + (L + 1) : "Live: following your teacher";
  fl.className = "svsflag" + (L >= 0 && !behind ? " on" : "");
}
// Called whenever the teacher's state changes.
function slidesLive(){
  if(!$("svslides")) return;
  var L = liveIdx();
  if(L >= 0 && (SL.follow || SL.i > L)) slideGo(L, true);
  else paintSlideBar();
}
function setStat(cls, text){ var s = $("svstat"); s.className = "svpill " + cls; s.textContent = text; }
function onStudentMsg(m){
  if(m.t === "_status"){
    if(m.s === "live" || m.s === "demo"){ if(!SV.state) setStat("off", "Not live yet: work at your own pace"); }
    else if(m.s === "connecting") setStat("off", "Connecting");
    else if(m.s === "denied") setStat("off", "Check your class code on Learning Home");
    return;
  }
  var f = m.from || {}; if(f.role !== "teacher") return;
  if(m.t === "state" && m.at && Math.abs(now() - m.at) > 60000) return;
  if(m.t === "state"){ if(m.deck !== DECK){ SV.state = null; setStat("off", "Your teacher is on another lesson"); paintLocks(); slidesLive(); return; } SV.state = m; SV.at = now(); setStat("live", "Live with your teacher"); paintLocks(); slidesLive(); }
  if(m.t === "end"){ SV.state = null; setStat("off", "Not live: work at your own pace"); paintLocks(); turnBanner(null); slidesLive(); }
  if(m.t === "nominate"){ turnBanner(m.to === SV.id ? m : null); }
}
function isOpen(id){ if(!SV.state) return null; return (SV.state.open || []).indexOf(id) >= 0; }
function paintLocks(){
  qa(".svcard[data-act]").forEach(function(c){
    var id = c.dataset.act, kind = c.dataset.kind, o = isOpen(id);
    if(kind === "activity"){ c.classList.toggle("locked", o === false); c.classList.toggle("liveon", o === true); }
    else{ c.hidden = o !== true; c.classList.toggle("liveon", o === true); }
    if(kind === "poll" && SV.state){ paintStudentPoll(c, SV.state.polls && SV.state.polls[id]); }
  });
}
function saveAns(){ lsSet(SKEY, JSON.stringify(SV.ans)); }
function studentBlock(e){
  var c = mk("section", "svcard"), id = e.dataset.id;
  c.dataset.act = id;
  if(e.classList.contains("activity")){
    c.dataset.kind = "activity";
    c.innerHTML = '<h2>' + esc(e.dataset.title || "Activity") + '<span class="svprog"><span class="b"><i></i></span><span class="s"><i></i></span><span class="g"><i></i></span></span></h2><div class="lockmsg" hidden>Your teacher will open this one soon.</div>';
    var qs = qa(".q", e);
    qs.forEach(function(q, i){ c.appendChild(studentQ(q, i, id, c)); });
    var lm = c.querySelector(".lockmsg");
    new MutationObserver(function(){ lm.hidden = !c.classList.contains("locked"); }).observe(c, {attributes: true, attributeFilter: ["class"]});
    paintProg(c);
  }else if(e.classList.contains("live-poll")){
    c.dataset.kind = "poll"; c.hidden = true;
    var ch = choicesOf(e), mine = (SV.ans["poll:" + id] || {}).v;
    c.innerHTML = '<h2>Quick poll</h2><div class="qt" style="font-size:22px">' + e.innerHTML + '</div><div class="svpoll">' + ch.map(function(t, k){ return '<button type="button" data-k="' + k + '" aria-pressed="' + (String(mine) === String(k)) + '">' + esc(t) + '</button>'; }).join("") + '</div><div class="fb" style="font-weight:700"></div>';
    c.querySelector(".svpoll").onclick = function(ev){
      var b = ev.target.closest("button"); if(!b) return;
      qa("button", c.querySelector(".svpoll")).forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); });
      SV.ans["poll:" + id] = {v: +b.dataset.k}; saveAns();
      if(SV.T) SV.T.send({t: "vote", id: id, choice: +b.dataset.k});
      c.querySelector(".fb").textContent = "Sent. You can change your mind until your teacher shows the results.";
    };
    c._answer = e.dataset.answer; c._choices = ch;
  }else if(e.classList.contains("live-wall")){
    c.dataset.kind = "wall"; c.hidden = true;
    c.innerHTML = '<h2>Class wall</h2><div class="qt" style="font-size:22px">' + e.innerHTML + '</div><label for="w-' + id + '" style="font-weight:700">Your answer</label><textarea id="w-' + id + '" maxlength="400"></textarea><div class="ans" style="display:flex;gap:10px;align-items:center"><button class="svbtn" type="button">Post</button><span class="fb" style="font-weight:700"></span></div>';
    c.querySelector(".svbtn").onclick = function(){
      var ta = c.querySelector("textarea"), v = ta.value.trim(); if(!v) return;
      if(SV.T) SV.T.send({t: "post", id: id, text: v});
      ta.value = ""; c.querySelector(".fb").textContent = "Posted to the wall";
    };
  }else if(e.classList.contains("live-prac")){
    c.dataset.kind = "prac"; c.hidden = true;
    var S = pracSpec(e), saved = SV.ans["prac:" + id] || {};
    c.innerHTML = '<h2>Send your results</h2><div class="qt" style="font-size:20px">' + e.innerHTML + '</div><div class="svprac"><label>Group name<input type="text" data-g maxlength="40" value="' + esc(saved.group || "") + '"></label>' +
      S.cols.map(function(col, k){ return '<label>' + esc(col) + '<input type="text" inputmode="decimal" data-k="' + k + '" value="' + esc(saved.vals && saved.vals[k] != null ? saved.vals[k] : "") + '"></label>'; }).join("") + '</div><div style="display:flex;gap:10px;align-items:center"><button class="svbtn" type="button">Send to the class table</button><span class="fb" style="font-weight:700"></span></div>';
    c.querySelector(".svbtn").onclick = function(){
      var g = c.querySelector("[data-g]").value.trim() || SV.name, vals = [];
      qa("[data-k]", c).forEach(function(i){ vals[+i.dataset.k] = i.value.trim(); });
      SV.ans["prac:" + id] = {group: g, vals: vals}; saveAns();
      if(SV.T) SV.T.send({t: "row", id: id, group: g, vals: vals});
      c.querySelector(".fb").textContent = "Sent. Send again to fix a number.";
    };
  }
  renderTex(c);
  return c;
}
function paintStudentPoll(c, p){
  if(!p || !p.reveal || !c._choices) return;
  var fb = c.querySelector(".fb"), counts = p.counts || [];
  fb.textContent = "Results: " + c._choices.map(function(t, k){ return t + " " + (counts[k] || 0); }).join(", ") + (c._answer ? ". Answer: " + c._answer : "");
}
function studentQ(q, i, act, card){
  var key = act + ":" + i, st = SV.ans[key] || {}, tier = q.dataset.tier || "bronze";
  var w = mk("div", "svq" + (st.ok ? " ok" : ""));
  var body = q.querySelector(".qbody") ? q.querySelector(".qbody").innerHTML : q.innerHTML;
  w.innerHTML = '<span class="tg ' + tier + '">' + tier.charAt(0).toUpperCase() + tier.slice(1) + ' ' + (i + 1) + '</span><div class="qt">' + body + '</div>';
  var ans = mk("div", "ans"), fb = mk("span", "fb");
  var kind = q.dataset.choices ? "choice" : (q.dataset.answer || q.dataset.num ? "type" : "open");
  function result(ok, v){
    st = SV.ans[key] = SV.ans[key] || {}; st.v = v; st.tries = (st.tries || 0) + (ok ? 0 : 1); st.ok = ok === true; saveAns();
    w.classList.toggle("ok", ok === true); w.classList.toggle("no", ok === false);
    if(ok === true) fb.textContent = "Correct";
    else if(ok === false){ fb.innerHTML = "Not yet." + (q.dataset.hint ? " " + esc(q.dataset.hint) : " Have another go."); if(st.tries >= 3) showMe(); }
    else fb.textContent = "Saved";
    if(SV.T) SV.T.send({t: "prog", act: act, q: String(i), ok: ok, tier: tier});
    paintProg(card);
  }
  function showMe(){
    if(w.querySelector(".showme")) return;
    var b = mk("button", "svbtn ghost showme", "Show me the answer"); b.type = "button";
    b.onclick = function(){ b.replaceWith(mk("span", "fb", "Answer: " + esc(qAnswerText(q)))); };
    ans.appendChild(b);
  }
  if(kind === "choice"){
    var ch = mk("div", "ch");
    q.dataset.choices.split("|").forEach(function(t){ var b = mk("button", "", esc(t.trim())); b.type = "button"; b.setAttribute("aria-pressed", String(st.v === t.trim())); b.onclick = function(){ qa("button", ch).forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); }); result(checkQ(q, t.trim()), t.trim()); }; ch.appendChild(b); });
    ans.appendChild(ch);
  }else if(kind === "type"){
    var inp = mk("input"); inp.type = "text"; inp.value = st.v || ""; inp.setAttribute("aria-label", "Answer to question " + (i + 1)); if(q.dataset.num != null) inp.inputMode = "decimal";
    var go = mk("button", "svbtn", "Check"); go.type = "button";
    go.onclick = function(){ if(inp.value.trim()) result(checkQ(q, inp.value), inp.value.trim()); };
    inp.onkeydown = function(e){ if(e.key === "Enter") go.click(); };
    ans.appendChild(inp); ans.appendChild(go);
  }else{
    var ta = mk("textarea"); ta.value = st.v || ""; ta.setAttribute("aria-label", "Answer to question " + (i + 1)); ta.style.cssText = "width:100%;font:19px var(--body);padding:10px 12px;border:2px solid var(--rule);border-radius:10px;min-height:90px";
    var sv = mk("button", "svbtn", "Save"); sv.type = "button"; sv.onclick = function(){ result(null, ta.value.trim()); };
    ans.appendChild(ta); ans.appendChild(sv);
  }
  ans.appendChild(fb);
  if(st.ok) fb.textContent = "Correct";
  else if(st.tries >= 3) setTimeout(showMe, 0);
  w.appendChild(ans);
  return w;
}
function paintProg(card){
  var act = card.dataset.act, qs = qa(".svq", card), t = {b: [0, 0], s: [0, 0], g: [0, 0]};
  qs.forEach(function(w, i){ var tg = w.querySelector(".tg").className.match(/bronze|silver|gold/)[0].charAt(0); var st = SV.ans[act + ":" + i]; t[tg][1]++; if(st && st.ok) t[tg][0]++; });
  ["b", "s", "g"].forEach(function(k){ var s = card.querySelector(".svprog ." + k); if(!s) return; s.hidden = !t[k][1]; s.querySelector("i").style.width = t[k][1] ? (100 * t[k][0] / t[k][1]) + "%" : "0"; s.title = t[k][0] + " of " + t[k][1]; });
}
function turnBanner(m){
  var b = $("svturn"); if(b) b.remove();
  if(!m) return;
  b = mk("div"); b.id = "svturn"; b.setAttribute("role", "alert");
  b.innerHTML = '<b>Your turn, ' + esc(SV.name) + '</b><span style="font-family:Figtree,sans-serif">Answer out loud, or type it here to send it to the board.</span><input type="text" maxlength="300" aria-label="Your answer" style="font:20px Figtree,sans-serif;padding:10px 12px;border:3px solid #1b1b1b;border-radius:12px"><div style="display:flex;gap:8px"><button class="svbtn" type="button">Send</button><button class="svbtn ghost" type="button">Close</button></div>';
  BODY.appendChild(b);
  var inp = b.querySelector("input"), bs = b.querySelectorAll("button");
  bs[0].onclick = function(){ if(SV.T && inp.value.trim()) SV.T.send({t: "nomans", text: inp.value.trim()}); b.remove(); };
  bs[1].onclick = function(){ b.remove(); };
}

/* ============================================================
   BOOT
   ============================================================ */
loadFonts(usedThemes);
decide(function(v){
  VIEW = v;
  loadStore();
  if(v === "student"){ buildStudent(); }
  else{ buildTeacher(); buildLivePanel(); if(store.liveOn && now() - store.liveOn < 3 * 3600000) startLive(); W.addEventListener("beforeunload", function(){ if(loaded) doSave(); }); D.addEventListener("visibilitychange", function(){ if(D.hidden) doSave(); }); }
  BODY.classList.add("k2-ready");
});
W.KIT2 = {version: "2.0", go: function(i){ go(i); }, store: function(){ return store; }, view: function(){ return VIEW; }};
