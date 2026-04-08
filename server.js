const http = require('http');
const fs2 = require('fs');
const path2 = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const DATA = path2.join(__dirname, 'data');
const REPORTS = path2.join(__dirname, 'reports');
const PUBLIC = path2.join(__dirname, 'public');

if (!fs2.existsSync(DATA)) fs2.mkdirSync(DATA, { recursive: true });
if (!fs2.existsSync(REPORTS)) fs2.mkdirSync(REPORTS, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

function copyRisk(title, artist) {
  const L = title.toLowerCase();
  const A = (artist || '').toLowerCase();
  if (/royalty.free|cc0|public.domain|free.to.use/i.test(title + ' ' + artist))
    return { risk: 'LOW', note: 'detected royalty-free marker', source: 'keyword' };
  if (/epidemic.sound|artlist|musicbed|audio.library/i.test(title))
    return { risk: 'LOW', note: 'commercial royalty-free library track', source: 'keyword' };
  if (/top.chart|official.music|vevo|sony.music|universal|warner|billboard/i.test(title + ' ' + artist))
    return { risk: 'HIGH', note: 'suspected commercial copyright - replace or get license', source: 'pattern' };
  return { risk: 'MEDIUM', note: 'verify copyright source', source: 'pattern' };
}

function repId() {
  const d = new Date();
  const D = String(d.getFullYear()) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  return 'REP-' + D + '-' + Math.floor(Math.random()*900+100);
}

function loadTemplate(name) {
  const fp = path2.join(__dirname, 'templates', name + '.html');
  if (fs2.existsSync(fp)) return fs2.readFileSync(fp, 'utf8');
  return null;
}

function genReport(data) {
  // Load HTML template or generate inline
  let tpl = loadTemplate('report');
  if (!tpl) {
    const id = data.reportId || repId();
    const now = new Date().toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric'});
    const cp = data.copyright || {};
    const rc = {LOW:'#27ae60',MEDIUM:'#f39c12',HIGH:'#e74c3c'}[cp.risk||'MEDIUM'];
    const rt = {LOW:'LOW RISK',MEDIUM:'MEDIUM RISK',HIGH:'HIGH RISK'}[cp.risk||'MEDIUM'];
    const rb = {LOW:'#eafaf1',MEDIUM:'#fef9e7',HIGH:'#fdecea'}[cp.risk||'MEDIUM'];
    const song = data.song || {};
    tpl = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>'+id+'</title></head>'+
      '<body style="font-family:Microsoft YaHei,sans-serif;background:#f8f9fa;padding:40px 20px">'+
      '<div style="max-width:800px;margin:0 auto;background:#fff;border-radius:12px;padding:48px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">'+
      '<h1 style="font-size:24px;font-weight:900;border-bottom:3px solid #1a1a2e;padding-bottom:24px">SonicCore BGM Copyright Report</h1>'+
      '<p style="color:#666;margin-top:8px">ID: '+id+' | Date: '+now+' | SonicCore</p>'+
      '<div style="padding:20px;border-radius:10px;background:'+rb+';border:1px solid '+rc+';margin:24px 0">'+
      '<h2 style="color:'+rc+'">Risk Level: '+rt+'</h2>'+
      '<p style="color:#555;margin-top:8px">'+(cp.note||'')+'</p></div>'+
      '<div style="margin:24px 0"><h3 style="font-size:16px;margin-bottom:12px">Song Info</h3>'+
      '<table style="width:100%;border-collapse:collapse;font-size:14px">'+
      '<tr><td style="font-weight:600;padding:10px;border-bottom:1px solid #eee;width:120px">Title</td><td style="padding:10px;border-bottom:1px solid #eee">'+(song.title||'')+'</td></tr>'+
      '<tr><td style="font-weight:600;padding:10px;border-bottom:1px solid #eee">Artist</td><td style="padding:10px;border-bottom:1px solid #eee">'+(song.artist||'')+'</td></tr>'+
      '<tr><td style="font-weight:600;padding:10px;border-bottom:1px solid #eee">Source</td><td style="padding:10px;border-bottom:1px solid #eee">'+(data.identifySource||'manual')+'</td></tr>'+
      '</table></div>'+
      '<p style="font-size:12px;color:#999;margin-top:40px;text-align:center">For reference only - not legal advice. SonicCore</p>'+
      '</div></body></html>';
  }
  // Replace placeholders
  let html = tpl;
  html = html.replace('{{id}}', data.reportId || repId());
  html = html.replace('{{risk}}', (data.copyright||{}).risk || 'MEDIUM');
  html = html.replace('{{note}}', (data.copyright||{}).note || '');
  html = html.replace('{{title}}', (data.song||{}).title || '');
  html = html.replace('{{artist}}', (data.song||{}).artist || '');
  html = html.replace('{{date}}', new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'}));
  return html;
}

async function handleAPI(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') return res.end(JSON.stringify({ok:true}));

  const u = new URL(req.url, 'http://localhost:' + PORT);
  const body = await new Promise((rs, rj) => {
    const cs = [];
    req.on('data', c => cs.push(c));
    req.on('end', () => rs(Buffer.concat(cs).toString()));
    req.on('error', rj);
  });

  try {
    if (u.pathname === '/api/health') {
      const demo = !process.env.AUDD_API_TOKEN;
      const count = fs2.readdirSync(REPORTS).filter(f => f.endsWith('.html') && f.includes('REP-')).length;
      return res.end(JSON.stringify({ status: 'ok', version: '1.0.0', demo, totalReports: count }));
    }

    if (u.pathname === '/api/identify' && req.method === 'POST') {
      const d = JSON.parse(body);
      const demo = !process.env.AUDD_API_TOKEN;
      const result = {
        title: d.title || '',
        artist: d.artist || '',
        source: demo ? 'demo' : 'manual',
      };
      const copyright = copyRisk(result.title, result.artist);
      return res.end(JSON.stringify({ success: true, demo, result, copyright }));
    }

    if (u.pathname === '/api/report' && req.method === 'POST') {
      const d = JSON.parse(body);
      const id = repId();
      const copyright = copyRisk(d.song?.title || '', d.song?.artist || '');
      const html = genReport({
        reportId: id,
        song: d.song || {},
        copyright,
        identifySource: d.identifySource || 'manual',
        usageType: d.usageType,
        targetMarket: d.targetMarket,
        notes: d.notes,
      });
      fs2.writeFileSync(path2.join(REPORTS, id + '.html'), html, 'utf8');
      return res.end(JSON.stringify({ success: true, reportId: id, url: '/reports/' + id + '.html' }));
    }

    if (u.pathname === '/api/reports') {
      const files = fs2.readdirSync(REPORTS)
        .filter(f => f.endsWith('.html') && f.startsWith('REP-'))
        .sort((a, b) => b.localeCompare(a))
        .map(f => ({ id: f.replace('.html', ''), file: f }));
      return res.end(JSON.stringify({ reports: files }));
    }

    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'not found' }));
  } catch (e) {
    console.error('API error:', e.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
}

function serveStatic(req, res) {
  const u = new URL(req.url, 'http://localhost:' + PORT);
  let fp;
  if (u.pathname === '/' || !path2.extname(u.pathname)) {
    fp = path2.join(PUBLIC, 'index.html');
  } else if (u.pathname.startsWith('/reports/')) {
    fp = path2.join(__dirname, u.pathname);
  } else {
    fp = path2.join(PUBLIC, u.pathname);
  }
  if (!fs2.existsSync(fp)) { res.writeHead(404); return res.end('not found'); }
  const ext = path2.extname(fp);
  res.setHeader('Content-Type', MIME[ext] || 'text/plain; charset=utf-8');
  // 禁用缓存，确保总是获取最新版本
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(fs2.readFileSync(fp));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) return handleAPI(req, res);
    return serveStatic(req, res);
  } catch(e) {
    console.error('Request error:', e);
    res.writeHead(500);
    res.end('server error');
  }
});

server.listen(PORT, () => {
  console.log('SonicCore MVP running at http://localhost:' + PORT);
  // Auto-open browser
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (fs2.existsSync(edge)) {
    exec('start "" "' + edge + '" http://localhost:' + PORT, { shell: true });
  }
});