/* ===================================================================
   さんすうチャレンジ 同期用 Worker
   複数端末の記録を「同期コード（PIN）」単位でKVに集計して保存する。
   エンドポイント：
     POST /sync  { pin, type:'answer', key, outcome }
                 { pin, type:'session', date, score, total }
     GET  /data?pin=XXXX
   =================================================================== */

var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(data, status){
  var headers = { 'Content-Type': 'application/json' };
  for(var k in CORS_HEADERS){ headers[k] = CORS_HEADERS[k]; }
  return new Response(JSON.stringify(data), { status: status || 200, headers: headers });
}

function isValidPin(pin){
  return typeof pin === 'string' && /^[A-Z0-9]{4,10}$/.test(pin);
}

async function loadRecord(env, pin){
  var raw = await env.SANSUU_KV.get('stats:' + pin);
  if(!raw){
    return { patternStats: {}, sessions: [] };
  }
  try{
    var parsed = JSON.parse(raw);
    return {
      patternStats: parsed.patternStats || {},
      sessions: parsed.sessions || []
    };
  }catch(e){
    return { patternStats: {}, sessions: [] };
  }
}

async function saveRecord(env, pin, record){
  await env.SANSUU_KV.put('stats:' + pin, JSON.stringify(record));
}

async function handleSync(request, env){
  var body;
  try{
    body = await request.json();
  }catch(e){
    return json({ error: 'invalid json' }, 400);
  }

  var pin = String(body.pin || '').toUpperCase();
  if(!isValidPin(pin)) return json({ error: 'invalid pin' }, 400);

  var record = await loadRecord(env, pin);

  if(body.type === 'answer'){
    var key = String(body.key || '');
    var outcome = String(body.outcome || '');
    var allowed = ['correctFirst', 'correctSecond', 'wrong', 'passed'];
    if(!key || allowed.indexOf(outcome) === -1){
      return json({ error: 'invalid answer event' }, 400);
    }
    if(!record.patternStats[key]){
      record.patternStats[key] = { attempts: 0, correctFirst: 0, correctSecond: 0, wrong: 0, passed: 0 };
    }
    record.patternStats[key].attempts++;
    record.patternStats[key][outcome]++;

  }else if(body.type === 'session'){
    var score = Number(body.score);
    var total = Number(body.total);
    var date = typeof body.date === 'string' ? body.date : new Date().toISOString();
    if(isNaN(score) || isNaN(total)){
      return json({ error: 'invalid session event' }, 400);
    }
    record.sessions.push({ date: date, score: score, total: total });
    if(record.sessions.length > 2000){
      record.sessions = record.sessions.slice(record.sessions.length - 2000);
    }

  }else{
    return json({ error: 'unknown event type' }, 400);
  }

  await saveRecord(env, pin, record);
  return json({ ok: true });
}

async function handleData(request, env){
  var url = new URL(request.url);
  var pin = (url.searchParams.get('pin') || '').toUpperCase();
  if(!isValidPin(pin)) return json({ error: 'invalid pin' }, 400);
  var record = await loadRecord(env, pin);
  return json(record);
}

export default {
  async fetch(request, env){
    if(request.method === 'OPTIONS'){
      return new Response(null, { headers: CORS_HEADERS });
    }

    var url = new URL(request.url);

    if(request.method === 'POST' && url.pathname === '/sync'){
      return handleSync(request, env);
    }
    if(request.method === 'GET' && url.pathname === '/data'){
      return handleData(request, env);
    }
    return json({ error: 'not found' }, 404);
  }
};
