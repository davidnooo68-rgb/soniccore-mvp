const fs = require('fs');

function copyRisk(t, a) {
  const L = (t || '').toLowerCase();
  const A = (a || '').toLowerCase();
  if (/royalty.free|cc0|public.domain|free.to.use/i.test(L + ' ' + A))
    return { risk: 'LOW', note: 'detected royalty-free', source: 'keyword' };
  if (/epidemic.sound|artlist|musicbed|audio.library/i.test(L))
    return { risk: 'LOW', note: 'royalty-free library', source: 'keyword' };
  if (/top.chart|official.music|vevo|sony.music|universal|warner|billboard/i.test(L + ' ' + A))
    return { risk: 'HIGH', note: 'suspected commercial copyright', source: 'pattern' };
  return { risk: 'MEDIUM', note: 'verify copyright source', source: 'pattern' };
}

function repId() {
  const d = new Date();
  return 'REP-' + String(d.getFullYear()) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + Math.floor(Math.random() * 900 + 100);
}

module.exports = async (req, res) => {
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
      res.status(200).json({ status: 'ok', version: '1.0.0' });
      return;
    }

    if (u.pathname === '/api/identify' && req.method === 'POST') {
      const d = req.body;
      const r = copyRisk(d.title, d.artist);
      res.status(200).json({ success: true, result: { title: d.title, artist: d.artist, copyright: r } });
      return;
    }

    res.status(404).json({ error: 'not found' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
