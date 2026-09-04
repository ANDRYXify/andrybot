// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function(){try{
if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
if(!('IntersectionObserver' in window))return;
if(window.CSS&&CSS.supports&&CSS.supports('animation-timeline','view()'))return;
document.documentElement.className+=' sr';
var SEL='.lista .voce,.lista .tit,.lista .par,.lista .sep,.lista .socrow,.lista .img,.lista .emb,.lista .eroe,.lista .griglia,.lista .marq,.lista .bl';
function tutti(){try{document.querySelectorAll(SEL).forEach(function(el){el.classList.add('vis');});}catch(e){}}
function avvia(){try{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('vis');io.unobserve(e.target);}});},{rootMargin:'0px 0px -6% 0px'});document.querySelectorAll(SEL).forEach(function(el){io.observe(el);});}catch(e){tutti();}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',avvia);else avvia();
setTimeout(tutti,5000);
}catch(e){try{document.documentElement.classList.remove('sr');}catch(_){}}})();

(function () {
  var c = document.querySelectorAll('.conto');
  function pezzo(n, s) { return n + s; }
  function giro() {
    for (var i = 0; i < c.length; i++) {
      var t = new Date(c[i].getAttribute('data-quando')).getTime();
      var n = c[i].querySelector('.conto-n');
      if (!t || !n) continue;
      var d = t - Date.now();
      if (d <= 0) { n.textContent = c[i].getAttribute('data-finito') || 'ora!'; continue; }
      var s = Math.floor(d / 1000), g = Math.floor(s / 86400), o = Math.floor(s % 86400 / 3600),
          m = Math.floor(s % 3600 / 60), q = s % 60;
      n.textContent = (g ? pezzo(g, 'g ') : '') + pezzo(o, 'h ') + pezzo(m, 'm ') + pezzo(q, 's');
    }
  }
  giro(); setInterval(giro, 1000);
})();

addEventListener('click', function (e) {
  var b = e.target.closest ? e.target.closest('.chiedi-b') : null;
  if (!b) return;
  var f = document.createElement('iframe');
  f.src = b.getAttribute('data-src');
  f.title = b.getAttribute('data-t') || '';
  f.loading = 'lazy'; f.allowFullscreen = true;
  f.referrerPolicy = 'strict-origin-when-cross-origin';
  f.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write');
  f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms');
  var box = b.closest('.chiedi');
  box.parentNode.replaceChild(f, box);
});
(function () {
  var f = document.getElementById('fascia');
  if (!f) return;
  var mem = null;
  try { mem = localStorage.getItem('sb-consenso'); } catch (e) {  }
  function tutti() { var b = document.querySelectorAll('.chiedi-b'); for (var i = 0; i < b.length; i++) b[i].click(); }
  function ricorda(v) { try { localStorage.setItem('sb-consenso', v); } catch (e) {  } }
  var caricati = false;
  document.getElementById('fascia-si').onclick = function () { ricorda('si'); f.hidden = true; caricati = true; tutti(); };
  document.getElementById('fascia-no').onclick = function () {
    ricorda('no'); f.hidden = true;
    if (caricati) location.reload();
  };
  var ri = document.getElementById('ri-consenso');
  if (ri) ri.onclick = function () { f.hidden = false; };
  if (mem === 'si') { caricati = true; tutti(); return; }
  if (mem === 'no') return;
  f.hidden = false;
})();

addEventListener('message', function (e) {
  if (['https://www.tiktok.com', 'https://www.instagram.com'].indexOf(e.origin) < 0) return;
  var d = e.data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
  if (!d || typeof d !== 'object') return;
  var h = parseInt(d.height || (d.details && d.details.height) || 0, 10);
  if (!(h > 120 && h < 2000)) return;
  var f = document.querySelectorAll('.emb iframe');
  for (var i = 0; i < f.length; i++) {
    var box = f[i].parentNode;
    if (f[i].contentWindow === e.source && !box.getAttribute('data-fisso')) {
      box.style.height = h + 'px'; box.style.aspectRatio = 'auto';
    }
  }
});

(function(){ if (!document.querySelector('.lp-fx-canvas')) return;
(function(){
var cv=document.querySelector('.lp-fx-canvas');if(!cv||!cv.getContext)return;
var ctx=cv.getContext('2d'),rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
var acc=(getComputedStyle(document.documentElement).getPropertyValue('--acc')||'#22ff88').trim();
var G='\\u30A2\\u30A4\\u30A6\\u30A8\\u30AA\\u30AB\\u30AD\\u30AF\\u30B1\\u30B3\\u30B5\\u30B7\\u30B9\\u30BB\\u30BD\\u30BF\\u30C1\\u30C4\\u30C6\\u30C8\\u30CA\\u30CB\\u30CC\\u30CD\\u30CE0123456789\\u30CF\\u30D2\\u30DB\\u30DE\\u30DF';
var fs=16,dpr=Math.min(2,window.devicePixelRatio||1),W,H,cols,ys;
function size(){W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.font=fs+'px ui-monospace,monospace';cols=Math.ceil(W/fs);ys=[];for(var i=0;i<cols;i++)ys[i]=Math.random()*-H;}
size();addEventListener('resize',size,{passive:true});
function frame(){ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,.14)';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over';ctx.fillStyle=acc;for(var i=0;i<cols;i++){var ch=G[Math.floor(Math.random()*G.length)],y=ys[i];ctx.fillText(ch,i*fs,y);if(y>H&&Math.random()>.975)ys[i]=Math.random()*-40;else ys[i]=y+fs;}}
if(rm){frame();return;}
var last=0;function loop(t){if(t-last>55){frame();last=t;}requestAnimationFrame(loop);}requestAnimationFrame(loop);
})();
})();
