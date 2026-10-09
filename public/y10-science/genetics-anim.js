/* Genetics animations (zoom lab, coin flip, stepper scenes, word cards), carried over from the
   original Year 10 genetics decks. They run on the teacher's deck; students see each state live
   because the live view sends the slide as it changes. */
var W_INIT = [];
(function(){
"use strict";
function $(id){ return document.getElementById(id); }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }

/* ---------------- ZOOM LAB ---------------- */
function zoomLab(root){
  var svg = root.querySelector('#zsvg'); if(!svg || svg._bound) return; svg._bound = true;
  function $(id){ return root.querySelector('#' + id); }
  var NS = 'http://www.w3.org/2000/svg';

  function helix(amp, x0, x1, opts){
    opts = opts || {};
    var k = 2 * Math.PI / 260, out = '', p1 = '', p2 = '';
    for(var x = x0; x <= x1; x += 6){
      var y1 = 300 + amp * Math.sin(k * x), y2 = 300 - amp * Math.sin(k * x);
      p1 += (x === x0 ? 'M' : 'L') + x + ' ' + y1.toFixed(1) + ' ';
      p2 += (x === x0 ? 'M' : 'L') + x + ' ' + y2.toFixed(1) + ' ';
    }
    var pairs = [['A','T','#EA580C','#2563EB'],['C','G','#16A34A','#DB2777'],['T','A','#2563EB','#EA580C'],['G','C','#DB2777','#16A34A']];
    var seq = [0,1,1,3,2,0,3,1,2,2,0,3,1,0,2,3,1,0,3,2,1,0,2,3,0,1];
    var n = 0;
    for(var r = x0 + 14; r < x1; r += 30){
      var a = 300 + amp * Math.sin(k * r), b = 300 - amp * Math.sin(k * r), pr = pairs[seq[n % seq.length]];
      var mid = (a + b) / 2, op = (opts.fade && (r < opts.fade[0] || r > opts.fade[1])) ? 0.28 : 1;
      out += '<g opacity="' + op + '"><line x1="' + r + '" y1="' + a.toFixed(1) + '" x2="' + r + '" y2="' + mid.toFixed(1) + '" stroke="' + pr[2] + '" stroke-width="9" stroke-linecap="round"/>' +
             '<line x1="' + r + '" y1="' + mid.toFixed(1) + '" x2="' + r + '" y2="' + b.toFixed(1) + '" stroke="' + pr[3] + '" stroke-width="9" stroke-linecap="round"/></g>';
      if(opts.letters && Math.abs(a - b) > 70 && op === 1){
        out += '<text x="' + (r + 0) + '" y="' + (Math.min(a,b) - 14).toFixed(1) + '" text-anchor="middle" font-size="26" font-weight="800" fill="' + (a < b ? pr[2] : pr[3]) + '">' + (a < b ? pr[0] : pr[1]) + '</text>';
      }
      n++;
    }
    return out + '<path d="' + p1 + '" fill="none" stroke="#334155" stroke-width="8" stroke-linecap="round"/>' +
                 '<path d="' + p2 + '" fill="none" stroke="#64748B" stroke-width="8" stroke-linecap="round"/>';
  }
  function chrom(x, y, h, col, band, rot){
    var w = h * 0.26, g = '<g transform="translate(' + x + ' ' + y + ') rotate(' + (rot || 0) + ')">';
    [-1, 1].forEach(function(s){
      g += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="' + (w / 2) + '" fill="' + col + '" transform="rotate(' + (s * 16) + ')" stroke="rgba(0,0,0,.18)" stroke-width="3"/>';
      if(band){
        [-0.32, -0.12, 0.2, 0.36].forEach(function(f){
          g += '<rect x="' + (-w / 2) + '" y="' + (h * f) + '" width="' + w + '" height="' + (h * 0.05) + '" fill="rgba(255,255,255,.45)" transform="rotate(' + (s * 16) + ')"/>';
        });
        g += '<rect x="' + (-w / 2 - 2) + '" y="' + (-h * 0.25) + '" width="' + (w + 4) + '" height="' + (h * 0.07) + '" fill="#FACC15" stroke="#a16207" stroke-width="2" transform="rotate(' + (s * 16) + ')"/>';
      }
    });
    return g + '<circle r="' + (w * 0.42) + '" fill="rgba(0,0,0,.25)"/></g>';
  }
  function txt(x, y, s, size, col, anchor){
    return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 26) + '" font-weight="800" fill="' + (col || '#334155') + '" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>';
  }
  function glow(r, col){
    return '<circle cx="450" cy="300" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="7" stroke-dasharray="14 10"><animate attributeName="r" values="' + r + ';' + (r + 12) + ';' + r + '" dur="1.8s" repeatCount="indefinite"/></circle>';
  }

  var S = [];
  /* 0 body */
  S.push('<circle cx="450" cy="118" r="62" fill="#f8c9a2" stroke="#b7774a" stroke-width="5"/>' +
    '<path d="M380 175 Q450 160 520 175 L548 390 Q450 410 352 390 Z" fill="#60A5FA" stroke="#1D4ED8" stroke-width="5"/>' +
    '<path d="M388 190 Q320 270 300 370" fill="none" stroke="#f8c9a2" stroke-width="34" stroke-linecap="round"/>' +
    '<path d="M512 190 Q580 270 600 370" fill="none" stroke="#f8c9a2" stroke-width="34" stroke-linecap="round"/>' +
    '<path d="M410 395 L398 560 M490 395 L502 560" stroke="#334155" stroke-width="40" stroke-linecap="round"/>' +
    '<circle cx="450" cy="300" r="58" fill="#fff" stroke="#EA580C" stroke-width="9"/>' +
    '<g opacity=".9"><circle cx="432" cy="285" r="15" fill="#fbcfe8" stroke="#DB2777" stroke-width="3"/><circle cx="465" cy="282" r="13" fill="#fbcfe8" stroke="#DB2777" stroke-width="3"/><circle cx="448" cy="315" r="15" fill="#fbcfe8" stroke="#DB2777" stroke-width="3"/><circle cx="478" cy="313" r="11" fill="#fbcfe8" stroke="#DB2777" stroke-width="3"/><circle cx="420" cy="317" r="11" fill="#fbcfe8" stroke="#DB2777" stroke-width="3"/></g>' +
    '<line x1="492" y1="342" x2="540" y2="392" stroke="#EA580C" stroke-width="14" stroke-linecap="round"/>' + glow(70, '#EA580C'));
  /* 1 cell */
  S.push('<ellipse cx="450" cy="300" rx="330" ry="235" fill="#ffe0ec" stroke="#DB2777" stroke-width="9"/>' +
    '<ellipse cx="250" cy="230" rx="46" ry="22" fill="#fdba74" stroke="#c2410c" stroke-width="4" transform="rotate(-20 250 230)"/>' +
    '<ellipse cx="650" cy="390" rx="46" ry="22" fill="#fdba74" stroke="#c2410c" stroke-width="4" transform="rotate(25 650 390)"/>' +
    '<ellipse cx="640" cy="200" rx="38" ry="18" fill="#fdba74" stroke="#c2410c" stroke-width="4"/>' +
    '<ellipse cx="270" cy="400" rx="38" ry="18" fill="#fdba74" stroke="#c2410c" stroke-width="4" transform="rotate(15 270 400)"/>' +
    '<g fill="#be185d">' + [[330,160],[560,140],[720,300],[180,320],[560,470],[350,480],[600,290],[300,300]].map(function(p){ return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6"/>'; }).join('') + '</g>' +
    '<circle cx="450" cy="300" r="92" fill="#ede0ff" stroke="#7C3AED" stroke-width="7"/><circle cx="470" cy="285" r="26" fill="#c4b5fd"/>' +
    glow(106, '#7C3AED') + txt(450, 450, 'nucleus', 28, '#7C3AED') + '<path d="M190 70 L235 118" stroke="#DB2777" stroke-width="4"/>' + txt(40, 58, 'cell membrane', 26, '#DB2777', 'start'));
  /* 2 nucleus */
  var nuc = '<circle cx="450" cy="300" r="275" fill="#f3e8ff" stroke="#7C3AED" stroke-width="10"/>';
  var spots = [[260,200,-20],[330,140,10],[560,150,30],[640,230,-10],[680,340,20],[600,440,-30],[470,480,10],[330,450,40],[230,360,-35],[380,230,25],[540,370,-15],[260,280,0]];
  spots.forEach(function(p, i){ nuc += chrom(p[0], p[1], 70, i % 2 ? '#60A5FA' : '#F472B6', false, p[2]); });
  nuc += chrom(420, 300, 92, '#F472B6', false, -6) + chrom(480, 300, 92, '#60A5FA', false, 6) + glow(78, '#1D4ED8');
  S.push(nuc);
  /* 3 chromosome pair */
  S.push(chrom(330, 300, 380, '#F472B6', true, 0) + chrom(570, 300, 380, '#60A5FA', true, 0) +
    txt(330, 560, 'from mum', 32, '#BE185D') + txt(570, 560, 'from dad', 32, '#1D4ED8') +
    '<path d="M660 196 Q760 150 800 120" fill="none" stroke="#a16207" stroke-width="4"/>' + txt(800, 108, 'same spot on both', 24, '#a16207', 'end'));
  /* 4 DNA */
  var key = [['A','#EA580C'],['T','#2563EB'],['C','#16A34A'],['G','#DB2777']].map(function(k, j){ return '<rect x="' + (300 + j * 80) + '" y="440" width="60" height="56" rx="12" fill="' + k[1] + '"/>' + txt(330 + j * 80, 480, k[0], 34, '#fff'); }).join('');
  S.push(helix(110, 30, 870) + key + txt(450, 560, 'Unwound: about 2 metres of DNA in every cell', 28, '#0E7490'));
  /* 5 gene */
  S.push('<rect x="300" y="160" width="300" height="280" rx="26" fill="#dcfce7" stroke="#15803D" stroke-width="7"/>' +
    helix(95, 30, 870, {fade:[300, 600]}) + txt(450, 140, 'one gene', 36, '#15803D') +
    txt(150, 500, 'more DNA', 26, '#94a3b8') + txt(750, 500, 'more DNA', 26, '#94a3b8'));
  /* 6 alleles */
  var a1 = 'ATGCTAGGC'.split(''), a2 = 'ATGCCAGGC'.split('');
  function row(y, letters, col, label){
    var g = txt(70, y + 52, label, 28, col, 'start') + '<rect x="250" y="' + y + '" width="590" height="84" rx="20" fill="#fff" stroke="' + col + '" stroke-width="6"/>';
    letters.forEach(function(L, i){
      var diff = a1[i] !== a2[i];
      g += '<rect x="' + (262 + i * 63) + '" y="' + (y + 12) + '" width="54" height="60" rx="10" fill="' + (diff ? '#FACC15' : '#f1f5f9') + '"/>' +
           txt(289 + i * 63, y + 54, L, 34, diff ? '#7c2d12' : '#334155');
    });
    return g;
  }
  S.push(txt(450, 110, 'Same gene, two versions', 36, '#BE123C') +
    row(170, a1, '#DB2777', 'from mum') + row(330, a2, '#1D4ED8', 'from dad') +
    txt(450, 500, 'One letter different, so the trait can come out different', 26, '#7c2d12'));

  if(!svg.querySelector('.zs')) svg.innerHTML = S.map(function(s, i){ return '<g class="zs" data-i="' + i + '">' + s + '</g>'; }).join('');
  var groups = svg.querySelectorAll('.zs');
  var STEPS = [
    {t:'Body', c:'#EA580C', f:'You are built from around 30 trillion cells. Let’s zoom in on one.'},
    {t:'Cell', c:'#DB2777', f:'Almost every cell carries a full copy of your instructions, kept in the nucleus.'},
    {t:'Nucleus', c:'#7C3AED', f:'The nucleus holds 46 chromosomes, in 23 pairs.'},
    {t:'Chromosome', c:'#1D4ED8', f:'A chromosome is a tightly coiled package of DNA. One of each pair came from your mum, one from your dad.'},
    {t:'DNA', c:'#0891B2', f:'Unwind a chromosome and you get DNA: a code written in four letters, A, T, C and G.'},
    {t:'Gene', c:'#15803D', f:'A gene is one section of DNA that codes for one trait. You have about 20,000 of them.'},
    {t:'Allele', c:'#BE123C', f:'An allele is one version of a gene. You carry two for every gene: one from each parent.'}
  ];
  var crumbs = $('zcrumbs'), lab = svg.closest('.zoomlab');
  if(!crumbs.children.length) crumbs.innerHTML = STEPS.map(function(s){ return '<span>' + s.t + '</span>'; }).join('');
  var i = Math.max(0, Array.prototype.findIndex.call(groups, function(g){ return g.classList.contains('on'); }));
  function paint(){
    var st = STEPS[i];
    lab.style.setProperty('--zc', st.c);
    Array.prototype.forEach.call(groups, function(g, k){
      g.classList.toggle('on', k === i);
      g.classList.toggle('past', k < i);
    });
    Array.prototype.forEach.call(crumbs.children, function(c, k){
      c.classList.toggle('cur', k === i); c.classList.toggle('done', k < i);
    });
    $('zn').textContent = (i + 1) + ' of ' + STEPS.length;
    $('zt').textContent = st.t;
    $('zf').textContent = st.f;
    $('zback').disabled = i === 0;
    $('znext').textContent = i === STEPS.length - 1 ? 'Back to the body' : 'Zoom in';
  }
  $('znext').addEventListener('click', function(){ i = (i + 1) % STEPS.length; paint(); });
  $('zback').addEventListener('click', function(){ if(i > 0){ i--; paint(); } });
  paint();
}

/* ---------------- COIN FLIP DEMO ---------------- */
function flipDemo(root){
  function $(id){ return root.querySelector('#' + id); }
  var btn = $('flipBtn'); if(!btn || btn._bound) return; btn._bound = true;
  var a = $('coinA'), b = $('coinB'), out = $('flipOut');
  btn.addEventListener('click', function(){
    var x = Math.random() < 0.5, y = Math.random() < 0.5;
    [a, b].forEach(function(c){ c.classList.remove('spin'); void c.offsetWidth; c.classList.add('spin'); });
    setTimeout(function(){
      function face(c, h){ c.classList.toggle('t', !h); c.innerHTML = (h ? 'T' : 't') + '<small>' + (h ? 'heads' : 'tails') + '</small>'; }
      face(a, x); face(b, y);
      var g = x && y ? 'TT' : (!x && !y ? 'tt' : 'Tt');
      out.textContent = 'Baby: ' + g + (g === 'tt' ? ', short' : ', tall');
    }, 550);
  });
}
W_INIT.push(zoomLab, flipDemo);
})();

