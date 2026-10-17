const D=window.APP_DATA;const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state=JSON.parse(localStorage.getItem('sse_state')||'{"answers":0,"correct":0,"today":"","todayCount":0,"days":[],"scores":{}}');
function save(){localStorage.setItem('sse_state',JSON.stringify(state));renderStats()}
function touch(){const d=new Date().toISOString().slice(0,10);if(state.today!==d){state.today=d;state.todayCount=0;if(!state.days.includes(d))state.days.push(d)}save()}
function streak(){let a=[...new Set(state.days)].sort().reverse(),s=0,dt=new Date();for(let i=0;i<365;i++){let k=dt.toISOString().slice(0,10);if(a.includes(k))s++;else if(i>0)break;dt.setDate(dt.getDate()-1)}return s}
function mastery(){return state.answers?Math.round(state.correct/state.answers*100):0}
function renderStats(){$('#streak').textContent=streak();$('#mastery').textContent=mastery()+'%';$('#todayCount').textContent=state.todayCount}
function show(id){stopSpeech();$$('.view').forEach(v=>v.classList.remove('active'));$('#'+id).classList.add('active');$$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===id));window.scrollTo(0,0)}
$$('[data-nav]').forEach(b=>b.onclick=()=>show(b.dataset.nav));$$('.back').forEach(b=>b.onclick=()=>show(b.dataset.back||'home'));
// Speech v1.1: use installed English voices; preserve the tap gesture on iOS.
const speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let availableVoices = [], activeUtterance = null;
const preferredVoices = {
  'en-US': ['Samantha', 'Ava', 'Allison', 'Susan', 'Siri', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Alex'],
  'en-GB': ['Serena', 'Daniel', 'Kate', 'Siri', 'Google UK English Female', 'Google UK English Male', 'Microsoft Sonia', 'Microsoft Ryan']
};
function loadVoices() {
  if (speechSupported) availableVoices = window.speechSynthesis.getVoices();
}
if (speechSupported) {
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}
function findBestVoice(locale) {
  loadVoices();
  const sameLocale = availableVoices.filter(v => v.lang.replace(/_/g, '-').toLowerCase() === locale.toLowerCase());
  // Prefer enhanced/premium variants of known natural voices, then known names.
  const rank = v => {
    const i = preferredVoices[locale].findIndex(n => v.name.toLowerCase().includes(n.toLowerCase()));
    return (i < 0 ? 1000 : i * 10) - (/premium|enhanced|natural/i.test(v.name) ? 100 : 0);
  };
  // Leave voice unset when this accent is unavailable, so lang remains authoritative.
  return sameLocale.sort((a, b) => rank(a) - rank(b))[0] || null;
}
function stopSpeech() {
  if (speechSupported) window.speechSynthesis.cancel();
  activeUtterance = null;
}
function speak(text, locale = 'en-US', slow = false) {
  if (!speechSupported) { alert('この端末では音声読み上げを利用できません。'); return; }
  if (!String(text).trim()) return;
  stopSpeech();
  const u = new window.SpeechSynthesisUtterance(text);
  u.lang = locale; u.rate = slow ? 0.72 : 0.9; u.pitch = 1.0; u.volume = 1.0;
  const voice = findBestVoice(locale);
  if (voice) u.voice = voice;
  activeUtterance = u;
  u.onend = () => { if (activeUtterance === u) activeUtterance = null; };
  u.onerror = e => {
    if (activeUtterance !== u) return;
    activeUtterance = null;
    if (!['canceled', 'interrupted'].includes(e.error)) alert('音声を再生できませんでした。端末の英語音声と音量を確認し、もう一度押してください。');
  };
  window.speechSynthesis.speak(u);
}
function speechButtons(text) {
  const encoded = encodeURIComponent(text).replace(/'/g, '%27');
  return `<div class="speech-buttons" role="group" aria-label="英語の読み上げ">${[['en-US', false, '🔊 US'], ['en-GB', false, '🔊 UK'], ['en-US', true, '🐢 ゆっくり']].map(([locale, slow, label]) => `<button type="button" class="speak" data-speech="${encoded}" data-locale="${locale}" data-slow="${slow}">${label}</button>`).join('')}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-speech]');
  if (b) speak(decodeURIComponent(b.dataset.speech), b.dataset.locale, b.dataset.slow === 'true');
});
window.addEventListener('pagehide', stopSpeech);
function renderLessons(){let el=$('#lessonList');el.innerHTML=D.lessons.map(l=>`<article class="card lesson-card" data-lesson="${l.num}"><div class="num">LESSON ${String(l.num).padStart(2,'0')}</div><h3>${l.title}</h3><div class="core">${l.core}</div><span class="badge">${l.source}</span></article>`).join('');$$('[data-lesson]').forEach(x=>x.onclick=()=>openLesson(+x.dataset.lesson))}
function openLesson(n){let l=D.lessons.find(x=>x.num===n);$('#ldNo').textContent=`LESSON ${String(n).padStart(2,'0')} · ${l.source}`;$('#ldTitle').textContent=l.title;$('#lessonBody').innerHTML=`<div class="card corebox"><p class="eyebrow">CORE IMAGE</p><div class="corebig">${l.core}</div></div><div class="card practice"><p class="eyebrow">SPEAKING</p><ol>${l.practice.map(x=>`<li>${x} ${speechButtons(x.replace(/.*“|”.*/g,''))}</li>`).join('')}</ol></div><div class="card practice"><p class="eyebrow">10 SECOND QUIZ</p>${l.quiz.map(x=>`<p>□ ${x}</p>`).join('')}</div>`;show('lessonDetail')}
function renderPhrases(cat='全部'){let cats=['全部',...new Set(D.phrases.map(x=>x.category))];$('.filter-row').innerHTML=cats.map(c=>`<button class="chip ${c===cat?'active':''}" data-cat="${c}">${c}</button>`).join('');$$('[data-cat]').forEach(b=>b.onclick=()=>renderPhrases(b.dataset.cat));let arr=cat==='全部'?D.phrases:D.phrases.filter(x=>x.category===cat);$('#phraseList').innerHTML=arr.map((p,i)=>`<article class="card phrase-card"><div class="cat">${p.category}</div><h3>${p.english}</h3><div class="meaning">${p.meaning}</div><div class="image-note">${p.image}</div>${speechButtons(p.english)}</article>`).join('')}
function renderBiz(){$('#bizList').innerHTML=D.business.map(x=>`<article class="card biz-card"><div class="eyebrow">${x.label}</div><h3>${x.english}</h3>${speechButtons(x.english)}</article>`).join('')}
let train=[],ti=0,mode='quick';
function rand(a){return a[Math.floor(Math.random()*a.length)]}function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function start(m){touch();mode=m;ti=0;train=[];if(m==='quick'){for(let i=0;i<3;i++){let p=rand(D.phrases);train.push({type:'recall',q:p.meaning,a:p.english,meta:p.category,key:p.english})}for(let i=0;i<3;i++){let l=rand(D.lessons);train.push({type:'core',q:`${l.title} のコアイメージは？`,a:l.core,meta:`LESSON ${String(l.num).padStart(2,'0')}`,key:l.title})}$('#trainTitle').textContent='3分トレーニング'}else if(m==='flash'){train=shuffle(D.phrases).slice(0,10).map(p=>({type:'recall',q:p.meaning,a:p.english,meta:p.category,key:p.english}));$('#trainTitle').textContent='フラッシュカード'}else{train=shuffle(D.lessons).slice(0,10).map(l=>{let wrong=shuffle(D.lessons.filter(x=>x.num!==l.num)).slice(0,3).map(x=>x.core);return{type:'mc',q:`${l.title} のコアイメージは？`,a:l.core,choices:shuffle([l.core,...wrong]),meta:`LESSON ${String(l.num).padStart(2,'0')}`,key:l.title}});$('#trainTitle').textContent='4択クイズ'}show('trainer');renderQ()}
function renderQ(){stopSpeech();let q=train[ti];$('#bar').style.width=((ti/train.length)*100)+'%';$('#qMeta').textContent=`${ti+1}/${train.length} · ${q.meta}`;$('#question').textContent=q.q;$('#feedback').innerHTML='';$('#next').hidden=true;$('#reveal').hidden=q.type==='mc';if(q.type==='mc'){$('#answerArea').innerHTML=q.choices.map(c=>`<button class="choice">${c}</button>`).join('');$$('.choice').forEach(b=>b.onclick=()=>choose(b,q))}else $('#answerArea').innerHTML='<p class="muted">頭の中で英語を言ってから「答えを見る」</p>'}
function record(key,ok){state.answers++;state.todayCount++;if(ok)state.correct++;let s=state.scores[key]||{right:0,wrong:0};ok?s.right++:s.wrong++;state.scores[key]=s;save()}
function choose(b,q){$$('.choice').forEach(x=>{x.disabled=true;if(x.textContent===q.a)x.classList.add('correct')});let ok=b.textContent===q.a;if(!ok)b.classList.add('wrong');record(q.key,ok);$('#feedback').innerHTML=`<p>${ok?'✅ 正解':'△ もう一度'}</p>`;$('#next').hidden=false}
$('#reveal').onclick=()=>{let q=train[ti];$('#answerArea').innerHTML=`<div class="revealbox"><strong>${q.a}</strong>${q.type==='recall'?speechButtons(q.a):''}<div class="rate-row"><button class="again">もう一度</button><button class="good">できた</button><button class="easy">簡単</button></div></div>`;$('#reveal').hidden=true;$('.again').onclick=()=>{record(q.key,false);$('#next').hidden=false};$('.good').onclick=()=>{record(q.key,true);$('#next').hidden=false};$('.easy').onclick=()=>{record(q.key,true);$('#next').hidden=false}}
$('#next').onclick=()=>{ti++;if(ti>=train.length){$('#bar').style.width='100%';$('#qMeta').textContent='COMPLETE';$('#question').textContent='今日の学習、完了。';$('#answerArea').innerHTML=`<div class="revealbox">${train.length}問取り組みました。短時間でも、毎日「思い出す」ことを優先しましょう。</div>`;$('#feedback').innerHTML='';$('#next').hidden=true;$('#reveal').hidden=true}else renderQ()};
$$('[data-mode]').forEach(b=>b.onclick=()=>start(b.dataset.mode));
function renderProgress(){let entries=Object.entries(state.scores).map(([k,v])=>({k,...v,rate:(v.right+v.wrong)?v.right/(v.right+v.wrong):0})).sort((a,b)=>a.rate-b.rate).slice(0,8);$('#progressBody').innerHTML=`<div class="progress-grid"><div class="card progress-card"><span class="muted">累計回答</span><br><b>${state.answers}</b></div><div class="card progress-card"><span class="muted">正答率</span><br><b>${mastery()}%</b></div></div><div class="card progress-card" style="margin-top:10px"><h3>苦手ランキング</h3><div class="weak-list">${entries.length?entries.map(x=>`<div class="weak-item"><span>${x.k}</span><b>${Math.round(x.rate*100)}%</b></div>`).join(''):'まだデータがありません。3分トレーニングから始めてください。'}</div></div><button class="secondary" id="reset" style="margin-top:12px">学習記録をリセット</button>`;$('#reset').onclick=()=>{if(confirm('学習記録をすべて削除しますか？')){localStorage.removeItem('sse_state');location.reload()}}}
$('[data-nav="progress"]').addEventListener('click',renderProgress);
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$('#installBtn').hidden=true}else alert('iPhoneではSafariの共有ボタン →「ホーム画面に追加」を選んでください。')};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
touch();renderLessons();renderPhrases();renderBiz();renderStats();

$('.topbar small').textContent = 'SUPER-SENSE ENGLISH · v1.1';
