// Audio state is independent of quiz results; listening never marks a phrase correct.
const audio = { running:false, paused:false, queue:[], index:0, step:0, rate:1, token:0, timer:null, remaining:0, due:0, voice:null, jaVoice:null, wake:null };
function difficulty(p) {
  const s=state.scores[p.english];
  if(!s)return 'normal';
  return s.difficulty || (s.wrong>s.right?'hard':s.right>=3?'easy':'normal');
}
function audioSteps(p,m) {
  const en={text:p.english,lang:'en-US'},ja={text:p.meaning,lang:'ja-JP'};
  if(m==='recall')return [ja,{wait:3000},en,{wait:1000},en,{wait:2000}];
  if(m==='listen')return [en,{wait:3000},ja,en,{wait:2000}];
  return [en,ja,en];
}
function mix(list,random=Math.random){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function audioQueue(source,minutes,random=Math.random){
  const count=Math.round(minutes*2);
  let pool=D.phrases.filter(p=>source!=='weak'||difficulty(p)==='hard');
  if(!pool.length)return [];
  if(source==='today'){
    // Stable daily selection, with weak phrases first.
    const day=new Date().toLocaleDateString('en-CA');let seed=[...day].reduce((a,c)=>a*31+c.charCodeAt(0),7)>>>0;
    const daily=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    pool=mix(pool,daily).sort((a,b)=>({hard:0,normal:1,easy:2}[difficulty(a)]-({hard:0,normal:1,easy:2}[difficulty(b)]))).slice(0,10);
  }
  let cycle=[];pool.forEach(p=>{const weight=source==='all'?1:({hard:3,normal:2,easy:1}[difficulty(p)]);for(let i=0;i<weight;i++)cycle.push(p)});
  if(source==='shuffle')cycle=mix(cycle,random);
  let q=Array.from({length:count},(_,i)=>cycle[i%cycle.length]);
  if($('#audioShuffle').checked||source==='shuffle')q=mix(q,random);
  return q;
}
function audioPlan(){ $('#audioPlan').textContent=`約${$('#audioMinutes').value}分・${Number($('#audioMinutes').value)*2}問（10問で1セット）。発話速度・文の長さで所要時間は変わります。速度変更は次の読み上げから反映します。`; }
function audioControls(){
  $('#audioStart').disabled=audio.running;$('#audioPause').disabled=!audio.running;
  $('#audioPause').textContent=audio.paused?'▶ 再開':'一時停止';
  $('#audioStop').disabled=!audio.running;$('#audioNext').disabled=!audio.running;
  $$('.audio-settings select,.audio-settings input').forEach(x=>x.disabled=audio.running);
}
async function audioWake(){
  if(!navigator.wakeLock||document.visibilityState!=='visible'||!audio.running||audio.paused||audio.wake)return;
  try{const w=await navigator.wakeLock.request('screen');if(!audio.running||audio.paused){await w.release();return}audio.wake=w;w.addEventListener('release',()=>{if(audio.wake===w)audio.wake=null})}catch(e){}
}
function audioRelease(){if(audio.wake){audio.wake.release().catch(()=>{});audio.wake=null}}
function audioCancel(){audio.token++;clearTimeout(audio.timer);audio.timer=null;stopSpeech()}
function stopAudio(message='停止しました'){
  const was=audio.running;audioCancel();audio.running=false;audio.paused=false;audio.remaining=0;audioRelease();audioControls();if(was)$('#audioStatus').textContent=message;
}
window.stopAudio=stopAudio;
function audioRun(){
  if(!audio.running||audio.paused)return;
  if(audio.index>=audio.queue.length){
    state.audioSessions=state.audioSessions||[];
    state.audioSessions.push({date:new Date().toISOString(),mode:audio.mode,count:audio.queue.length,minutes:audio.minutes});save();
    stopAudio('学習完了。お疲れさまでした。');$('#audioBar').style.width='100%';return;
  }
  const p=audio.queue[audio.index],steps=audioSteps(p,audio.mode);
  if(audio.step>=steps.length){audio.index++;audio.step=0;audioRun();return}
  const part=steps[audio.step], token=++audio.token;
  $('#audioMeta').textContent=`${audio.index+1} / ${audio.queue.length}問 · セット${Math.floor(audio.index/10)+1} · ${p.category}`;
  $('#audioEnglish').textContent=audio.mode==='recall'&&audio.step<2?'英語を思い出しましょう':p.english;
  $('#audioJapanese').textContent=p.meaning;
  $('#audioBar').style.width=(audio.index/audio.queue.length*100)+'%';
  const advance=()=>{if(token!==audio.token||!audio.running||audio.paused)return;audio.remaining=0;audio.step++;audioRun()};
  if(part.wait){const delay=audio.remaining||part.wait;audio.remaining=delay;audio.due=Date.now()+delay;$('#audioStatus').textContent=`思い出す・発音する時間（${part.wait/1000}秒）`;audio.timer=setTimeout(advance,delay);return}
  $('#audioStatus').textContent=part.lang==='en-US'?'US英語を聞く':'日本語を聞く';
  const u=new window.SpeechSynthesisUtterance(part.text);u.lang=part.lang;u.rate=part.lang==='en-US'?audio.rate:1;u.pitch=1;u.volume=1;
  const v=part.lang==='en-US'?audio.voice:audio.jaVoice;if(v)u.voice=v;
  activeUtterance=u;u.onend=()=>{if(activeUtterance===u)activeUtterance=null;advance()};
  u.onerror=e=>{if(token!==audio.token)return;stopAudio('音声を再生できませんでした。端末の音声と音量を確認して再生開始してください。')};
  window.speechSynthesis.speak(u);
}
$('#audioStart').onclick=()=>{
  if(!speechSupported){$('#audioStatus').textContent='この端末では音声読み上げを利用できません。';return}
  stopAudio();audio.minutes=Number($('#audioMinutes').value);audio.mode=$('#audioMode').value;
  audio.queue=audioQueue($('#audioSource').value,audio.minutes);
  if(!audio.queue.length){$('#audioStatus').textContent='苦手フレーズがまだありません。別の出題を選んでください。';return}
  // Same voice selection as v1.1.1, pinned for the entire session.
  audio.voice=findBestVoice('en-US');audio.jaVoice=availableVoices.find(v=>v.lang.replace('_','-').toLowerCase()==='ja-jp')||null;
  audio.index=0;audio.step=0;audio.remaining=0;audio.running=true;audio.paused=false;
  touch();audioControls();audioRun();audioWake();
};
$('#audioPause').onclick=()=>{
  if(!audio.running)return;
  if(audio.paused){audio.paused=false;audioControls();audioRun();audioWake();return}
  if(audio.timer)audio.remaining=Math.max(1,audio.due-Date.now());
  audio.paused=true;audioCancel();audioRelease();audioControls();$('#audioStatus').textContent='一時停止中';
};
$('#audioStop').onclick=()=>stopAudio();
$('#audioNext').onclick=()=>{if(!audio.running)return;audioCancel();audio.index++;audio.step=0;audio.remaining=0;if(audio.paused){$('#audioStatus').textContent='次のフレーズで一時停止中';$('#audioMeta').textContent=`${Math.min(audio.index+1,audio.queue.length)} / ${audio.queue.length}問`}else audioRun()};
$$('[data-audio-rate]').forEach(b=>b.onclick=()=>{audio.rate=Number(b.dataset.audioRate);$$('[data-audio-rate]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))})});
$('#audioMinutes').addEventListener('change',audioPlan);
window.addEventListener('pagehide',()=>stopAudio());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')audioWake()});
audioPlan();audioControls();
