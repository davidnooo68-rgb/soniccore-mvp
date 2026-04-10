const fs = require('fs');
const path = require('path');

// Vercel serverless API handler
const DATA = path.join('/tmp', 'data');
const REPORTS = path.join('/tmp', 'reports');

if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
if (!fs.existsSync(REPORTS)) fs.mkdirSync(REPORTS, { recursive: true });

function copyRisk(title, artist) {
  const L = (title || '').toLowerCase();
  const A = (artist || '').toLowerCase();
  if (/royalty.free|cc0|public.domain|free.to.use/i.test(L + ' ' + A))
    return { risk: 'LOW', note: 'detected royalty-free marker', source: 'keyword' };
  if (/epidemic.sound|artlist|musicbed|audio.library/i.test(L))
    return { risk: 'LOW', note: 'commercial royalty-free library track', source: 'keyword' };
  if (/top.chart|official.music|vevo|sony.music|universal|warner|billboard/i.test(L + ' ' + A))
    return { risk: 'HIGH', note: 'suspected commercial copyright - replace or get license', source: 'pattern' };
  return { risk: 'MEDIUM', note: 'verify copyright source', source: 'pattern' };
}

function repId() {
  const d = new Date();
  const D = String(d.getFullYear()) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  return 'REP-' + D + '-' + Math.floor(Math.random()*900+100);
}

function genReport(data) {
  const id = data.reportId || repId();
  const now = new Date().toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric'});
  const cp = data.copyright || {};
  const rc = {LOW:'#27ae60',MEDIUM:'#f39c12',HIGH:'#e74c3c'}[cp.risk||'MEDIUM'];
  const rt = {LOW:'LOW RISK',MEDIUM:'MEDIUM RISK',HIGH:'HIGH RISK'}[cp.risk||'MEDIUM'];
  const rb = {LOW:'#eafaf1',MEDIUM:'#fef9e7',HIGH:'#fdecea'}[cp.risk||'MEDIUM'];
  const song = data.song || {};
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>'+id+'</title></head>'+
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

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const u = new URL(req.url, 'http://localhost');
  
  try {
    if (u.pathname === '/api/health') {
      const demo = !process.env.AUDD_API_TOKEN;
      const files = fs.existsSync(REPORTS) ? fs.readdirSync(REPORTS).filter(f => f.endsWith('.html') && f.includes('REP-')) : [];
      res.status(200).json({ status: 'ok', version: '1.0.0', demo, totalReports: files.length });
      return;
    }

    if (u.pathname === '/api/identify' && req.method === 'POST') {
      const d = req.body;
      const demo = !process.env.AUDD_API_TOKEN;
      const result = {
        title: d.title || '',
        artist: d.artist || '',
        source: demo ? 'demo' : 'manual',
      };
      const copyright = copyRisk(result.title, result.artist);
      res.status(200).json({ success: true, demo, result, copyright });
      return;
    }

    if (u.pathname === '/api/report' && req.method === 'POST') {
      const d = req.body;
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
      fs.writeFileSync(path.join(REPORTS, id + '.html'), html, 'utf8');
      res.status(200).json({ success: true, reportId: id, url: '/reports/' + id + '.html' });
      return;
    }

    if (u.pathname === '/api/reports') {
      const files = fs.existsSync(REPORTS) 
        ? fs.readdirSync(REPORTS).filter(f => f.endsWith('.html') && f.startsWith('REP-')).sort((a, b) => b.localeCompare(a))
        : [];
      const reports = files.map(f => ({ id: f.replace('.html', ''), file: f }));
      res.status(200).json({ reports });
      return;
    }

    res.status(404).json({ error: 'not found' });
  } catch (e) {
    console.error('API error:', e.message);
    res.status(500).json({ error: e.message });
  }
};