// ---------- Shared ----------
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(n).padStart(4,'0');
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const usd=(v,dp=2)=>v==null?'—':'$'+v.toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp});
const eur=v=>v==null?'—':'€'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const ICON_OUT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

// ---------- Pokédex ----------
const TYPES=['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];
const TCOL=['#9fa19f','#e62829','#2980ef','#fac000','#3fa129','#3dcef3','#ff8000','#9141cb','#915121','#81b9ef','#ef4179','#91a119','#afa981','#704170','#5060e1','#624d4e','#60a1b8','#ef70ef'];
const TTX=TCOL.map(h=>{const n=parseInt(h.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;return (0.299*r+0.587*g+0.114*b)>150?'#14171d':'#ffffff'});
const GENS=[['I','Kanto'],['II','Johto'],['III','Hoenn'],['IV','Sinnoh'],['V','Unova'],['VI','Kalos'],['VII','Alola'],['VIII','Galar'],['IX','Paldea']];
const STATN=['HP','Attack','Defense','Sp. Atk','Sp. Def','Speed'];
// attacker -> {defender: multiplier}
const CHART=[{12:.5,13:0,16:.5},{1:.5,2:.5,4:2,5:2,11:2,12:.5,14:.5,16:2},{1:2,2:.5,4:.5,8:2,12:2,14:.5},{2:2,3:.5,4:.5,8:0,9:2,14:.5},{1:.5,2:2,4:.5,7:.5,8:2,9:.5,11:.5,12:2,14:.5,16:.5},{1:.5,2:.5,4:2,5:.5,8:2,9:2,14:2,16:.5},{0:2,5:2,7:.5,9:.5,10:.5,11:.5,12:2,13:0,15:2,16:2,17:.5},{4:2,7:.5,8:.5,12:.5,13:.5,16:0,17:2},{1:2,3:2,4:.5,7:2,9:0,11:.5,12:2,16:2},{3:.5,4:2,6:2,11:2,12:.5,16:.5},{6:2,7:2,10:.5,15:0,16:.5},{1:.5,4:2,6:.5,7:.5,9:.5,10:2,13:.5,15:2,16:.5,17:.5},{1:2,5:2,6:.5,8:.5,9:2,11:2,16:.5},{0:0,10:2,13:2,15:.5},{14:2,16:.5,17:0},{6:.5,10:2,13:2,15:.5,17:.5},{1:.5,2:.5,3:.5,5:2,12:2,16:.5,17:2},{1:.5,6:2,7:.5,14:2,15:2,16:.5}];

const P=DEX.map(d=>({id:d[0],name:d[1],types:d[2],s:d[3],bst:d[3].reduce((a,b)=>a+b,0),h:d[4],w:d[5],ab:d[6],gen:d[7],genus:d[8],flavor:d[9],tag:d[10],key:d[1].toLowerCase()}));
const byId=new Map(P.map(p=>[p.id,p]));
const tvars=t=>`--t:${TCOL[t]};--tx:${TTX[t]}`;
const spr=(id,size)=>`<span class="spr" role="img" aria-label="" style="--s:${size}px;--c:${(id-1)%32};--r:${Math.floor((id-1)/32)}"></span>`;
const chip=t=>`<span class="type" style="${tvars(t)}">${TYPES[t]}</span>`;

const favs=new Set(store.get('pv.favs',[]));
const st={q:'',gen:0,sort:'id',types:[],leg:false,fav:false,list:[]};

$('#gen').innerHTML='<option value="0">All generations</option>'+GENS.map((g,i)=>`<option value="${i+1}">Gen ${g[0]} · ${g[1]}</option>`).join('');
$('#types').innerHTML=TYPES.map((t,i)=>`<button class="tchip" data-t="${i}" aria-pressed="false" style="${tvars(i)}"><i></i>${t}</button>`).join('');
let qT;$('#q').addEventListener('input',e=>{clearTimeout(qT);qT=setTimeout(()=>{st.q=e.target.value.trim().toLowerCase();renderDex()},90)});
$('#gen').addEventListener('change',e=>{st.gen=+e.target.value;renderDex()});
$('#sort').addEventListener('change',e=>{st.sort=e.target.value;renderDex()});
$('#legBtn').addEventListener('click',e=>{st.leg=!st.leg;e.currentTarget.setAttribute('aria-pressed',st.leg);renderDex()});
$('#favBtn').addEventListener('click',e=>{st.fav=!st.fav;e.currentTarget.setAttribute('aria-pressed',st.fav);renderDex()});
$('#types').addEventListener('click',e=>{const b=e.target.closest('.tchip');if(!b)return;const t=+b.dataset.t;const i=st.types.indexOf(t);
  if(i>=0)st.types.splice(i,1);else{st.types.push(t);if(st.types.length>2)st.types.shift()}
  document.querySelectorAll('.tchip').forEach(c=>c.setAttribute('aria-pressed',st.types.includes(+c.dataset.t)));renderDex()});
$('#clearBtn').addEventListener('click',()=>{st.q='';st.gen=0;st.types=[];st.leg=false;st.fav=false;$('#q').value='';$('#gen').value='0';
  ['#legBtn','#favBtn'].forEach(s=>$(s).setAttribute('aria-pressed','false'));document.querySelectorAll('.tchip').forEach(c=>c.setAttribute('aria-pressed','false'));renderDex()});

function renderDex(){
  const q=st.q.replace(/^#/,''),qn=/^\d+$/.test(q)?+q:null;
  let L=P.filter(p=>(!q||(qn!==null?String(p.id).startsWith(q)||p.id===qn:p.key.includes(q)))&&(!st.gen||p.gen===st.gen)&&st.types.every(t=>p.types.includes(t))&&(!st.leg||p.tag>0)&&(!st.fav||favs.has(p.id)));
  const desc=st.sort[0]==='-',k=st.sort.replace('-','');
  const val=p=>k==='id'?p.id:k==='bst'?p.bst:k==='name'?p.key:p.s[+k[1]];
  L.sort((a,b)=>{const x=val(a),y=val(b);const c=typeof x==='string'?x.localeCompare(y):x-y;return (desc?-c:c)||a.id-b.id});
  st.list=L;
  $('#count').innerHTML=`<strong>${L.length.toLocaleString()}</strong> of ${P.length.toLocaleString()} Pokémon`;
  $('#clearBtn').hidden=!(st.q||st.gen||st.types.length||st.leg||st.fav);
  $('#grid').innerHTML=L.length?L.map(p=>`<button class="card" data-id="${p.id}" style="${tvars(p.types[0])}"><span class="label"><span>No. ${pad(p.id)}</span>${favs.has(p.id)?'<svg class="fav" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>':`<span>Gen ${GENS[p.gen-1][0]}</span>`}</span><span class="stage">${spr(p.id,96)}</span><span class="info"><span class="name">${esc(p.name)}</span><span class="chips">${p.types.map(chip).join('')}</span></span></button>`).join('')
    :`<div class="empty"><b>No Pokémon match</b>Try a different name, or clear the filters.</div>`;
}
$('#grid').addEventListener('click',e=>{const c=e.target.closest('.card');if(c)openPokemon(+c.dataset.id)});

function defense(types){const out={};for(let a=0;a<18;a++){let m=1;types.forEach(d=>{const v=CHART[a][d];if(v!==undefined)m*=v});if(m!==1)out[a]=m}return out}
function statColor(v){return v>=110?'var(--good)':v>=70?'var(--mid)':'var(--low)'}
function openPokemon(id){
  const p=byId.get(id);if(!p)return;
  sheet.mode='dex';sheet.id=id;
  $('#dNo').textContent='No. '+pad(p.id);
  $('#dFav').hidden=false;$('#dFav').setAttribute('aria-pressed',favs.has(id));
  const d=defense(p.types),grp=[['4×','x4',4],['2×','x2',2],['½×','h',.5],['¼×','q',.25],['0×','z',0]].map(([l,c,m])=>{const ts=Object.keys(d).filter(t=>d[t]===m);return ts.length?`<span class="m ${c}">${l}</span><div class="chips">${ts.map(t=>chip(+t)).join('')}</div>`:''}).join('');
  const tag=p.tag===2?'<span class="badge">Mythical</span>':p.tag===1?'<span class="badge">Legendary</span>':'';
  showSheet(`
    <div class="hero" style="${tvars(p.types[0])}">${spr(p.id,192)}</div>
    <div class="dname">${esc(p.name)}${tag}</div>
    <div class="genus">${esc(p.genus||'')}</div>
    <div class="chips">${p.types.map(chip).join('')}</div>
    ${p.flavor?`<p class="flavor">${esc(p.flavor)}</p>`:''}
    <h3>Base stats</h3>
    <dl class="stats">${p.s.map((v,i)=>`<dt>${STATN[i]}</dt><dd>${v}</dd><div class="bar"><span style="width:${Math.min(100,v/200*100)}%;--c:${statColor(v)}"></span></div>`).join('')}
      <dt class="total">Total</dt><dd class="total">${p.bst}</dd><div class="total"></div></dl>
    <h3>Profile</h3>
    <div class="facts">
      <div><span>Height</span><b>${(p.h/10).toFixed(1)} m</b></div>
      <div><span>Weight</span><b>${(p.w/10).toFixed(1)} kg</b></div>
      <div class="wide"><span>Debut</span><b>Gen ${GENS[p.gen-1][0]} · ${GENS[p.gen-1][1]}</b></div>
      <div class="wide"><span>Abilities</span><b>${p.ab.map(a=>a.endsWith('*')?`<span class="hidden-ab">${esc(a.slice(0,-1))} (hidden)</span>`:esc(a)).join(', ')||'—'}</b></div>
    </div>
    <h3>Damage taken</h3>
    <div class="match">${grp}</div>`);
}

// ---------- Detail sheet ----------
const sheet={mode:null,id:null};
function showSheet(html){$('#dBody').innerHTML=html;$('#dBody').scrollTop=0;$('#sheet').classList.add('on');$('#scrim').classList.add('on');$('#sheet').setAttribute('aria-hidden','false')}
function closeSheet(){sheet.mode=null;$('#sheet').classList.remove('on');$('#scrim').classList.remove('on');$('#sheet').setAttribute('aria-hidden','true')}
function step(dir){
  if(sheet.mode==='dex'){const L=st.list.length?st.list:P;let i=L.findIndex(p=>p.id===sheet.id);if(i<0)return;i=(i+dir+L.length)%L.length;openPokemon(L[i].id)}
  else if(sheet.mode==='card'){const L=ex.list;let i=L.findIndex(c=>c.id===sheet.id);if(i<0)return;i=(i+dir+L.length)%L.length;openCard(L[i].id)}
}
$('#dClose').addEventListener('click',closeSheet);$('#scrim').addEventListener('click',closeSheet);
$('#dPrev').addEventListener('click',()=>step(-1));$('#dNext').addEventListener('click',()=>step(1));
$('#dFav').addEventListener('click',()=>{if(sheet.mode!=='dex')return;const id=sheet.id;favs.has(id)?favs.delete(id):favs.add(id);store.set('pv.favs',[...favs]);$('#dFav').setAttribute('aria-pressed',favs.has(id));renderDex()});
document.addEventListener('keydown',e=>{if(!sheet.mode)return;if(e.key==='Escape')closeSheet();else if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowLeft')step(-1)});

// ---------- Expansions ----------
const ex={sets:null,updated:null,eurUsd:1.1,lang:store.get('pv.lang','en'),q:'',sort:'new',set:null,cards:[],list:[],shown:0,cache:new Map()};
const PAGE=60;
const img=(base,q)=>base?`${base}/${q}.webp`:'';
const year=d=>d?d.slice(0,4):'';
const fmtDate=d=>d?new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Unknown';
const langTag=l=>`<span class="lang ${l}">${l==='ja'?'JP':'EN'}</span>`;

async function loadSets(){
  if(ex.sets)return;
  try{const r=await fetch('data/sets.json');const d=await r.json();ex.sets=d.sets;ex.updated=d.updated;ex.eurUsd=d.eurUsd||1.1}
  catch{$('#setList').innerHTML='<div class="empty"><b>Expansions could not load</b>Check your connection and refresh the page.</div>';throw new Error('sets')}
}
document.querySelectorAll('#langSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===ex.lang));
$('#langSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;ex.lang=b.dataset.lang;store.set('pv.lang',ex.lang);
  document.querySelectorAll('#langSeg button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderSets()});
let sT;$('#setQ').addEventListener('input',e=>{clearTimeout(sT);sT=setTimeout(()=>{ex.q=e.target.value.trim().toLowerCase();renderSets()},90)});
$('#setSort').addEventListener('change',e=>{ex.sort=e.target.value;renderSets()});

function setTile(s){
  return `<button class="set" data-lang="${s.lang}" data-id="${esc(s.id)}">
    <span class="logo">${s.logo?`<img loading="lazy" src="${s.logo}.webp" alt="${esc(s.name)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:this.alt}))">`:`<span class="ph">${esc(s.name)}</span>`}</span>
    <span class="set-info">
      <span class="set-name">${esc(s.name)}</span>
      <span class="set-meta"><span>${s.code?esc(s.code)+' · ':''}${fmtDate(s.date)}</span>${ex.lang==='all'?langTag(s.lang):''}</span>
      <span class="set-meta"><span>${s.count} cards</span><span>Top <b>${s.top?usd(s.top,0):'—'}</b></span></span>
    </span></button>`;
}
async function renderSets(){
  await loadSets();
  const q=ex.q;
  let L=ex.sets.filter(s=>(ex.lang==='all'||s.lang===ex.lang)&&(!q||s.name.toLowerCase().includes(q)||(s.code||'').toLowerCase()===q||(s.era||'').toLowerCase().includes(q)));
  $('#setCount').innerHTML=`<strong>${L.length}</strong> sets · prices ${ex.updated?fmtDate(ex.updated):''}`;
  if(!L.length){$('#setList').innerHTML='<div class="empty"><b>No sets match</b>Try another name or set code.</div>';return}
  if(ex.sort==='value'||ex.sort==='top'){
    const k=ex.sort;L=[...L].sort((a,b)=>(b[k]||0)-(a[k]||0));
    $('#setList').innerHTML=`<div class="sets">${L.map(setTile).join('')}</div>`;return;
  }
  // Group by era (and language), ordered by each era's latest release
  const groups=new Map();
  for(const s of L){const k=s.lang+'|'+(s.era||'Other');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s)}
  const old=ex.sort==='old';
  const G=[...groups.entries()].map(([k,sets])=>{sets.sort((a,b)=>old?(a.date||'').localeCompare(b.date||''):(b.date||'').localeCompare(a.date||''));const ds=sets.map(s=>s.date).filter(Boolean).sort();return {lang:k.split('|')[0],era:k.split('|').slice(1).join('|'),sets,first:ds[0]||'',last:ds[ds.length-1]||''}});
  G.sort((a,b)=>old?a.first.localeCompare(b.first):b.last.localeCompare(a.last));
  $('#setList').innerHTML=G.map(g=>`<section class="era"><div class="era-head"><h2>${esc(g.era)}</h2>${ex.lang==='all'?langTag(g.lang):''}<span>${year(g.first)}${year(g.last)!==year(g.first)?'–'+year(g.last):''} · ${g.sets.length} set${g.sets.length>1?'s':''}</span></div><div class="sets">${g.sets.map(setTile).join('')}</div></section>`).join('');
}
$('#setList').addEventListener('click',e=>{const b=e.target.closest('.set');if(b)location.hash=`set/${b.dataset.lang}/${b.dataset.id}`});
$('#setBack').addEventListener('click',()=>{location.hash='sets'});

// Japanese cards: add the English Pokémon name when the card names a Pokédex entry
function enName(c,lang){
  if(lang!=='ja'||!c.dex||!byId.has(c.dex))return '';
  let base=byId.get(c.dex).name;
  if(/^メガ/.test(c.name))base='Mega '+base;
  const m=c.name.match(/[A-Za-z0-9.\-☆δ]+$/);
  let suf=m?m[0]:'';
  suf=suf.replace(/^([XY])(ex|EX)$/,'$1 $2');
  return (base+' '+suf).trim();
}
function momChip(m){if(m==null)return '';const c=m>2?'up':m<-2?'down':'flat';return `<span class="mom ${c}" title="7-day vs 30-day average">${m>0?'▲':m<0?'▼':''}${Math.abs(m).toFixed(0)}%</span>`}
function cardPic(c,q){return c.img?`<img loading="lazy" src="${img(c.img,q)}" alt="${esc(c.name)}" onerror="this.remove()"><span class="noimg" style="z-index:-1"><b>${esc(c.name)}</b>No image yet</span>`:`<span class="noimg"><b>${esc(c.name)}</b>No image yet</span>`}

async function openSet(lang,id){
  await loadSets();
  const s=ex.sets.find(x=>x.lang===lang&&x.id===id);
  if(!s){location.hash='sets';return}
  ex.set=s;$('#cardQ').value='';
  $('#setHead').innerHTML=`<div class="sethead">
    ${s.logo?`<div class="big"><img src="${s.logo}.webp" alt="" onerror="this.parentNode.remove()"></div>`:''}
    <div style="min-width:0">
      <div class="eyebrow">${esc(s.era||'')} · ${lang==='ja'?'Japanese':'English'}</div>
      <h1>${esc(s.name)}</h1>
      <div class="stats-row" style="margin-top:12px">
        <div class="stat"><span>Released</span><b>${fmtDate(s.date)}</b></div>
        <div class="stat"><span>Cards</span><b>${s.count}${s.official&&s.official!==s.total?` <small style="font-size:13px;color:var(--muted)">(${s.official} + secrets)</small>`:''}</b></div>
        <div class="stat"><span>Set value</span><b>${usd(s.value,0)}</b></div>
        <div class="stat"><span>Top card</span><b>${usd(s.top,0)}</b></div>
      </div>
    </div></div>`;
  $('#cardGrid').innerHTML='<div class="loading" style="grid-column:1/-1">Loading cards…</div>';$('#cardMore').hidden=true;
  const key=lang+'/'+id;
  try{
    if(!ex.cache.has(key)){const r=await fetch(`data/cards/${lang}/${encodeURIComponent(id)}.json`);ex.cache.set(key,(await r.json()).cards)}
  }catch{$('#cardGrid').innerHTML='<div class="empty"><b>Cards could not load</b>Check your connection and try again.</div>';return}
  if(ex.set!==s)return;
  ex.cards=ex.cache.get(key).map(c=>({...c,en:enName(c,lang),key:(c.name+' '+enName(c,lang)+' '+(c.n||'')).toLowerCase()}));
  const rar=[...new Set(ex.cards.map(c=>c.r).filter(Boolean))];
  $('#cardRarity').innerHTML='<option value="">All rarities</option>'+rar.map(r=>`<option>${esc(r)}</option>`).join('');
  renderCards();
}
let cT;$('#cardQ').addEventListener('input',()=>{clearTimeout(cT);cT=setTimeout(renderCards,90)});
$('#cardSort').addEventListener('change',renderCards);$('#cardRarity').addEventListener('change',renderCards);
$('#cardMore').addEventListener('click',()=>renderCards(true));
function renderCards(more){
  if(more!==true){
    const q=$('#cardQ').value.trim().toLowerCase(),r=$('#cardRarity').value,so=$('#cardSort').value;
    let L=ex.cards.filter(c=>(!q||c.key.includes(q))&&(!r||c.r===r));
    const k=so.replace('-',''),desc=so[0]==='-';
    const num=c=>parseInt((c.n||'').replace(/\D/g,''))||0;
    if(k==='n')L.sort((a,b)=>num(a)-num(b)||(a.n||'').localeCompare(b.n||''));
    else L.sort((a,b)=>{const x=a[k],y=b[k];if(x==null&&y==null)return num(a)-num(b);if(x==null)return 1;if(y==null)return -1;return desc?y-x:x-y});
    ex.list=L;ex.shown=0;$('#cardGrid').innerHTML='';
  }
  const L=ex.list,total=ex.set.official||ex.set.total;
  if(!L.length){$('#cardGrid').innerHTML='<div class="empty"><b>No cards match</b>Try a different name or rarity.</div>';$('#cardMore').hidden=true;return}
  const next=L.slice(ex.shown,ex.shown+PAGE);ex.shown+=next.length;
  $('#cardGrid').insertAdjacentHTML('beforeend',next.map(c=>`<button class="tcg" data-id="${esc(c.id)}">
    <span class="pic">${cardPic(c,'low')}</span>
    <span class="tcg-meta">
      <span class="tcg-top"><span>${esc(c.n||'')}${total?'/'+total:''}</span><span>${esc(c.r||'')}</span></span>
      <span class="tcg-name">${esc(c.name)}</span>
      ${c.en?`<span class="tcg-sub">${esc(c.en)}</span>`:''}
      <span class="price-row">${c.p!=null?`<span class="price">${usd(c.p)}</span>`:'<span class="price na">No price</span>'}${momChip(c.mom)}</span>
    </span></button>`).join(''));
  $('#cardMore').hidden=ex.shown>=L.length;
  $('#cardMore').textContent=`Show more cards (${L.length-ex.shown} left)`;
}
$('#cardGrid').addEventListener('click',e=>{const b=e.target.closest('.tcg');if(b)openCard(b.dataset.id)});

function openCard(id){
  const c=ex.cards.find(x=>x.id===id),s=ex.set;if(!c)return;
  sheet.mode='card';sheet.id=id;$('#dFav').hidden=true;
  const total=s.official||s.total;
  $('#dNo').textContent=`${s.name} · ${c.n||''}${total?'/'+total:''}`;
  const ja=s.lang==='ja';
  const q=encodeURIComponent(`${ja&&c.en?c.en:c.name} ${c.n||''}${total?'/'+total:''} ${ja?'japanese':s.name}`.replace(/\s+/g,' ').trim());
  const qShort=encodeURIComponent(`${ja&&c.en?c.en:c.name} ${s.name}`);
  const tp=c.tp||[],cm=c.cm,rate=ex.eurUsd;
  showSheet(`
    <div class="cardhero"><div class="pic">${cardPic(c,'high')}</div></div>
    <div class="dname">${esc(c.name)}</div>
    <div class="genus">${c.en?esc(c.en)+' · ':''}${esc(c.r||'')}${c.cat&&c.cat!=='Pokemon'?' · '+esc(c.cat):''}</div>
    <div class="mkt"><div><span>Market price</span><b class="price">${c.p!=null?usd(c.p):'No price yet'}</b></div>
      <div style="text-align:right">${c.mom!=null?`<span>30-day trend</span>${momChip(c.mom)}`:''}<span style="margin-top:4px">${c.src==='tcgplayer'?'TCGplayer market':c.src==='cardmarket'?'Cardmarket trend, in USD':''}</span></div></div>
    <h3>Price history</h3><div class="chart" id="priceChart"><div class="note">Loading…</div></div>
    ${tp.length?`<h3>TCGplayer (USD)</h3><div class="ptable-wrap"><table class="ptable"><thead><tr><th>Version</th><th>Market</th><th>Low</th><th>Mid</th><th>High</th></tr></thead><tbody>
      ${tp.map(v=>`<tr><td>${esc(v[0])}</td><td class="hl">${usd(v[1])}</td><td>${usd(v[2])}</td><td>${usd(v[3])}</td><td>${usd(v[4])}</td></tr>`).join('')}</tbody></table></div>
      <p class="note">Market is TCGplayer's figure based on recent completed sales.</p>`:''}
    ${cm?`<h3>Cardmarket (EUR)</h3><div class="ptable-wrap"><table class="ptable"><thead><tr><th></th><th>EUR</th><th>≈ USD</th></tr></thead><tbody>
      <tr><td>Trend</td><td class="hl">${eur(cm[0])}</td><td>${cm[0]?usd(cm[0]*rate):'—'}</td></tr>
      <tr><td>7-day average sold</td><td>${eur(cm[1])}</td><td>${cm[1]?usd(cm[1]*rate):'—'}</td></tr>
      <tr><td>30-day average sold</td><td>${eur(cm[2])}</td><td>${cm[2]?usd(cm[2]*rate):'—'}</td></tr>
      <tr><td>Lowest listing</td><td>${eur(cm[3])}</td><td>${cm[3]?usd(cm[3]*rate):'—'}</td></tr></tbody></table></div>`:''}
    <h3>Check sold prices</h3>
    <div class="links">
      <a href="https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1" target="_blank" rel="noopener">eBay sold ${ICON_OUT}</a>
      <a href="https://www.tcgplayer.com/search/${ja?'pokemon-japan':'pokemon'}/product?q=${qShort}" target="_blank" rel="noopener">TCGplayer ${ICON_OUT}</a>
      <a href="https://www.pricecharting.com/search-products?q=${qShort}&type=prices" target="_blank" rel="noopener">PriceCharting ${ICON_OUT}</a>
      <a href="https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(c.en||c.name)}" target="_blank" rel="noopener">Cardmarket ${ICON_OUT}</a>
    </div>
    <h3>Card</h3>
    <div class="facts">
      <div><span>Number</span><b>${esc(c.n||'—')}${total?'/'+total:''}</b></div>
      <div><span>Rarity</span><b>${esc(c.r||'—')}</b></div>
      <div class="wide"><span>Set</span><b>${esc(s.name)} · ${fmtDate(s.date)}</b></div>
      <div class="wide"><span>Illustrator</span><b>${esc(c.art||'—')}</b></div>
    </div>`);
  loadHistory(s).then(h=>{if(sheet.id===id)drawChart($('#priceChart'),h[id]||[],c)}).catch(()=>{const el=$('#priceChart');if(el)el.innerHTML='<p class="note">Price history could not load.</p>'});
}

// ---------- Price history chart ----------
const histCache=new Map();
async function loadHistory(s){
  const key=s.lang+'/'+s.id;
  if(!histCache.has(key))histCache.set(key,fetch(`data/history/${s.lang}/${encodeURIComponent(s.id)}.json`).then(r=>r.ok?r.json():{}));
  return histCache.get(key);
}
function drawChart(el,pts,c){
  if(!el)return;
  if(!pts.length){el.innerHTML='<p class="note">No price recorded for this card yet.</p>';return}
  const ranges=[['1M',31],['3M',92],['1Y',366],['All',0]];
  let range=store.get('pv.range','All');
  const render=()=>{
    const days=(ranges.find(r=>r[0]===range)||ranges[3])[1];
    const last=new Date(pts[pts.length-1][0]);
    const P=days?pts.filter(p=>(last-new Date(p[0]))/864e5<=days):pts;
    const W=400,H=180,L=46,R=12,T=12,B=26;
    const xs=P.map(p=>+new Date(p[0])),ys=P.map(p=>p[1]);
    let x0=Math.min(...xs),x1=Math.max(...xs);if(x0===x1){x0-=864e5*15;x1+=864e5*15}
    let lo=Math.min(...ys),hi=Math.max(...ys);if(lo===hi){lo=lo*0.8;hi=hi*1.2||1}
    const pad=(hi-lo)*0.1;lo=Math.max(0,lo-pad);hi+=pad;
    const X=t=>L+(t-x0)/(x1-x0)*(W-L-R),Y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
    const ticks=[0,1,2,3].map(i=>lo+(hi-lo)*i/3);
    const fmtT=v=>v>=1000?'$'+(v/1000).toFixed(v>=10000?0:1)+'k':'$'+v.toFixed(v<10?2:0);
    const line=P.map((p,i)=>`${i?'L':'M'}${X(xs[i]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    const area=P.length>1?`${line}L${X(xs[xs.length-1]).toFixed(1)},${H-B}L${X(xs[0]).toFixed(1)},${H-B}Z`:'';
    const dfmt=t=>new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'});
    const first=P[0][1],chg=P.length>1?(P[P.length-1][1]-first)/first*100:null;
    el.innerHTML=`<div class="chart-top"><div class="seg seg-sm" role="group" aria-label="Time range">${ranges.map(r=>`<button data-r="${r[0]}" aria-pressed="${r[0]===range}">${r[0]}</button>`).join('')}</div>
      ${chg!=null?`<span class="mom ${chg>2?'up':chg<-2?'down':'flat'}">${chg>0?'▲':chg<0?'▼':''}${Math.abs(chg).toFixed(1)}%</span>`:''}</div>
      <svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="Market price over time">
        ${ticks.map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L-6}" y="${Y(v)+4}" text-anchor="end" class="ax">${fmtT(v)}</text>`).join('')}
        <text x="${L}" y="${H-6}" class="ax">${dfmt(xs[0])}</text><text x="${W-R}" y="${H-6}" text-anchor="end" class="ax">${dfmt(xs[xs.length-1])}</text>
        ${area?`<path d="${area}" class="area"/>`:''}${P.length>1?`<path d="${line}" class="line"/>`:''}
        <circle cx="${X(xs[xs.length-1])}" cy="${Y(ys[ys.length-1])}" r="4.5" class="end"/>
        <g class="hover" visibility="hidden"><line class="cross" y1="${T}" y2="${H-B}"/><circle r="4" class="hdot"/></g>
        <rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent" class="hit"/>
      </svg>
      <div class="tip" hidden></div>
      ${pts.length<5?`<p class="note">PokéVault started recording prices on ${dfmt(+new Date(pts[0][0]))}. A new point is added every day, so this graph will fill in over time.</p>`:''}`;
    el.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{range=b.dataset.r;store.set('pv.range',range);render()});
    const svg=el.querySelector('svg'),g=svg.querySelector('.hover'),tip=el.querySelector('.tip');
    const move=e=>{const r=svg.getBoundingClientRect(),mx=(e.clientX-r.left)/r.width*W;
      let i=0,best=1e9;xs.forEach((t,j)=>{const d=Math.abs(X(t)-mx);if(d<best){best=d;i=j}});
      const cx=X(xs[i]),cy=Y(ys[i]);g.setAttribute('visibility','visible');g.querySelector('.cross').setAttribute('x1',cx);g.querySelector('.cross').setAttribute('x2',cx);
      g.querySelector('.hdot').setAttribute('cx',cx);g.querySelector('.hdot').setAttribute('cy',cy);
      tip.hidden=false;tip.innerHTML=`<b>${usd(ys[i])}</b><span>${dfmt(xs[i])}</span>`;
      const left=cx/W*r.width;tip.style.left=Math.min(Math.max(left,50),r.width-50)+'px';tip.style.top=(svg.offsetTop+cy/H*r.height-8)+'px'};
    const hide=()=>{g.setAttribute('visibility','hidden');tip.hidden=true};
    const hit=svg.querySelector('.hit');hit.addEventListener('pointermove',move);hit.addEventListener('pointerdown',move);hit.addEventListener('pointerleave',hide);
  };
  render();
}

// ---------- Views ----------
function route(){
  const h=decodeURIComponent(location.hash.slice(1))||'pokedex';
  let view=h,nav=h;
  if(h.startsWith('set/')){view='set';nav='sets'}
  if(!['pokedex','sets','set','portfolio','trades','market'].includes(view))view=nav='pokedex';
  document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='view-'+view);
  document.querySelectorAll('.nav a').forEach(a=>{if(a.dataset.view===nav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  closeSheet();window.scrollTo(0,0);
  if(view==='sets')renderSets().catch(()=>{});
  if(view==='set'){const [,lang,...rest]=h.split('/');openSet(lang,rest.join('/')).catch(()=>{})}
}
addEventListener('hashchange',route);

// Theme
const root=document.documentElement;const savedTheme=store.get('pv.theme',null);if(savedTheme)root.dataset.theme=savedTheme;
$('#themeBtn').addEventListener('click',()=>{const dark=root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;root.dataset.theme=dark?'light':'dark';store.set('pv.theme',root.dataset.theme)});

renderDex();route();
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{});
