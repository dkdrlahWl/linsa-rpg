/* Load as a blocking, classic HEAD script before every game script.
 * Core handshake: await RinguSession.ready; then initialize game and timers.
 * Call RinguSession.save(state) after mutations; onEnded(stopGame) must cancel
 * core timers/RAF and input. Legacy KEY writes are also captured as a fallback.
 * All revisions come from the server. A conflict never retries over remote data.
 */
(() => {
  'use strict';
  const KEY = 'swordEnhanceRPG_balance_20260617_v5';
  const PREFIX = 'ringu.session.v1.';
  const OWNER = PREFIX + 'owner';
  const nativeFetch = window.fetch.bind(window);
  const storage = window.localStorage;
  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;
  const nativeClear = Storage.prototype.clear;
  const read = key => nativeGet.call(storage, key);
  const write = (key, value) => nativeSet.call(storage, key, value);
  const remove = key => nativeRemove.call(storage, key);
  const protectedKey = key => /^(swordEnhanceRPG|ringuRPG_|ringu_cloud_client_id|ringu\.session\.)/.test(key);
  let account = null, revision = null, active = false, phase = 'loading';
  let message = '계정의 모험 기록을 확인하는 중입니다.';
  let pending = null, latest = null, inFlight = null, saveTimer = null;
  let mutation = null, mutationPassive = false;
  let events = null, pollTimer = null, pollBusy = false, ended = false;
  let overlay = null, bootComplete = false, sequence = 0, lastAcknowledged = null;
  const listeners = new Set(), endHooks = new Set();
  const scoped = suffix => PREFIX + 'account.' + encodeURIComponent(String(account.id)) + '.' + suffix;
  const snapshot = () => Object.freeze({ phase, message, active, account, revision, pending: !!pending });
  function report(next, text) {
    phase = next; message = text;
    for (const fn of listeners) { try { fn(snapshot()); } catch (error) { console.error(error); } }
    window.dispatchEvent(new CustomEvent('ringu:session-status', { detail: snapshot() }));
  }
  function validState(state) { return state !== null && typeof state === 'object' && !Array.isArray(state); }
  function validateSession(data) {
    if (!data || !data.account || !['string', 'number'].includes(typeof data.account.id) || typeof data.account.username !== 'string' || !Number.isSafeInteger(data.revision) || data.revision < 0 || !(data.state === null || validState(data.state))) {
      throw new Error('서버의 계정 응답을 확인할 수 없습니다.');
    }
    return data;
  }
  // Reject legacy Supabase and every other external fetch before core can run.
  window.fetch = function (input, init) {
    try {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
      if (url.origin !== location.origin) return Promise.reject(new TypeError('외부 클라우드 요청이 차단되었습니다. 이 버전은 로컬 계정 API만 사용합니다.'));
      return nativeFetch(input, { ...init, redirect: 'error' });
    } catch (error) { return Promise.reject(error); }
  };
  async function api(path, options = {}) {
    const { timeoutMs = 12000, ...requestOptions } = options;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await window.fetch(path, { ...requestOptions, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { Accept: 'application/json', ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}), ...requestOptions.headers } });
    } finally { clearTimeout(timer); }
  }
  // Keep old saves intact even if legacy startup attempts removeItem/clear.
  Storage.prototype.removeItem = function (key) {
    if (this === storage && protectedKey(String(key))) return;
    return nativeRemove.call(this, key);
  };
  Storage.prototype.clear = function () {
    if (this !== storage) return nativeClear.call(this);
    for (let i = this.length - 1; i >= 0; i--) { const key = this.key(i); if (!protectedKey(key)) nativeRemove.call(this, key); }
  };
  Storage.prototype.setItem = function (key, value) {
    if (this === storage && String(key) === KEY) {
      if (!active) return;
      let state;
      try { state = JSON.parse(String(value)); } catch (_) { throw new TypeError('게임 저장 데이터가 올바르지 않습니다.'); }
      save(state);
      return;
    }
    // Do not create legacy cloud credentials or a cloud client identity.
    if (this === storage && /^(ringuRPG_cloudSession|ringu_cloud_client_id)/.test(String(key))) return;
    return nativeSet.call(this, key, value);
  };
  Storage.prototype.getItem = function (key) {
    if (this === storage && /^(ringuRPG_cloudSession|ringu_cloud_client_id)/.test(String(key))) return null;
    if (this === storage && String(key) === KEY && bootComplete) return JSON.stringify(latest === null ? {} : latest);
    return nativeGet.call(this, key);
  };
  function domReady() {
    return document.body ? Promise.resolve() : new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }
  async function showOverlay(title, description, actions) {
    await domReady();
    if (!overlay) {
      const style = document.createElement('style');
      style.textContent = '#ringu-session-overlay{position:fixed;inset:0;z-index:2147483647;background:#060911ed;display:grid;place-items:center;padding:24px;color:#ede8df;font:14px/1.8 "Malgun Gothic",system-ui,sans-serif;backdrop-filter:blur(12px)}#ringu-session-overlay section{width:min(100%,480px);padding:32px;border:1px solid #907750;background:linear-gradient(135deg,#20232d,#10141c);box-shadow:0 30px 90px #0009;border-radius:8px}#ringu-session-overlay h2{font-size:24px;margin:0 0 15px;color:#e3c591}#ringu-session-overlay p{white-space:pre-line;overflow-wrap:anywhere;color:#bcc2cc}#ringu-session-overlay button{font:inherit;min-height:44px;padding:9px 16px;margin:8px 8px 0 0;border:1px solid #8d7959;border-radius:4px;background:#d9bd87;color:#17130e;cursor:pointer}#ringu-session-overlay button:focus-visible{outline:3px solid #fff;outline-offset:3px}#ringu-session-overlay button:disabled{opacity:.5;cursor:wait}#ringu-session-overlay .error{color:#ffb9ab}#ringu-session-status{position:fixed;bottom:12px;left:12px;z-index:2147483645;max-width:calc(100vw - 24px);padding:8px 12px;background:#0b101aec;border:1px solid #8d7959;border-radius:5px;color:#e6d1aa;font:12px/1.6 "Malgun Gothic",system-ui,sans-serif}';
      document.head.append(style);
      overlay = document.createElement('div'); overlay.id = 'ringu-session-overlay';
      overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'ringu-session-title');
      overlay.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const buttons = [...overlay.querySelectorAll('button:not(:disabled)')];
        if (!buttons.length) { event.preventDefault(); return; }
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      });
      document.body.append(overlay);
    }
    overlay.replaceChildren();
    const panel = document.createElement('section');
    const heading = document.createElement('h2'); heading.id = 'ringu-session-title'; heading.textContent = title;
    const copy = document.createElement('p'); copy.textContent = description;
    const errorText = document.createElement('p'); errorText.className = 'error'; errorText.setAttribute('role', 'alert');
    panel.append(heading, copy);
    for (const [label, action] of actions) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.addEventListener('click', async () => {
        button.disabled = true;
        try { await action(); } catch (error) { errorText.textContent = error.message || '요청을 완료하지 못했습니다. 다시 시도해 주세요.'; }
        finally { button.disabled = false; }
      });
      panel.append(button);
    }
    panel.append(errorText); overlay.append(panel);
    overlay.querySelector('button')?.focus();
  }
  function hideOverlay() { overlay?.remove(); overlay = null; }
  // Block input outside our dialog as soon as session validity is lost.
  for (const type of ['click', 'pointerdown', 'pointerup', 'keydown', 'keyup', 'touchstart', 'submit']) {
    window.addEventListener(type, event => {
      if (!active && !overlay?.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, { capture: true, passive: false });
  }
  let archiveDatabase;
  function archiveStore() {
    if (!archiveDatabase) archiveDatabase = new Promise((resolve, reject) => {
      const request = indexedDB.open('ringu-recovery-archives-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('archives');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('복구 보관함을 여는 중입니다. 다른 게임 탭을 닫고 다시 시도해 주세요.'));
    });
    return archiveDatabase;
  }
  async function preserveArchives(entries) {
    if (!entries.length) return;
    const db = await archiveStore();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('archives', 'readwrite');
      for (const [key, value] of entries) tx.objectStore('archives').put(value, key);
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error || new Error('복구 기록 보관 실패'));
      tx.onerror = () => reject(tx.error);
    });
  }
  async function migrateArchives() {
    const entries = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (/^ringu\.session\.v1\.(?:account\..+|legacy-unassigned)\.archive\./.test(key)) entries.push([key, read(key)]);
    }
    await preserveArchives(entries);
    // Remove only confirmed archival copies; never pending saves, receipts or login.
    for (const [key, value] of entries) if (read(key) === value) remove(key);
  }
  async function archive(raw, owner, reason) {
    if (raw === null) return;
    const id = owner === null ? 'legacy-unassigned' : 'account.' + encodeURIComponent(owner);
    await preserveArchives([[PREFIX + id + '.archive.' + Date.now() + '.' + (++sequence), JSON.stringify({ reason, savedAt: new Date().toISOString(), raw })]]);
  }
  function writeBackup(item) {
    write(scoped('pending'), JSON.stringify({ accountId: account.id, revision, state: item.state, savedAt: new Date().toISOString() }));
  }
  async function leaveAccount() {
    const response = await api('/api/logout', { method: 'POST' });
    if (!response.ok && response.status !== 401) throw new Error('로그아웃하지 못했습니다. 연결을 확인한 후 다시 시도해 주세요.');
    location.assign('/linsa-rpg/login.html');
  }
  function end(reason, kind = 'ended') {
    if (ended) return;
    ended = true; active = false;
    clearTimeout(saveTimer); clearInterval(pollTimer); events?.close();
    let backupFailed = kind === 'storage-error';
    if (pending && account) { try { writeBackup(pending); } catch (_) { backupFailed = true; } }
    report(kind, reason);
    for (const fn of endHooks) { try { fn(snapshot()); } catch (error) { console.error(error); } }
    window.dispatchEvent(new CustomEvent('ringu:session-ended', { detail: snapshot() }));
    void showOverlay(kind === 'conflict' ? '다른 모험 기록이 감지되었습니다' : '모험이 일시 중단되었습니다', reason + (backupFailed
      ? '\n브라우저 임시 저장을 보장할 수 없습니다. 현재 화면을 유지하고 연결 및 저장 공간을 확인해 주세요.'
      : '\n미전송 기록은 계정별 임시 저장으로 보관됩니다.'), [
      ['서버 기록 다시 확인', () => location.reload()], ['로그아웃', leaveAccount]
    ]);
  }
  function save(state) {
    if (!active) return false;
    if (!validState(state)) throw new TypeError('저장할 게임 상태는 객체여야 합니다.');
    const prefs=Object.fromEntries(['playerName','playerGender','sfxOn','bgmOn','useProtect','sfxVolume','bgmVolume'].filter(k=>state[k]!==undefined).map(k=>[k,state[k]]));
    const raw = JSON.stringify(window.RinguCloud?.economy?{...latest,...prefs}:state);
    if(window.RinguCloud?.economy){
      write(KEY,raw);
      if(window.RinguCore)RinguCore.state=JSON.parse(raw);
      window.dispatchEvent(new CustomEvent('ringu:economy-state',{detail:{events:[]}}));
    }
    if (raw === pending?.raw || (!pending && raw === lastAcknowledged)) return true;
    const item = { state: JSON.parse(raw), raw };
    latest = item.state; pending = item;
    try {
      if (read(OWNER) !== String(account.id)) { end('다른 계정이 이 브라우저에서 열렸습니다. 현재 계정을 다시 확인해 주세요.'); return false; }
      writeBackup(item); write(KEY, raw);
    } catch (_) { end('브라우저에 백업을 보관할 공간이 없습니다. 현재 화면을 유지하고 저장 공간을 확보한 뒤 다시 연결해 주세요.', 'storage-error'); return false; }
    report('pending', '모험 기록을 저장할 준비가 되었습니다.');
    if (saveTimer === null) saveTimer = setTimeout(() => { void flush().catch(() => {}); }, 350);
    return true;
  }
  async function drain() {
    while (pending && active) {
      const item = pending;
      report('saving', '모험 기록을 계정에 저장하는 중입니다.');
      let response;
      try { response = await api('/api/state', { method: 'PUT', body: JSON.stringify({ state: item.state, revision }) }); }
      catch (error) {
        if (!active) throw error;
        try { writeBackup(pending || item); } catch (_) { end('백업 공간이 부족합니다. 현재 화면을 유지하고 저장 공간을 확보해 주세요.', 'storage-error'); throw error; }
        report('offline', '서버 연결 실패 · 기록을 이 계정의 브라우저 백업에 보관했습니다. 연결 복구 시 재시도합니다.');
        throw error;
      }
      if (!active) throw new Error(message);
      if (response.status === 409) { end('서버 기록이 다른 창에서 변경되었습니다. 덮어쓰기를 중단했습니다. 현재 기록을 내보낸 후 서버 기록을 확인해 주세요.', 'conflict'); throw new Error(message); }
      if (response.status === 401 || response.status === 403) { end('로그인이 만료되었거나 다른 곳에서 세션이 종료되었습니다. 다시 로그인해 주세요.'); throw new Error(message); }
      if (!response.ok) {
        report('offline', '서버가 저장을 완료하지 못했습니다. 계정별 로컬 백업을 보관하고 있습니다.');
        throw new Error(message);
      }
      let result;
      try { result = await response.json(); } catch (_) { end('저장 응답을 확인할 수 없습니다. 서버 기록을 다시 확인해 주세요.', 'conflict'); throw new Error(message); }
      if (!Number.isSafeInteger(result.revision) || result.revision <= revision) { end('저장 버전을 확인할 수 없습니다. 서버 기록을 다시 확인해 주세요.', 'conflict'); throw new Error(message); }
      revision = result.revision;
      if(window.RinguCloud?.economy&&validState(result.state)){
        const newer=pending!==item?pending:null;
        const prefs=newer?Object.fromEntries(['playerName','playerGender','sfxOn','bgmOn','useProtect','sfxVolume','bgmVolume'].filter(k=>newer.state[k]!==undefined).map(k=>[k,newer.state[k]])):{};
        item.state=structuredClone(result.state);item.raw=JSON.stringify(item.state);
        latest=newer?{...result.state,...prefs}:item.state;
        if(newer){newer.state=latest;newer.raw=JSON.stringify(latest);}
        write(KEY,JSON.stringify(latest));
        if(window.RinguCore)RinguCore.state=structuredClone(latest);
        window.dispatchEvent(new CustomEvent('ringu:economy-state',{detail:{events:[]}}));
      }
      // Server co-op receipts are atomically credited with this save. Apply their
      // delta to both the submitted snapshot and any newer in-flight local snapshot.
      if (Number.isSafeInteger(result.stoneAward) && result.stoneAward > 0) {
        const award = result.stoneAward;
        const affected = new Set([item.state, latest, pending?.state]);
        for (const s of affected) if (s) s.transcendStone = (Number(s.transcendStone) || 0) + award;
        item.raw = JSON.stringify(item.state);
        if (pending) pending.raw = JSON.stringify(pending.state);
        write(KEY, JSON.stringify(latest));
        window.dispatchEvent(new CustomEvent('ringu:stone-award', {detail: {amount: award}}));
      }
      lastAcknowledged = item.raw;
      try {
        if (pending === item) { remove(scoped('pending')); pending = null; }
        else writeBackup(pending);
      } catch (_) { end('저장 후 로컬 백업을 갱신하지 못했습니다. 현재 화면을 유지하고 저장 상태를 다시 확인해 주세요.', 'storage-error'); throw new Error(message); }
    }
    if (active) report('saved', '계정에 저장되었습니다.');
    return snapshot();
  }
  function flush() {
    if (mutation) return mutation.then(() => flush());
    clearTimeout(saveTimer); saveTimer = null;
    if (!active) return Promise.reject(new Error(message));
    if (inFlight) return inFlight;
    inFlight = drain().finally(() => { inFlight = null; });
    return inFlight;
  }
  function costumeTransaction(action,id,requestId=crypto.randomUUID()) {
    if(window.RinguCloud?.economy)return serverTransaction('costume',{action,id,requestId});
    if(mutation)return Promise.reject(new Error('이미 처리 중입니다.'));
    const before=flush();
    mutation=(async()=>{
      await before;if(!active)throw new Error(message);
      const previousEssence=Number(latest?.essence)||0;
      const body=JSON.stringify({action,id,requestId,revision});
      let response,result;
      try{
        // Retrying the exact receipt ID cannot buy twice after a lost response.
        for(let attempt=0;attempt<2;attempt++){
          try{response=await api('/api/costume',{method:'POST',body});result=await response.json();break;}
          catch(e){if(attempt===1)throw e;}
        }
      }catch(e){end('구매 처리 결과를 확인하지 못했습니다. 새로고침하여 서버 기록을 확인해 주세요.','conflict');throw e;}
      if(!response.ok){if([401,403,409].includes(response.status))end('서버 기록 또는 로그인 상태가 변경되었습니다. 새로고침해 주세요.','conflict');throw new Error(result.error||'처리하지 못했습니다.');}
      if(!active||!Number.isSafeInteger(result.revision)||result.revision<revision||!Number.isSafeInteger(result.essence)){
        end('구매 응답을 확인하지 못했습니다. 새로고침해 주세요.','conflict');throw new Error('INVALID_COSTUME_RESPONSE');
      }
      revision=result.revision;const delta=result.essence-previousEssence;
      for(const s of new Set([latest,pending?.state]))if(s)s.essence=(Number(s.essence)||0)+delta;
      if(pending)pending.raw=JSON.stringify(pending.state);
      try{
        write(KEY,JSON.stringify(latest));
        if(pending)writeBackup(pending);else{lastAcknowledged=JSON.stringify(latest);remove(scoped('pending'));}
      }catch(e){end('서버 처리는 완료됐지만 브라우저 저장 공간이 부족합니다. 다시 접속하여 서버 기록을 불러와 주세요.','storage-error');throw e;}
      window.dispatchEvent(new CustomEvent('ringu:costume-transaction',{detail:{delta,result}}));
      return result;
    })().finally(()=>{mutation=null;if(active&&pending)void flush().catch(()=>{});});
    return mutation;
  }
  // Auction mutations are receipt-backed and use a server snapshot. Keep the
  // legacy simulation paused while ownership is changing; never patch money or
  // grant the purchased item locally. The release gate remains server-side.
  function auctionTransaction(action,args) {
    if(window.RinguCloud?.economy)return serverTransaction('auction',{action,args,requestId:crypto.randomUUID()});
    if(mutation)return Promise.reject(new Error('이미 처리 중입니다.'));
    if(window.RinguCore?.enhanceBusy||window.RinguCore?.activeDungeon||window.RinguCore?.activeTower)return Promise.reject(new Error('진행 중인 강화 또는 특수 전투를 먼저 완료해 주세요.'));
    const before=flush();
    mutation=(async()=>{
      await before;if(!active)throw new Error(message);
      // Flush any last snapshot scheduled while awaiting the preceding save.
      active=false;
      const journalKey=scoped('auction-request');let journal;
      try{journal=JSON.parse(read(journalKey)||'null');}catch{throw new Error('이전 거래 기록을 확인하지 못했습니다.');}
      if(journal)throw new Error('이전 거래 결과를 서버에서 확인해야 합니다. 새 요청을 보내지 않습니다.');
      journal={action,args,requestId:crypto.randomUUID()};write(journalKey,JSON.stringify(journal));
      let result;
      for(let attempt=0;attempt<3;attempt++){
        try{
          if(attempt){
            const receipt=await api('/api/auction',{method:'POST',body:JSON.stringify({action:'receipt',requestId:journal.requestId})});
            if(!receipt.ok)throw new Error('거래 결과 조회 실패');
            const found=await receipt.json();if(found.found){result=found.result;break;}
          }
          const response=await api('/api/auction',{method:'POST',body:JSON.stringify(journal)});
          const data=await response.json();
          if(!response.ok){if(response.status>=500)throw new Error('거래 응답 지연');remove(journalKey);throw Object.assign(new Error(data.error||'처리 실패'),{definitive:true});}
          result=data;break;
        }catch(error){if(error.definitive)throw error;if(attempt===2){end('경매장 처리 결과를 확인할 수 없습니다. 새 거래를 보내지 않고 서버 기록을 다시 확인해 주세요.','conflict');throw error;}}
      }
      if(!result?.ok||result.requestId!==journal.requestId)throw new Error('거래 응답 검증 실패');
      const response=await api('/api/session');if(!response.ok)throw new Error('거래 후 계정 조회 실패');
      const data=validateSession(await response.json());if(data.account.id!==account.id||data.revision<revision)throw new Error('계정 기록 검증 실패');
      revision=data.revision;latest=structuredClone(data.state);pending=null;lastAcknowledged=JSON.stringify(latest);
      write(KEY,lastAcknowledged);remove(scoped('pending'));remove(journalKey);
      if(window.RinguCore){RinguCore.state=structuredClone(latest);RinguCore.fn.normalizeCharacter();RinguCore.fn.renderAll();}
      return result;
    })().catch(error=>{
      if(read(scoped('auction-request')))end('미확정 경매장 거래가 있습니다. 새로고침하여 서버 기록을 확인해 주세요.','conflict');
      throw error;
    }).finally(()=>{mutation=null;if(!ended){active=true;report('saved','경매장 처리가 완료되었습니다.');if(pending)void flush().catch(()=>{});}});
    return mutation;
  }
  function serverTransaction(kind,payload){
    if(mutation&&mutationPassive&&!(kind==='economy'&&payload.command==='sync'))return mutation.catch(()=>{}).then(()=>serverTransaction(kind,payload));
    if(mutation)return Promise.reject(new Error('이미 처리 중입니다.'));
    const passive=kind==='economy'&&payload.command==='sync';
    mutationPassive=passive;
    const before=flush();
    mutation=(async()=>{
      await before;if(!active)throw new Error(message);if(!passive)active=false;
      const key=scoped('server-request'),durable=kind!=='economy'||payload.command!=='sync';
      if(read(key))throw new Error('이전 요청 결과를 먼저 확인해 주세요.');
      if(durable)write(key,JSON.stringify({kind,payload}));
      let result;
      for(let attempt=0;attempt<3;attempt++){
        try{
          if(kind==='costume'){const fresh=await api('/api/session');if(!fresh.ok)throw Error('계정 조회 실패');const s=await fresh.json();payload.revision=s.revision;}
          const r=await api('/api/'+kind,{method:'POST',body:JSON.stringify(payload)});const value=await r.json();
          if(!r.ok){if(r.status===409&&attempt<2)continue;if(r.status>=500)throw Error('서버 응답 지연');throw Object.assign(Error(value.error||'처리 실패'),{definitive:true,status:r.status});}
          result=value;break;
        }catch(e){if(e.definitive||attempt===2)throw e;}
      }
      let current=result;
      if(kind!=='economy'){const fresh=await api('/api/session');if(!fresh.ok)throw Error('처리 후 서버 기록 조회 실패');current=validateSession(await fresh.json());}
      if(!validState(current?.state)||!Number.isSafeInteger(current.revision)||current.revision<revision)throw Error('서버 응답 검증 실패');
      // PT1: passive sync may finish after a local preference toggle. Keep that
      // newer preference pending; economic values always come from the server.
      const newer=pending;
      const prefs=newer?Object.fromEntries(['playerName','playerGender','sfxOn','bgmOn','useProtect','sfxVolume','bgmVolume'].filter(k=>newer.state[k]!==undefined).map(k=>[k,newer.state[k]])):{};
      revision=current.revision;lastAcknowledged=JSON.stringify(current.state);latest={...structuredClone(current.state),...prefs};
      if(newer){newer.state=structuredClone(latest);newer.raw=JSON.stringify(latest);writeBackup(newer);}else remove(scoped('pending'));
      write(KEY,JSON.stringify(latest));if(durable)remove(key);
      if(window.RinguCore)RinguCore.state=structuredClone(latest);
      if(kind==='costume')window.dispatchEvent(new CustomEvent('ringu:costume-transaction',{detail:{delta:0,result}}));
      window.dispatchEvent(new CustomEvent('ringu:economy-state',{detail:{events:result.result?.events||[],dailyBoss:result.result?.dailyBoss}}));
      return result;
    })().catch(e=>{
      if(e.definitive){remove(scoped('server-request'));if(e.status===401||e.status===403)end('로그인이 종료되었습니다. 다시 로그인해 주세요.');}
      else if(kind!=='economy'||payload.command!=='sync')end('처리 결과가 미확정입니다. 새 요청을 보내지 않고 재접속 시 같은 요청을 확인합니다.','conflict');
      throw e;
    }).finally(()=>{mutation=null;mutationPassive=false;if(!ended){active=true;report('saved','서버 기록을 반영했습니다.');}});
    return mutation;
  }
  async function logout() {
    await flush();
    // Stop core first so it cannot create a new save while logout is pending.
    end('로그아웃 중입니다. 저장된 모험은 다음 로그인에서 이어집니다.');
    await leaveAccount();
  }
  async function checkSession() {
    if (!active || pollBusy) return;
    pollBusy = true;
    try {
      const response = await api('/api/session');
      if (response.status === 401 || response.status === 403) { end('세션이 종료되었습니다. 다시 로그인해 주세요.'); return; }
      if (!response.ok) return;
      const data = await response.json();
      if (!data.account || String(data.account.id) !== String(account.id)) { end('로그인 계정이 변경되었습니다. 다시 로그인해 주세요.'); return; }
      if(window.RinguCloud?.economy&&!mutation&&!inFlight&&data.revision>=revision&&validState(data.state)){
        const prefs=pending?Object.fromEntries(['playerName','playerGender','sfxOn','bgmOn','useProtect','sfxVolume','bgmVolume'].filter(k=>pending.state[k]!==undefined).map(k=>[k,pending.state[k]])):{};
        revision=data.revision;latest={...data.state,...prefs};lastAcknowledged=JSON.stringify(data.state);
        if(pending){pending.state=latest;pending.raw=JSON.stringify(latest);writeBackup(pending);}
        write(KEY,JSON.stringify(latest));if(window.RinguCore)RinguCore.state=structuredClone(latest);window.dispatchEvent(new CustomEvent('ringu:economy-state',{detail:{events:[]}}));
      }
      if (pending) void flush().catch(() => {});
      else if (phase === 'offline') report('saved', '연결이 복구되었습니다.');
    } catch (_) { /* Offline progress stays in the account backup. */ }
    finally { pollBusy = false; }
  }
  function watchSession() {
    // Poll continues even with a healthy SSE connection, including proxy failures.
    pollTimer = setInterval(checkSession, 15000);
    if (window.RinguCloud?.enabled || location.hostname.endsWith('.trycloudflare.com')) {
      void (async () => {
        while (active) {
          try {const response=await api('/api/watch');if(response.status===401||response.status===403){end('다른 곳에서 로그인되어 현재 세션이 종료되었습니다.');break;}if(!response.ok)await new Promise(r=>setTimeout(r,3000));}
          catch (_) {if(active)await new Promise(r=>setTimeout(r,3000));}
        }
      })();
      return;
    }
    if (typeof EventSource !== 'undefined') {
      try {
        events = new EventSource('/api/events', { withCredentials: true });
        events.addEventListener('session-ended', () => end('다른 곳에서 로그인했거나 세션이 종료되었습니다. 현재 모험을 중단했습니다.'));
        events.onerror = () => { void checkSession(); };
      } catch (_) { void checkSession(); }
    }
  }
  function chooseRecovery(backup, server) {
    const sameRevision = backup.revision === server.revision;
    return new Promise(resolve => {
      const actions = [];
      if (sameRevision) actions.push(['백업 복구 후 시작', () => resolve(backup.state)]);
      actions.push(['서버 기록으로 시작', () => resolve(server.state)]);
      void showOverlay('아직 전송하지 못한 모험이 있습니다', sameRevision
        ? '이 계정의 로컬 백업이 남아 있습니다. 백업을 복구하거나 서버 기록으로 시작할 수 있습니다. 선택하지 않은 백업도 별도 보관합니다.'
        : '임시 저장 이후 서버 기록이 변경되었습니다. 충돌을 막기 위해 자동 복구를 중단했습니다. 임시 기록은 보존되며 서버 기록으로 시작할 수 있습니다.', actions);
    });
  }
  async function boot() {
    try {
      await migrateArchives();
      report('loading', '장비와 계정 기록을 불러오는 중입니다. 창을 닫지 말고 잠시 기다려 주세요.');
      // Initial authenticated load also settles offline progress. Normal action
      // timeouts remain unchanged; the boot request is bounded and cancellable.
      const response = await api('/api/session', { timeoutMs: 45000 });
      if (response.status === 401 || response.status === 403) { location.replace('/linsa-rpg/login.html'); throw new Error('로그인이 필요합니다.'); }
      if (!response.ok) throw new Error('계정 서버에 연결할 수 없습니다. 연결을 확인한 후 다시 시도해 주세요.');
      const data = await response.json();
      if (!data.account) { location.replace('/linsa-rpg/login.html'); throw new Error('로그인이 필요합니다.'); }
      validateSession(data);
      account = Object.freeze({ id: data.account.id, username: data.account.username }); revision = data.revision;
      const serverJournal=read(scoped('server-request'));
      if(serverJournal){
        const record=JSON.parse(serverJournal);if(!['auction','costume','economy','black-market'].includes(record.kind))throw Error('이전 요청 기록을 확인해 주세요.');
        if(record.kind==='costume')record.payload.revision=data.revision;
        const replay=await api('/api/'+record.kind,{method:'POST',body:JSON.stringify(record.payload)});
        if(!replay.ok&&replay.status>=500)throw Error('이전 요청 결과를 확인하지 못했습니다. 잠시 후 다시 접속해 주세요.');
        if(!replay.ok&&[401,403].includes(replay.status))throw Error('다시 로그인해 주세요.');
        const freshResponse=await api('/api/session');if(!freshResponse.ok)throw Error('서버 기록 조회 실패');const fresh=validateSession(await freshResponse.json());if(fresh.account.id!==account.id)throw Error('계정이 변경되었습니다.');Object.assign(data,fresh);revision=fresh.revision;remove(scoped('server-request'));
      }
      const unfinished=read(scoped('auction-request'));
      if(unfinished){
        const journal=JSON.parse(unfinished);
        const receiptResponse=await api('/api/auction',{method:'POST',body:JSON.stringify({action:'receipt',requestId:journal.requestId})});
        if(!receiptResponse.ok)throw new Error('이전 경매장 거래 결과를 조회하지 못했습니다. 잠시 후 다시 접속해 주세요.');
        const receipt=await receiptResponse.json();
        if(!receipt.found){
          // Same stored ID only: a delayed original and this retry cannot both settle.
          const retry=await api('/api/auction',{method:'POST',body:JSON.stringify(journal)});
          if(!retry.ok)throw new Error('이전 경매장 거래가 미확정 상태입니다. 요청 기록을 보존했습니다. 관리자에게 확인해 주세요.');
        }
        const freshResponse=await api('/api/session');if(!freshResponse.ok)throw new Error('거래 후 계정 기록을 다시 확인해 주세요.');
        const fresh=validateSession(await freshResponse.json());if(fresh.account.id!==account.id)throw new Error('계정이 변경되었습니다.');
        Object.assign(data,fresh);revision=fresh.revision;remove(scoped('auction-request'));
      }
      const existing = read(KEY), previousOwner = read(OWNER);
      await archive(existing, previousOwner, 'before-account-session-load');
      let chosen = data.state, backup = null;
      const backupRaw = read(scoped('pending'));
      if (backupRaw !== null) {
        try {
          backup = JSON.parse(backupRaw);
          if (String(backup.accountId) !== String(account.id) || !validState(backup.state) || !Number.isSafeInteger(backup.revision)) throw new Error('invalid backup');
        } catch (_) {
          await archive(backupRaw, String(account.id), 'unreadable-pending-backup');
          throw new Error('이 계정의 로컬 백업을 읽을 수 없습니다. 백업 원본은 보존했습니다. 복구 점검 후 다시 시도해 주세요.');
        }
        if (JSON.stringify(backup.state) !== JSON.stringify(data.state)) {
          if(window.RinguCloud?.economy)chosen={...data.state,...Object.fromEntries(['playerName','playerGender','sfxOn','bgmOn','useProtect','sfxVolume','bgmVolume'].filter(k=>backup.state[k]!==undefined).map(k=>[k,backup.state[k]]))};
          else chosen = await chooseRecovery(backup, data);
        }
        await archive(backupRaw, String(account.id), 'preserved-recovery-backup');
      }
      // Recheck after a recovery dialog (another login may have occurred).
      if (backup) {
        const fresh = await api('/api/session');
        if (!fresh.ok) throw new Error('계정이 변경되었을 수 있습니다. 새로고침해 주세요.');
        const current = validateSession(await fresh.json());
        if (String(current.account.id) !== String(account.id) || current.revision !== revision) throw new Error('선택 중 계정 또는 서버 기록이 변경되었습니다. 새로고침해 주세요.');
      }
      write(OWNER, String(account.id));
      write(KEY, JSON.stringify(chosen === null ? {} : chosen));
      // Neutralize the old hard-reset path without deleting a single legacy save.
      write('ringuRPG_hardReset_20260617_v5', 'done');
      if (backupRaw !== null) remove(scoped('pending'));
      latest = chosen; lastAcknowledged = JSON.stringify(data.state === null ? {} : data.state);
      active = true; bootComplete = true; hideOverlay();
      report('ready', '계정의 모험 기록을 불러왔습니다.');
      watchSession();
      if (chosen !== data.state && chosen !== null) { save(chosen); await flush(); }
      return { account, state: chosen, revision };
    } catch (error) {
      if (!ended) end(error.name === 'AbortError' ? '계정 서버의 응답이 늦어지고 있습니다. 새로고침 후 다시 시도해 주세요.' : error.message, 'error');
      throw error;
    }
  }
  const bridge = {
    ready: null, save, flush, logout, costumeTransaction, auctionTransaction,
    startupFailed: () => end('게임 화면을 준비하지 못했습니다. 장비와 서버 기록은 지우지 않았습니다. 서버 기록 다시 확인을 눌러 재시도해 주세요.', 'error'),
    economyTransaction:(command,args={})=>serverTransaction('economy',{command,args,requestId:crypto.randomUUID()}),
    blackMarketTransaction:(rotation,slot)=>serverTransaction('black-market',{action:'buy',rotation,slot,requestId:crypto.randomUUID()}),
    get active() { return active; }, get account() { return account; }, get status() { return snapshot(); },
    subscribe(fn) { listeners.add(fn); try { fn(snapshot()); } catch (error) { console.error(error); } return () => listeners.delete(fn); },
    onEnded(fn) { endHooks.add(fn); if (ended) fn(snapshot()); return () => endHooks.delete(fn); }
  };
  window.RinguSession = bridge;
  window.addEventListener('online', () => { void checkSession(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkSession();
    else if (active && pending) void flush().catch(() => {});
  });
  window.addEventListener('beforeunload', event => {
    if (pending) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('storage', event => {
    if (!bootComplete || !active) return;
    if (event.key === OWNER && event.newValue !== String(account.id)) end('다른 계정이 이 브라우저에서 열렸습니다. 현재 모험을 중단했습니다.');
    else if (event.key === KEY && event.newValue !== JSON.stringify(latest === null ? {} : latest)) {
      // Preserve this tab's pending progress before another tab replaces it.
      if (pending) { void archive(pending.raw, String(account.id), 'other-tab-save').catch(console.error); }
      end('다른 창에서 모험 기록이 변경되었습니다. 기록 충돌을 막기 위해 현재 모험을 중단했습니다.', 'conflict');
    }
  });
  bridge.ready = boot();
  bridge.ready.catch(() => {}); // Core must still await and handle rejection.
  void domReady().then(() => {
    const badge = document.createElement('div'); badge.id = 'ringu-session-status'; badge.setAttribute('role', 'status'); badge.setAttribute('aria-live', 'polite');
    Object.assign(badge.style, { position: 'fixed', bottom: '12px', left: '12px', zIndex: '2147483645', maxWidth: 'calc(100vw - 24px)', padding: '8px 12px', background: '#0b101aec', border: '1px solid #8d7959', borderRadius: '5px', color: '#e6d1aa', font: '12px/1.6 "Malgun Gothic", system-ui, sans-serif' });
    document.body.append(badge);
    bridge.subscribe(status => { badge.hidden = !['loading', 'offline', 'saving', 'pending'].includes(status.phase); badge.textContent = status.message; });
  });
})();
