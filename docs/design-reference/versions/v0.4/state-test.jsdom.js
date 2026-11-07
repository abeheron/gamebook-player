const {JSDOM}=require('jsdom');const d=new JSDOM(require('fs').readFileSync('/workspace/gamebook-player-prototype/index.html','utf8'),{runScripts:'dangerously',url:'http://localhost/index.html#read',pretendToBeVisual:true,beforeParse(w){w.scrollTo=(x,y)=>{w.scrollY=y};w.localStorage.setItem('gbp-prefs','{"anim":false}');w.Audio=undefined}});
const w=d.window,$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
let fails=0,passes=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);c?passes++:fails++};const go=id=>w.eval('go('+JSON.stringify(id)+')'),back=()=>w.eval('back()');
const logState=sec=>{const tr=$$('#logrows tr').find(r=>r.cells[2]&&r.cells[2].textContent.trim()==='§'+sec);return tr?[tr.querySelectorAll('.box.t').length,tr.querySelectorAll('.box').length]:null};
const readTicked=()=>!!$('#sectionView .tickrow .box.t');
const on=()=>$('.screen.on').id,key=k=>w.document.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true}));
ok(on()==='read'&&!$('#backBtn'),'initial read, no back button');
ok(!readTicked()&&String(logState(214))==='0,1','SYNC initial: reading and log both show §214 unticked');
key('Escape');ok(on()==='read','Esc with empty history is safe');
w.scrollY=400;$('[data-go=sheet]').click();ok(on()==='sheet'&&/Back to reading/.test($('#backBtn').textContent),'sheet shows Back to reading');
$('#backBtn').click();ok(on()==='read'&&w.scrollY===400,'back restores reading + scroll');
// test choice from reading
$$('#sectionView [data-ci]')[0].click();ok(on()==='test','test choice opens test');
ok($('#dPass').disabled&&$('#dFail').disabled,'destinations locked before roll');
key('2');ok(/Back to test/.test($('#backBtn').textContent),'sheet from test: Back to test');key('Escape');ok(on()==='test','Esc back to test');
w.Math.random=()=>0.99;$('#roll').click();ok(!$('#dFail').disabled&&$('#dPass').disabled,'double 6 => only Fail enabled');
$$('.die')[0].click();w.Math.random=()=>0;$('#reroll').click();ok(!$('#dPass').disabled&&$('#dFail').disabled,'reroll to pass flips destination');
$('[data-mode=fight]').click();$('[data-mode=test]').click();ok($('#dPass').disabled&&$('#dFail').disabled,'mode switch clears stale outcome');
w.Math.random=()=>0;$('#roll').click();$('#dPass').click();ok(on()==='read'&&/Section 326/.test($('#sectionView').textContent)&&/passed/.test($('#sectionView').textContent),'pass goes to demo 326');
ok($('#dPass').disabled,'test reset after resolving');
$$('#sectionView [data-ci]')[0].click();ok(/Section 214/.test($('#sectionView').textContent)&&$('#sectionView .box.t'),'back in 214, box ticked');
ok(readTicked()&&String(logState(214))==='1,1','SYNC revisit: log shows §214 1/1 matching reading');
ok(/ticked/.test($('#sectionView .tickrow .box').getAttribute('aria-label'))&&/1 of 1/.test($$('#logrows tr').find(r=>/§214/.test(r.textContent)).querySelector('.boxes').getAttribute('aria-label')),'SYNC aria labels agree');
$$('#sectionView [data-ci]')[1].click();$$('#sectionView [data-ci]')[0].click();ok(String(logState(214))==='1,1','SYNC second leave does not exceed max');
ok(/5 boxes/.test($('#nt').textContent),'SYNC summary counts updated: '+$('#nt').textContent);
$('#resetDice').click();ok(readTicked()&&String(logState(214))==='1,1','SYNC Reset demo (dice) leaves both views consistent');
// fight
$$('#sectionView [data-ci]')[3].click();ok(on()==='test'&&$('[data-mode=fight]').getAttribute('aria-pressed')==='true','fight choice opens fight mode');
w.Math.random=()=>0.3;$('#roll').click();ok($('#dCont').disabled,'fight dest locked after round 1');$('#roll').click();$('#roll').click();
ok(!$('#dCont').disabled&&$('#roll').disabled,'fight complete unlocks continue, roll disabled');
$('#resetDice').click();$('[data-mode=fight]').click();w.Math.random=()=>0.99;$('#roll').click();$('#roll').click();ok($('#roll').disabled&&/not modelled/.test($('#dest').textContent),'double 6 fumble x? vitality 0 handled: '+$('#tv').textContent);
ok($('#dest button').disabled,'dead: continue disabled');
// back after resolving test should not loop to stale read entry
$('[data-mode=test]').click();w.Math.random=()=>0.99;$('#roll').click();$('#dFail').click();ok(/Section 47/.test($('#sectionView').textContent),'fail goes to 47');
ok(!$('#backBtn')||!/reading/.test($('#backBtn').textContent),'no duplicate Back to reading: '+($('#backBtn')||{}).textContent);
ok($$('.box.sm').length>0,'log uses sm boxes');
// fresh load = reset of all demo state
const d2=new JSDOM(require('fs').readFileSync('/workspace/gamebook-player-prototype/index.html','utf8'),{runScripts:'dangerously',url:'http://localhost/index.html#log',beforeParse(w){w.scrollTo=()=>{}}});
const q2=s=>d2.window.document.querySelector(s);const tr2=[...d2.window.document.querySelectorAll('#logrows tr')].find(r=>/§214/.test(r.textContent));
ok(tr2.querySelectorAll('.box.t').length===0&&!q2('#sectionView .tickrow .box.t'),'SYNC reload resets both views to unticked');