/* ---------------- GENERIC STEPPER + WORD CARDS ----------------
   Each starts from what is already showing, so a student's copy of the slide carries on from
   the step the teacher reached. */
(function(){
  function each(sel, fn, root){ Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); }
  function steppers(rootEl){
    each('[data-stepper]', function(root){
      if(root._bound) return; root._bound = true;
      var scenes = root.querySelectorAll('.sc'), items = root.querySelectorAll('[data-s]');
      var max = 0; Array.prototype.forEach.call(items, function(el){ max = Math.max(max, +el.getAttribute('data-s')); });
      max = Math.max(max, scenes.length - 1);
      var nb = root.querySelector('.stp-next'), bb = root.querySelector('.stp-back'), i = 0;
      // where it is up to: the highest step showing, or the scene that is on
      Array.prototype.forEach.call(items, function(el){ if(!el.classList.contains('off')) i = Math.max(i, +el.getAttribute('data-s')); });
      Array.prototype.forEach.call(scenes, function(sc, k){ if(sc.classList.contains('on')) i = Math.max(i, k); });
      function paint(){
        Array.prototype.forEach.call(scenes, function(sc, k){ sc.classList.toggle('on', k === Math.min(i, scenes.length - 1)); });
        Array.prototype.forEach.call(items, function(el){ el.classList.toggle('off', +el.getAttribute('data-s') > i); });
        if(bb) bb.disabled = i === 0;
        if(nb) nb.textContent = i >= max ? 'Start again' : (nb.getAttribute('data-label') || 'Next');
      }
      if(nb) nb.addEventListener('click', function(){ i = i >= max ? 0 : i + 1; paint(); });
      if(bb) bb.addEventListener('click', function(){ if(i > 0){ i--; paint(); } });
      paint();
    }, rootEl);
  }
  function cards(rootEl){
    each('.wc', function(card){
      if(card._bound) return; card._bound = true;
      var layers = card.querySelectorAll('.wl'), tap = card.querySelector('.tap');
      var n = card.querySelectorAll('.wl:not(.off)').length;
      if(!card.querySelector('.wl.off') && !card.hasAttribute('data-seen')) n = 0; // first time: start hidden
      card.setAttribute('data-seen', '');
      function paint(){
        Array.prototype.forEach.call(layers, function(l, k){ l.classList.toggle('off', k >= n); });
        if(tap) tap.textContent = n >= layers.length ? 'tap to hide' : 'tap to reveal';
      }
      card.addEventListener('click', function(){ n = n >= layers.length ? 0 : n + 1; paint(); });
      card._all = function(on){ n = on ? layers.length : 0; paint(); };
      paint();
    }, rootEl);
    each('.wcall', function(b){
      if(b._bound) return; b._bound = true;
      b.addEventListener('click', function(){
        var s = b.closest('.frame') || b.closest('.slide'), cs = s.querySelectorAll('.wc'), on = b.textContent.indexOf('Reveal') === 0;
        Array.prototype.forEach.call(cs, function(c){ if(c._all) c._all(on); });
        b.textContent = on ? 'Hide all' : 'Reveal all';
      });
    }, rootEl);
  }
  W_INIT.push(steppers, cards);
  W_INIT.forEach(function(fn){ fn(document); });
  // Deck Kit 2 student view: a slide copy was drawn on the student's screen, so make it work there too.
  document.addEventListener('kit2:frame', function(e){ if(e.detail) W_INIT.forEach(function(fn){ fn(e.detail); }); });
})();
