/* ---- movable protractor: drag the centre grip, turn it with the end knobs, the green knob swings a reading arm ---- */
(function(){
  var box = document.getElementById('proto'), G = document.getElementById('protoG'), btn = document.getElementById('btnProto');
  var stageEl = document.getElementById('stage');
  if(!box || !G) return;
  var R = 290, P = {x:800, y:600, rot:0, s:1, arm:50, armOn:true};
  var NS = 'http://www.w3.org/2000/svg';
  function pt(r, d){ var a = d * Math.PI / 180; return [r * Math.cos(a), -r * Math.sin(a)]; }
  function f(n){ return n.toFixed(1); }
  function build(){
    var o = [];
    o.push('<path d="M ' + (R + 14) + ' 0 A ' + (R + 14) + ' ' + (R + 14) + ' 0 0 0 ' + (-R - 14) + ' 0 L ' + (-R - 14) + ' 26 L ' + (R + 14) + ' 26 Z" fill="rgba(170,200,255,.22)" stroke="#2F5BEA" stroke-width="2.5"/>');
    o.push('<path d="M ' + (R - 92) + ' 0 A ' + (R - 92) + ' ' + (R - 92) + ' 0 0 0 ' + (-R + 92) + ' 0" fill="none" stroke="#8FA8E8" stroke-width="1.5"/>');
    for(var d = 0; d <= 180; d++){
      var L = d % 10 === 0 ? 22 : d % 5 === 0 ? 15 : 8, a = pt(R + 14, d), b = pt(R + 14 - L, d);
      o.push('<line x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) + '" stroke="#1D2B55" stroke-width="' + (d % 10 ? 1.2 : 2) + '"/>');
      if(d % 10 === 0){
        var p = pt(R - 26, d), q = pt(R - 64, d);
        o.push('<text x="' + f(p[0]) + '" y="' + f(p[1]) + '" transform="rotate(' + (90 - d) + ' ' + f(p[0]) + ' ' + f(p[1]) + ')" font-size="21" font-weight="800" fill="#1D2B55" text-anchor="middle" dominant-baseline="middle" font-family="Figtree,sans-serif">' + d + '</text>');
        o.push('<text x="' + f(q[0]) + '" y="' + f(q[1]) + '" transform="rotate(' + (90 - d) + ' ' + f(q[0]) + ' ' + f(q[1]) + ')" font-size="17" font-weight="700" fill="#C8102E" text-anchor="middle" dominant-baseline="middle" font-family="Figtree,sans-serif">' + (180 - d) + '</text>');
      }
    }
    o.push('<line x1="' + (-R - 14) + '" y1="0" x2="' + (R + 14) + '" y2="0" stroke="#2F5BEA" stroke-width="2.5"/>');
    o.push('<line x1="0" y1="-16" x2="0" y2="16" stroke="#1D2B55" stroke-width="2"/><circle cx="0" cy="0" r="4" fill="#1D2B55"/>');
    // reading arm
    var e = pt(R + 60, P.arm);
    o.push('<g id="protoArm"' + (P.armOn ? '' : ' style="display:none"') + '><line x1="0" y1="0" x2="' + f(e[0]) + '" y2="' + f(e[1]) + '" stroke="#15803D" stroke-width="3" stroke-dasharray="10 6"/>' +
      '<g class="ph arm no-ink" data-h="arm"><circle class="k" cx="' + f(e[0]) + '" cy="' + f(e[1]) + '" r="17"/></g></g>');
    // handles
    o.push('<g class="ph no-ink" data-h="move"><circle class="k" cx="0" cy="58" r="25"/><path d="M0 40v36M-18 58h36M0 40l-6 7M0 40l6 7M0 76l-6-7M0 76l6-7M-18 58l7-6M-18 58l7 6M18 58l-7-6M18 58l-7 6" stroke="#2F5BEA" stroke-width="3" fill="none" stroke-linecap="round"/></g>');
    [-1, 1].forEach(function(sg){
      o.push('<g class="ph no-ink" data-h="rot"><circle class="k" cx="' + sg * (R + 46) + '" cy="10" r="20"/><path d="M' + (sg * (R + 46) - 9) + ' 6 a 10 10 0 1 1 3 10" stroke="#2F5BEA" stroke-width="3" fill="none" stroke-linecap="round"/></g>');
    });
    o.push('<g class="ph no-ink" data-h="smaller"><circle class="k" cx="-96" cy="58" r="20"/><text x="-96" y="59" text-anchor="middle" dominant-baseline="middle">&#8722;</text></g>');
    o.push('<g class="ph no-ink" data-h="bigger"><circle class="k" cx="96" cy="58" r="20"/><text x="96" y="59" text-anchor="middle" dominant-baseline="middle">+</text></g>');
    o.push('<g class="ph no-ink" data-h="armtoggle"><circle class="k" cx="-176" cy="58" r="20" style="stroke:#15803D"/><text x="-176" y="59" text-anchor="middle" dominant-baseline="middle" style="fill:#15803D;font-size:15px">arm</text></g>');
    o.push('<g class="ph no-ink" data-h="close"><circle class="k" cx="176" cy="58" r="20" style="stroke:#BE123C"/><text x="176" y="60" text-anchor="middle" dominant-baseline="middle" style="fill:#BE123C">&#215;</text></g>');
    G.innerHTML = o.join('');
    place();
  }
  function place(){ G.setAttribute('transform', 'translate(' + f(P.x) + ' ' + f(P.y) + ') rotate(' + f(P.rot) + ') scale(' + P.s + ')'); }
  function toStage(e){ var r = stageEl.getBoundingClientRect(); return [(e.clientX - r.left) * 1600 / r.width, (e.clientY - r.top) * 900 / r.height]; }
  var drag = null;
  G.addEventListener('pointerdown', function(e){
    var h = e.target.closest('.ph'); if(!h) return;
    e.preventDefault(); e.stopPropagation();
    var k = h.getAttribute('data-h'), p = toStage(e);
    if(k === 'bigger' || k === 'smaller'){ P.s = Math.max(0.5, Math.min(1.5, +(P.s + (k === 'bigger' ? 0.1 : -0.1)).toFixed(2))); place(); return; }
    if(k === 'armtoggle'){ P.armOn = !P.armOn; build(); return; }
    if(k === 'close'){ show(false); return; }
    drag = {k:k, id:e.pointerId, dx:p[0] - P.x, dy:p[1] - P.y, h:h};
    try{ h.setPointerCapture(e.pointerId); }catch(err){}
  });
  G.addEventListener('pointermove', function(e){
    if(!drag || e.pointerId !== drag.id) return;
    e.preventDefault(); e.stopPropagation();
    var p = toStage(e);
    if(drag.k === 'move'){ P.x = p[0] - drag.dx; P.y = p[1] - drag.dy; place(); return; }
    var a = Math.atan2(p[1] - P.y, p[0] - P.x) * 180 / Math.PI;
    if(drag.k === 'rot'){
      var side = (drag.h.querySelector('circle').getAttribute('cx') > 0) ? 0 : 180;
      var r = a - side; r = ((r % 360) + 540) % 360 - 180;
      var near = Math.round(r / 45) * 45; if(Math.abs(r - near) < 2.5) r = near;
      P.rot = r; place(); return;
    }
    if(drag.k === 'arm'){
      var m = -(a - P.rot); m = ((m % 360) + 360) % 360;
      P.arm = Math.round(m); build();
      drag.h = G.querySelector('[data-h="arm"]');
    }
  });
  function end(e){ if(drag && e.pointerId === drag.id) drag = null; }
  G.addEventListener('pointerup', end); G.addEventListener('pointercancel', end);
  function show(on){
    box.hidden = !on; btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if(on && !G.firstChild) build();
  }
  btn.addEventListener('click', function(){ show(box.hidden); });
  document.addEventListener('keydown', function(e){
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target; if(t && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
    if(e.key === 'r' || e.key === 'R'){ e.preventDefault(); show(box.hidden); }
  });
})();

/* ---- calculator: MathPrint entry, TI-30XB style keys ---- */
(function(){
  var box = document.getElementById('calc'); if(!box) return;
  var stageEl = document.getElementById('stage');
  var entryEl = document.getElementById('cEntry'), histEl = document.getElementById('cHist'), menuEl = document.getElementById('cMenu');
  var S = {second:false, deg:true, hist:[], ans:0, vars:{x:0,y:0,z:0,t:0,a:0,b:0,c:0}, menu:null, hsel:-1, lastVar:null};
  var VARS = ['x','y','z','t','a','b','c'];
  /* ---------- the entry: a tree of slots. A slot is an array of items; an item is a string token or a template. ---------- */
  function slot(){ return []; }
  var root, cur;
  function reset(){ root = slot(); cur = {s:root, i:0}; S.lastVar = null; }
  reset();
  function T(type, n){ var t = {t:type, s:[]}; for(var i = 0; i < n; i++){ var sl = slot(); sl.parent = t; t.s.push(sl); } return t; }
  function parentOf(sl){ return sl.parent || null; }
  function holder(t){ return t.holder; }
  function insert(item){
    if(typeof item !== 'string'){ item.holder = cur.s; }
    cur.s.splice(cur.i, 0, item); cur.i++;
    if(typeof item !== 'string'){ return item; }
  }
  function enterTpl(t, k){ cur = {s:t.s[k || 0], i:0}; }
  function tpl(type, n, into){ var t = T(type, n); cur.s.splice(cur.i, 0, t); t.holder = cur.s; enterTpl(t, into || 0); return t; }
  function moveRight(){
    if(cur.i < cur.s.length){
      var it = cur.s[cur.i];
      if(typeof it !== 'string'){ enterTpl(it, 0); return; }
      cur.i++; return;
    }
    var t = parentOf(cur.s); if(!t) return;
    var k = t.s.indexOf(cur.s);
    if(k < t.s.length - 1){ cur = {s:t.s[k + 1], i:0}; return; }
    var h = t.holder; cur = {s:h, i:h.indexOf(t) + 1};
  }
  function moveLeft(){
    if(cur.i > 0){
      var it = cur.s[cur.i - 1];
      if(typeof it !== 'string'){ var last = it.s[it.s.length - 1]; cur = {s:last, i:last.length}; return; }
      cur.i--; return;
    }
    var t = parentOf(cur.s); if(!t) return;
    var k = t.s.indexOf(cur.s);
    if(k > 0){ var p = t.s[k - 1]; cur = {s:p, i:p.length}; return; }
    var h = t.holder; cur = {s:h, i:h.indexOf(t)};
  }
  function del(){
    if(cur.i > 0){
      var it = cur.s[cur.i - 1];
      if(typeof it !== 'string'){ var last = it.s[it.s.length - 1]; cur = {s:last, i:last.length}; return; }
      cur.s.splice(cur.i - 1, 1); cur.i--; return;
    }
    var t = parentOf(cur.s); if(!t) return;
    // at the start of a template: unwrap it, keeping what was typed inside
    var h = t.holder, at = h.indexOf(t), flat = [];
    t.s.forEach(function(sl){ sl.forEach(function(x){ if(typeof x !== 'string') x.holder = h; flat.push(x); }); });
    h.splice.apply(h, [at, 1].concat(flat));
    cur = {s:h, i:at};
  }
  /* the previous operand, for templates that wrap it (a typed number becomes the numerator, like the real one) */
  function grabOperand(){
    var s = cur.s, j = cur.i, out = [];
    while(j > 0){
      var it = s[j - 1];
      if(typeof it === 'string' && /^[0-9.]$/.test(it)){ out.unshift(it); j--; } else break;
    }
    s.splice(j, out.length); cur.i = j;
    return out;
  }
  /* ---------- rendering ---------- */
  var FN = {sin:'sin(', cos:'cos(', tan:'tan(', asin:'sin<sup>-1</sup>(', acos:'cos<sup>-1</sup>(', atan:'tan<sup>-1</sup>(', log:'log(', ln:'ln(', nPr:' nPr ', nCr:' nCr ', rand:'rand', randint:'randInt(', abs:'abs('};
  function tokHTML(t){
    if(FN[t]) return '<span class="fn">' + FN[t] + '</span>';
    return ({'*':'×', '/':'÷', '-':'−', neg:'<span style="font-size:.8em">−</span>', pi:'π', e:'<i>e</i>', ans:'<span class="fn">ans</span>', sq:'<span class="sup">2</span>', inv:'<span class="sup">-1</span>',
      pct:'%', deg:'°', min:'′', sec:'″', fact:'!', comma:',', x:'<i>x</i>', y:'<i>y</i>', z:'<i>z</i>', t:'<i>t</i>', a:'<i>a</i>', b:'<i>b</i>', c:'<i>c</i>'})[t] || t;
  }
  function slotHTML(sl, withCur){
    var h = '', cursorHere = withCur && cur.s === sl;
    for(var i = 0; i <= sl.length; i++){
      if(cursorHere && cur.i === i) h += '<span class="cur"></span>';
      if(i === sl.length) break;
      var it = sl[i];
      h += typeof it === 'string' ? tokHTML(it) : tplHTML(it, withCur);
    }
    var empty = !sl.length && sl.parent;
    return '<span class="slot' + (empty && !cursorHere ? ' empty' : '') + '">' + h + '</span>';
  }
  function tplHTML(t, w){
    var s = function(k){ return slotHTML(t.s[k], w); };
    if(t.t === 'frac') return '<span class="fr"><span>' + s(0) + '</span><span>' + s(1) + '</span></span>';
    if(t.t === 'mixed') return s(0) + '<span class="fr"><span>' + s(1) + '</span><span>' + s(2) + '</span></span>';
    if(t.t === 'pow') return '<span class="sup">' + s(0) + '</span>';
    if(t.t === 'sci') return '<span class="fn">×10</span><span class="sup">' + s(0) + '</span>';
    if(t.t === 'sqrt') return '<span class="rad"><span class="rs">√</span><span class="ri">' + s(0) + '</span></span>';
    if(t.t === 'root') return '<span class="rad"><span class="rn">' + s(0) + '</span><span class="rs">√</span><span class="ri">' + s(1) + '</span></span>';
    if(t.t === 'ten') return '<span>10</span><span class="sup">' + s(0) + '</span>';
    if(t.t === 'exp') return '<i>e</i><span class="sup">' + s(0) + '</span>';
    return '';
  }
  /* ---------- evaluation: tokens to a value, with implicit multiplication and TI order of operations ---------- */
  function Err(m){ this.m = m; }
  function toRad(v){ return S.deg ? v * Math.PI / 180 : v; }
  function fromRad(v){ return S.deg ? v * 180 / Math.PI : v; }
  function clean(v){ return Math.abs(v) < 1e-13 ? 0 : v; }
  function evalSlot(sl){
    var toks = [], num = '';
    function flush(){ if(num){ if((num.match(/\./g) || []).length > 1) throw new Err('SYNTAX ERROR'); toks.push({n:parseFloat(num)}); num = ''; } }
    sl.forEach(function(it){
      if(typeof it === 'string' && /^[0-9.]$/.test(it)){ num += it; return; }
      flush();
      if(typeof it === 'string') toks.push({o:it}); else toks.push({tp:it});
    });
    flush();
    var p = 0;
    function peek(){ return toks[p]; }
    function isStart(t){ return t && (t.n != null || t.tp && t.tp.t !== 'pow' && t.tp.t !== 'sci' || t.o && /^(\(|pi|e|ans|x|y|z|t|a|b|c|neg|sin|cos|tan|asin|acos|atan|log|ln|rand|randint|abs)$/.test(t.o)); }
    function expr(){
      var v = term();
      while(peek() && (peek().o === '+' || peek().o === '-')){ var o = toks[p++].o, r = term(); v = o === '+' ? v + r : v - r; }
      return v;
    }
    function term(){
      var v = comb();
      for(;;){
        var t = peek();
        if(t && (t.o === '*' || t.o === '/')){ p++; var r = comb(); if(t.o === '/'){ if(r === 0) throw new Err('DIVIDE BY 0'); v = v / r; } else v = v * r; }
        else if(isStart(t)){ v = v * comb(); }
        else return v;
      }
    }
    function comb(){
      var v = unary();
      while(peek() && (peek().o === 'nPr' || peek().o === 'nCr')){
        var o = toks[p++].o, r = unary();
        if(v < 0 || r < 0 || r > v || v % 1 || r % 1) throw new Err('DOMAIN ERROR');
        var perm = 1; for(var i = 0; i < r; i++) perm *= (v - i);
        if(o === 'nCr'){ var f = 1; for(var j = 2; j <= r; j++) f *= j; perm = perm / f; }
        v = Math.round(perm);
      }
      return v;
    }
    function unary(){ if(peek() && peek().o === 'neg'){ p++; return -unary(); } return post(); }
    function post(){
      var v = prim();
      for(;;){
        var t = peek(); if(!t) return v;
        if(t.tp && t.tp.t === 'pow'){ p++; var e = evalSlot(t.tp.s[0]); v = Math.pow(v, e); if(isNaN(v)) throw new Err('DOMAIN ERROR'); continue; }
        if(t.tp && t.tp.t === 'sci'){ p++; v = v * Math.pow(10, evalSlot(t.tp.s[0])); continue; }
        if(t.o === 'sq'){ p++; v = v * v; continue; }
        if(t.o === 'inv'){ p++; if(v === 0) throw new Err('DIVIDE BY 0'); v = 1 / v; continue; }
        if(t.o === 'pct'){ p++; v = v / 100; continue; }
        if(t.o === 'fact'){ p++; if(v < 0 || v % 1 || v > 69) throw new Err('DOMAIN ERROR'); var f = 1; for(var i = 2; i <= v; i++) f *= i; v = f; continue; }
        if(t.o === 'deg'){ p++; v = S.deg ? v : v * Math.PI / 180; continue; }
        if(t.o === 'min'){ p++; v = S.deg ? v / 60 : v / 60 * Math.PI / 180; continue; }
        if(t.o === 'sec'){ p++; v = S.deg ? v / 3600 : v / 3600 * Math.PI / 180; continue; }
        return v;
      }
    }
    function group(){ var v = expr(); if(peek() && peek().o === ')') p++; else if(peek()) throw new Err('SYNTAX ERROR'); return v; }
    function prim(){
      var t = toks[p++];
      if(!t) throw new Err('SYNTAX ERROR');
      if(t.n != null) return t.n;
      if(t.tp){
        var tp = t.tp;
        if(tp.t === 'frac'){ var d = evalSlot(tp.s[1]); if(d === 0) throw new Err('DIVIDE BY 0'); return evalSlot(tp.s[0]) / d; }
        if(tp.t === 'mixed'){ var w = evalSlot(tp.s[0]), fr = evalSlot(tp.s[1]) / evalSlot(tp.s[2]); return w < 0 ? w - fr : w + fr; }
        if(tp.t === 'sqrt'){ var r = evalSlot(tp.s[0]); if(r < 0) throw new Err('DOMAIN ERROR'); return Math.sqrt(r); }
        if(tp.t === 'root'){ var n = evalSlot(tp.s[0]), x = evalSlot(tp.s[1]); if(x < 0 && Math.round(n) % 2 === 1) return -Math.pow(-x, 1 / n); if(x < 0) throw new Err('DOMAIN ERROR'); return Math.pow(x, 1 / n); }
        if(tp.t === 'ten') return Math.pow(10, evalSlot(tp.s[0]));
        if(tp.t === 'exp') return Math.exp(evalSlot(tp.s[0]));
        throw new Err('SYNTAX ERROR');
      }
      var o = t.o;
      if(o === '('){ var v = expr(); if(peek() && peek().o === ')') p++; return v; }
      if(o === 'pi') return Math.PI;
      if(o === 'e') return Math.E;
      if(o === 'ans') return S.ans;
      if(S.vars.hasOwnProperty(o)) return S.vars[o];
      if(o === 'rand') return Math.random();
      if(o === 'randint'){ var a = expr(); if(!peek() || peek().o !== 'comma') throw new Err('SYNTAX ERROR'); p++; var b = expr(); if(peek() && peek().o === ')') p++; var lo = Math.min(a, b), hi = Math.max(a, b); return lo + Math.floor(Math.random() * (hi - lo + 1)); }
      var g, res;
      switch(o){
        case 'sin': g = group(); return clean(Math.sin(toRad(g)));
        case 'cos': g = group(); return clean(Math.cos(toRad(g)));
        case 'tan': g = group(); res = Math.tan(toRad(g)); if(Math.abs(res) > 1e15 || S.deg && Math.abs(((g % 180) + 180) % 180 - 90) < 1e-9) throw new Err('DOMAIN ERROR'); return clean(res);
        case 'asin': g = group(); if(g < -1 || g > 1) throw new Err('DOMAIN ERROR'); return fromRad(Math.asin(g));
        case 'acos': g = group(); if(g < -1 || g > 1) throw new Err('DOMAIN ERROR'); return fromRad(Math.acos(g));
        case 'atan': g = group(); return fromRad(Math.atan(g));
        case 'log': g = group(); if(g <= 0) throw new Err('DOMAIN ERROR'); return Math.log10(g);
        case 'ln': g = group(); if(g <= 0) throw new Err('DOMAIN ERROR'); return Math.log(g);
        case 'abs': g = group(); return Math.abs(g);
      }
      throw new Err('SYNTAX ERROR');
    }
    if(!toks.length) throw new Err('SYNTAX ERROR');
    var val = expr();
    if(p < toks.length){ if(toks[p].o === ')'){ throw new Err('SYNTAX ERROR'); } throw new Err('SYNTAX ERROR'); }
    return val;
  }
  /* ---------- answers ---------- */
  function hasFrac(sl){ return sl.some(function(it){ return typeof it !== 'string' && (it.t === 'frac' || it.t === 'mixed' || it.s.some(hasFrac)); }); }
  function toFrac(x){
    if(!isFinite(x) || x % 1 === 0) return null;
    var sign = x < 0 ? -1 : 1, v = Math.abs(x), h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = v;
    for(var i = 0; i < 30; i++){
      var a = Math.floor(b), h2 = a * h1 + h0, k2 = a * k1 + k0;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if(Math.abs(v - h1 / k1) < 1e-10 * Math.max(1, v)) break;
      b = 1 / (b - a); if(!isFinite(b)) break;
    }
    if(k1 > 10000 || Math.abs(v - h1 / k1) > 1e-9 * Math.max(1, v)) return null;
    return [sign * h1, k1];
  }
  function sig(x){
    if(x === 0) return '0';
    var ax = Math.abs(x);
    if(ax >= 1e10 || ax < 1e-9){
      var e = Math.floor(Math.log10(ax)), m = x / Math.pow(10, e);
      m = parseFloat(m.toPrecision(10)); if(Math.abs(m) >= 10){ m /= 10; e++; }
      return fmtNum(m) + '<span class="fn">×10</span><span class="sup">' + fmtNum(e) + '</span>';
    }
    return fmtNum(parseFloat(x.toPrecision(10)));
  }
  function fmtNum(v){ var s = String(v); if(s.indexOf('e') >= 0) s = v.toFixed(12).replace(/\.?0+$/, ''); return s.replace(/^-/, '−'); }
  function show(h){
    if(h.err) return h.err;
    var f = toFrac(h.v);
    if(h.mode === 'frac' && f){
      var sgn = f[0] < 0 ? '−' : '', p = Math.abs(f[0]), q = f[1];
      if(h.mixed && p > q) return sgn + Math.floor(p / q) + '<span class="fr"><span>' + (p % q) + '</span><span>' + q + '</span></span>';
      return sgn + '<span class="fr"><span>' + p + '</span><span>' + q + '</span></span>';
    }
    return sig(h.v);
  }
  /* ---------- drawing the screen ---------- */
  function render(){
    document.getElementById('cInd2').innerHTML = S.second ? '<span class="on2">2nd</span>' : '';
    document.getElementById('cIndA').textContent = S.deg ? 'DEG' : 'RAD';
    var hs = S.hist.slice(-2), start = S.hist.length - hs.length;
    histEl.innerHTML = hs.map(function(h, i){
      return '<div class="chl' + (start + i === S.hsel ? ' sel' : '') + '" data-h="' + (start + i) + '"><span class="he">' + slotHTML(h.tree, false) + '</span><span class="hr">' + show(h) + '</span></div>';
    }).join('');
    entryEl.innerHTML = slotHTML(root, true);
    entryEl.classList.toggle('over', entryEl.scrollWidth > entryEl.clientWidth + 2);
    if(S.menu){ menuEl.hidden = false; menuEl.innerHTML = '<div class="mt">' + S.menu.title + '</div>' + S.menu.items.map(function(m, i){ return '<div class="mi" data-m="' + i + '"><b>' + (i + 1) + ':</b>' + m[0] + '</div>'; }).join(''); }
    else menuEl.hidden = true;
  }
  function clone(sl, par){ var c = []; c.parent = par || null; sl.forEach(function(it){ if(typeof it === 'string') c.push(it); else { var t = {t:it.t, s:[]}; it.s.forEach(function(x){ t.s.push(clone(x, t)); }); t.holder = c; c.push(t); } }); return c; }
  function evaluate(){
    if(!root.length){ if(S.hist.length){ root = clone(S.hist[S.hist.length - 1].tree); root.parent = null; cur = {s:root, i:root.length}; } else return; }
    var h = {tree:clone(root)};
    try{
      var v = evalSlot(root);
      if(!isFinite(v)) throw new Err(Math.abs(v) === Infinity ? 'OVERFLOW' : 'DOMAIN ERROR');
      if(Math.abs(v) >= 1e100) throw new Err('OVERFLOW');
      h.v = v; h.mode = hasFrac(root) ? 'frac' : 'dec'; S.ans = v;
    }catch(e){ if(e instanceof Err) h.err = '<span class="fn">' + e.m + '</span>'; else throw e; }
    S.hist.push(h); if(S.hist.length > 40) S.hist.shift();
    reset(); S.hsel = -1;
  }
  /* ---------- menus (prb, angle, mode, sto, recall) ---------- */
  function openMenu(title, items){ S.menu = {title:title, items:items}; render(); }
  function pickMenu(i){ var m = S.menu; if(!m || !m.items[i]) return; S.menu = null; m.items[i][1](); render(); }
  function afterOperatorAns(){ if(!root.length && S.hist.length && !S.hist[S.hist.length - 1].err){ insert('ans'); } }
  /* ---------- keys ---------- */
  function press(k){
    var sec = S.second; S.second = false;
    if(S.menu && k !== 'up' && k !== 'down' && !/^[0-9]$/.test(k) && k !== 'enter' && k !== 'clear' && k !== 'mode'){ S.menu = null; }
    if(S.menu){
      if(/^[1-9]$/.test(k)){ pickMenu(+k - 1); return; }
      if(k === 'clear' || k === 'mode'){ S.menu = null; render(); return; }
      if(k === 'enter'){ pickMenu(0); return; }
      return;
    }
    if(sec){ var b = box.querySelector('[data-k="' + k + '"]'); var k2 = b && b.dataset.k2; if(k2 === undefined || k2 === null) k2 = ''; k = k2 || k; if(!k2 && !/^(2nd)$/.test(k)) {} }
    if(k !== 'var') S.lastVar = null;
    switch(k){
      case '2nd': S.second = !sec; break;
      case 'noop': case 'quit': break;
      case 'mode': openMenu('Angle unit', [['DEG  (degrees)', function(){ S.deg = true; }], ['RAD  (radians)', function(){ S.deg = false; }]]); return;
      case 'del': del(); break;
      case 'clear': if(root.length) reset(); else { S.hist = []; S.hsel = -1; } break;
      case 'reset': S.hist = []; S.ans = 0; VARS.forEach(function(v){ S.vars[v] = 0; }); S.deg = true; reset(); break;
      case 'off': box.hidden = true; var tb = document.getElementById('btnCalc'); if(tb) tb.setAttribute('aria-pressed', 'false'); return;
      case 'left': moveLeft(); break;
      case 'right': moveRight(); break;
      case 'up':
        if(!S.hist.length) break;
        S.hsel = S.hsel < 0 ? S.hist.length - 1 : Math.max(0, S.hsel - 1);
        root = clone(S.hist[S.hsel].tree); root.parent = null; cur = {s:root, i:root.length}; break;
      case 'down':
        if(S.hsel < 0) break;
        S.hsel++; if(S.hsel >= S.hist.length){ S.hsel = -1; reset(); } else { root = clone(S.hist[S.hsel].tree); root.parent = null; cur = {s:root, i:root.length}; } break;
      case 'enter': evaluate(); break;
      case '+': case '-': case '*': case '/': afterOperatorAns(); insert(k); break;
      case 'pow': afterOperatorAns(); tpl('pow', 1); break;
      case 'sq': afterOperatorAns(); insert('sq'); break;
      case 'inv': afterOperatorAns(); insert('inv'); break;
      case 'root': tpl('root', 2); break;
      case 'sqrt': tpl('sqrt', 1); break;
      case 'frac':
        var numr = grabOperand(); var t = tpl('frac', 2);
        if(numr.length){ numr.forEach(function(d){ t.s[0].push(d); }); cur = {s:t.s[1], i:0}; }
        break;
      case 'mixed': var w = grabOperand(); var tm = tpl('mixed', 3); if(w.length){ w.forEach(function(d){ tm.s[0].push(d); }); cur = {s:tm.s[1], i:0}; } break;
      case 'sci': tpl('sci', 1); break;
      case '10x': tpl('ten', 1); break;
      case 'ex': tpl('exp', 1); break;
      case 'pi': insert('pi'); break;
      case 'sin': case 'cos': case 'tan': case 'asin': case 'acos': case 'atan': case 'log': case 'ln': insert(k); break;
      case '(': case ')': insert(k); break;
      case 'pct': insert('pct'); break;
      case 'comma': insert('comma'); break;
      case 'neg': insert('neg'); break;
      case 'ans': insert('ans'); break;
      case 'var':
        if(S.lastVar && cur.i > 0 && cur.s[cur.i - 1] === S.lastVar){ var nx = VARS[(VARS.indexOf(S.lastVar) + 1) % VARS.length]; cur.s[cur.i - 1] = nx; S.lastVar = nx; }
        else { insert('x'); S.lastVar = 'x'; }
        break;
      case 'clrvar': VARS.forEach(function(v){ S.vars[v] = 0; }); break;
      case 'sto': openMenu('Store ans (' + fmtNum(parseFloat(S.ans.toPrecision(10))) + ') in', VARS.map(function(v){ return ['<i>' + v + '</i>', function(){ S.vars[v] = S.ans; }]; })); return;
      case 'recall': openMenu('Recall', VARS.map(function(v){ return ['<i>' + v + '</i> = ' + fmtNum(parseFloat(S.vars[v].toPrecision(10))), function(){ insert(v); }]; })); return;
      case 'prb': openMenu('Probability', [['nPr', function(){ afterOperatorAns(); insert('nPr'); }], ['nCr', function(){ afterOperatorAns(); insert('nCr'); }], ['! (factorial)', function(){ afterOperatorAns(); insert('fact'); }], ['rand', function(){ insert('rand'); }], ['randInt(', function(){ insert('randint'); }]]); return;
      case 'angle': openMenu('Angle', [['° degrees', function(){ insert('deg'); }], ['′ minutes', function(){ insert('min'); }], ['″ seconds', function(){ insert('sec'); }]]); return;
      case 'tog': case 'fd': case 'fmix':
        var last = S.hist[S.hist.length - 1];
        if(last && !last.err){ if(k === 'fmix') last.mixed = !last.mixed; else last.mode = last.mode === 'frac' ? 'dec' : 'frac'; }
        break;
      case 'hyp': case 'const': case 'data': case 'stat': case 'table': case 'topct':
        flash(k === 'hyp' ? 'hyp is not on this one' : 'Use your own calculator for ' + ({const:'constants', data:'data lists', stat:'statistics', table:'tables', topct:'▸%'})[k]); break;
      default:
        if(/^[0-9.]$/.test(k)){ if(!root.length && S.hist.length && S.hsel < 0) {} insert(k); }
    }
    render();
  }
  function flash(msg){ var el = document.createElement('div'); el.className = 'menu'; el.style.justifyContent = 'center'; el.style.textAlign = 'center'; el.textContent = msg; box.querySelector('.lcd').appendChild(el); setTimeout(function(){ el.remove(); }, 1400); }
  box.addEventListener('pointerdown', function(e){
    focused = true;
    var mi = e.target.closest('.mi'); if(mi){ e.preventDefault(); pickMenu(+mi.dataset.m); return; }
    var hl = e.target.closest('.chl'); if(hl){ e.preventDefault(); var h = S.hist[+hl.dataset.h]; insert('ans'); S.ans = h && !h.err ? h.v : S.ans; render(); return; }
    var b = e.target.closest('[data-k]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    b.classList.add('hit'); setTimeout(function(){ b.classList.remove('hit'); }, 110);
    press(b.dataset.k);
  });
  /* dragging by the top strip, in slide coordinates so it scales with the slide */
  var drag = null, focused = false;
  box.querySelector('.cgrip').addEventListener('pointerdown', function(e){
    if(e.target.closest('button')) return;
    var r = stageEl.getBoundingClientRect(), k = 1600 / r.width;
    drag = {id:e.pointerId, x:e.clientX, y:e.clientY, l:box.offsetLeft, t:box.offsetTop, k:k};
    box.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation();
  });
  box.addEventListener('pointermove', function(e){
    if(!drag || e.pointerId !== drag.id) return;
    box.style.left = Math.max(-300, Math.min(1500, drag.l + (e.clientX - drag.x) * drag.k)) + 'px';
    box.style.top = Math.max(-40, Math.min(820, drag.t + (e.clientY - drag.y) * drag.k)) + 'px';
  });
  box.addEventListener('pointerup', function(){ drag = null; });
  document.addEventListener('pointerdown', function(e){ if(!e.target.closest('#calc')) focused = false; }, true);
  document.addEventListener('keydown', function(e){
    if(box.hidden || !focused || e.ctrlKey || e.metaKey || e.altKey) return;
    var map = {'Enter':'enter', '=':'enter', 'Backspace':'del', 'Delete':'del', 'Escape':'clear', 'ArrowLeft':'left', 'ArrowRight':'right', 'ArrowUp':'up', 'ArrowDown':'down',
      '+':'+', '-':'-', '*':'*', 'x':'*', '/':'frac', '^':'pow', '(':'(', ')':')', '.':'.', 'p':'pi', 's':'sin', 'c':'cos', 't':'tan', 'l':'log', 'n':'ln', 'r':'sqrt', '!':'fact', '%':'pct'};
    var k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
    if(!k) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if(k === 'fact'){ insert('fact'); render(); return; }
    press(k);
  }, true);
  window.CALC = {show:function(on){ box.hidden = !on; if(on) render(); }, press:press, _S:S, text:function(){ return entryEl.textContent + ' | ' + histEl.textContent; }};
  render();
})();