// ---- v0.3 checks ----
key('6');ok(on()==='rules'&&/Back to/.test($('#backBtn').textContent),'key 6 opens Rules with Back');
ok(/Double 1 always passes/.test($('#rules').textContent)&&/Not in the design doc/.test($('#rules').textContent),'Rules has source summary and gaps card');
ok($$('nav.side [data-go=rules]').length===1&&$$('.mobilebar [data-go=rules]').length===1,'Rules in sidebar and mobile bar');
key('Escape');
// illustrations
go214();function go214(){w.eval('turnTo(214,null)')}
ok($('#sectionView figure.illus svg')&&/Scanned/.test($('#sectionView figure.illus').textContent),'214 inline placeholder art with Scanned demo label');
$('#sectionView .frame').focus();$('#sectionView .frame').click();ok(!$('#lightbox').hidden&&w.document.activeElement.id==='lbClose','lightbox opens, focus on Close');
key('3');ok(on()==='read','number keys ignored while lightbox open');
w.document.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));ok($('#lightbox').hidden&&on()==='read'&&w.document.activeElement.classList.contains('frame'),'Esc closes lightbox, returns focus, no screen back');
$('[data-illus=link]').click();ok(!$('#sectionView figure.illus')&&$('#sectionView .illus-link'),'Link-only mode shows link');
$('#sectionView .illus-link').click();ok(!$('#lightbox').hidden,'link opens lightbox');$('#lbClose').click();ok($('#lightbox').hidden,'Close button closes');
$('[data-illus=hidden]').click();ok(!$('#sectionView .illus'),'Hidden mode omits image');
ok(JSON.parse(w.localStorage.getItem('gbp-prefs')).illus==='hidden','illustration pref persisted');
$('[data-illus=inline]').click();
w.eval('turnTo(232,null)');ok(!$('#sectionView .illus')&&!$('#sectionView .prefrow'),'section without image has no empty region');
// search box sizing rule present
ok(/flex:1 1 20rem;min-width:min\(100%,20rem\)/.test(w.document.querySelector('style').textContent),'filter box min sizing CSS');
// prefs toggles
ok($('#prefAnim').checked===false&&$('#prefSound').checked===true,'stored instant pref loaded; sound on by default when unset');
// animated roll checks (async)
(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));
 go('test');$('[data-mode=test]').click();$('#prefAnim').click();ok(JSON.parse(w.localStorage.getItem('gbp-prefs')).anim===true,'anim pref persisted');
 w.Math.random=()=>0;$('#roll').click();ok($('#result').textContent==='Rolling…'&&$('#roll').disabled&&$('#dPass').disabled&&$('#dFail').disabled,'during animation: roll + destinations locked');
 $('#roll').click();key('r');ok($$('.die.rolling').length===2,'repeat roll ignored while rolling');
 ok($('[data-mode=fight]').disabled&&$('#resetDice').disabled,'mode/reset locked while rolling');
 await wait(900);ok(!$('#dPass').disabled&&/pass/.test($('#result').textContent)&&!$('#roll').disabled,'settles after ~750ms to pass');
 // reroll animates one die only
 $$('.die')[1].click();w.Math.random=()=>0.99;$('#reroll').click();ok($$('.die.rolling').length===1&&$('#dPass').disabled&&$('#dFail').disabled,'reroll animates one die, destinations locked');
 await wait(900);ok($('#tf').textContent.startsWith('2'),'reroll committed once (Fortune 2)');
 // manual dice with animation keep entered values
 $('#dsMan').click();$('#m1').value='6';$('#m2').value='6';w.Math.random=()=>0;$('#roll').click();await wait(900);
 ok($$('.die')[0].getAttribute('aria-label')==='Die 1: 6'&&$$('.die')[1].getAttribute('aria-label')==='Die 2: 6'&&!$('#dFail').disabled,'manual entry preserved after animation (6,6 fail)');
 $('#dsApp').click();
 // navigation mid-roll settles instantly
 $('#roll').click();go('sheet');ok(!$('#roll').disabled&&!/Rolling/.test($('#result').textContent),'navigating away mid-roll settles result');
 back();
 // fight completion with animation follows whole encounter
 $('#resetDice').click();$('[data-mode=fight]').click();w.Math.random=()=>0.3;for(let k=0;k<3;k++){$('#roll').click();ok($('#dCont').disabled,'fight dest locked during round '+(k+1)+' animation');await wait(850)}
 ok(!$('#dCont').disabled&&$('#roll').disabled,'animated fight completes after 3 rounds: '+$('#dest').textContent+' | '+$('#rounds').textContent+' | '+$('#roll').disabled);
 // instant really instant
 $('#prefAnim').click();$('#resetDice').click();$('[data-mode=test]').click();$('#roll').click();ok(!/Rolling/.test($('#result').textContent)&&!$('#dPass').disabled,'instant mode settles synchronously');
 // sound on without AudioContext: graceful
 $('#roll').click();ok(/unavailable/.test($('#soundNote').textContent)&&!$('#dPass').disabled,'no Web Audio: graceful note, roll still works');
 // tick sync still ok
 ok(String(logState(214))==='1,1'&&!!$('#sectionView')!==null,'tick sync unaffected');
 await audioTests();
 console.log('fails',fails,'total',passes);
})();
async function audioTests(){const fs=require('fs'),html=fs.readFileSync('/workspace/gamebook-player-prototype/index.html','utf8');const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const b64=html.match(/data:audio\/mpeg;base64,([A-Za-z0-9+\/=]+)/)[1];ok(Buffer.from(b64,'base64').equals(fs.readFileSync('/workspace/gamebook-player-prototype/audio/dice-roll.mp3')),'AUDIO embedded MP3 matches audio/dice-roll.mp3 byte-for-byte');
 ok(!/createBiquadFilter|createBuffer\(/.test(html),'AUDIO synthetic noise generator removed');
 ok(/Wuzzy/.test(html)&&/CC0/.test(html)&&/opengameart\.org\/content\/wooden-dice-on-wodden-table-roll/.test(html),'AUDIO credit in prototype');
 function mk(pref){const log={ctx:0,decode:0,start:0,stop:0};const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/index.html#test',beforeParse(w){w.scrollTo=()=>{};if(pref!==null)w.localStorage.setItem('gbp-prefs',pref);
  w.AudioContext=class{constructor(){log.ctx++;this.state='running';this.destination={}}decodeAudioData(b,res){log.decode++;log.bytes=b.byteLength;const buf={duration:1.04};setTimeout(()=>res(buf),0);return Promise.resolve(buf)}
   createGain(){return{gain:{value:1},connect:x=>x}}createBufferSource(){return{connect:x=>x,start(){log.start++},stop(){log.stop++}}}resume(){}}}});return{dom,log,$:q=>dom.window.document.querySelector(q),st:()=>JSON.parse(dom.window.localStorage.getItem('gbp-prefs')||'{}')}}
 let A=mk(null);ok(A.$('#prefSound').checked&&A.log.ctx===0&&A.log.start===0,'AUDIO fresh: sound on, nothing created or played on load (no autoplay)');
 A.$('#prefAnim').checked&&A.$('#prefAnim').click();A.$('#roll').click();await wait(20);ok(A.log.ctx===1&&A.log.decode===1&&A.log.start===1&&A.log.bytes===Buffer.from(b64,'base64').length,'AUDIO roll gesture decodes embedded clip once and plays it');
 A.$('#roll').click();await wait(20);ok(A.log.decode===1&&A.log.start===2&&A.log.stop>=1,'AUDIO next roll stops previous clip first (no overlap), reuses decoded buffer');
 ok(!A.$('#dPass').disabled||!A.$('#dFail').disabled,'AUDIO instant mode not blocked by sound');
 ok(A.st().anim===false&&!('sound' in A.st()),'AUDIO only changed settings are stored (sound key absent)');
 A.$('#prefSound').click();const s0=A.log.start;A.$('#roll').click();await wait(20);ok(A.log.start===s0&&A.st().sound===false,'AUDIO toggle off: no playback, opt-out stored');
 let B=mk('{"sound":false}');ok(!B.$('#prefSound').checked,'AUDIO explicit stored false respected on load');
 let C=mk('{"anim":true}');C.$('#roll').click();await wait(20);const st=C.log.start;C.$('#resetDice').disabled||C.$('#resetDice').click();
 C.dom.window.eval('reset(true)');ok(C.log.stop>=1,'AUDIO reset mid-roll stops clip');
 let D=mk('{"anim":true}');D.$('#roll').click();await wait(900);ok(D.log.stop===0&&D.log.start===1,'AUDIO normal settle lets clip finish (no stop)');
}

