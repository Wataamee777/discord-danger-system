import express from 'express';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 10000;
const USER_FILE = path.join(__dirname, 'user.txt');

// Web画面
app.get('/', (req, res) => {
  res.send(`
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>完全一致 数字検索</title>
<style>
  body{font-family:system-ui;max-width:900px;margin:auto;padding:20px;}
  input{padding:8px;}
  button{padding:8px 12px;margin-left:6px;}
  .result{margin-top:10px;white-space:pre-wrap;background:#fafafa;border:1px solid #ddd;padding:10px;}
  .match{background:yellow;}
</style>
</head>
<body>
<h1>危険ユーザー検索</h1>
<input id="q" type="number" placeholder="数字を入力" />
<button onclick="search()">検索</button>
<div id="meta"></div>
<div id="results" class="result"></div>
<script>
async function search(){
  const q = document.getElementById('q').value.trim();
  if(!q){document.getElementById('meta').textContent = '数字を入れてね'; return;}
  const res = await fetch('/search?q=' + encodeURIComponent(q));
  const data = await res.json();
  if(data.error){
    document.getElementById('meta').textContent = 'エラー: ' + data.error;
    return;
  }
  document.getElementById('meta').textContent = 'ヒット数: ' + data.hits;
  document.getElementById('results').innerHTML = data.results.map(r => {
    return r.line + ': <span class="match">' + r.text + '</span>';
  }).join('\\n');
}
</script>
</body>
</html>
  `);
});

// API（完全一致・数字専用・ストリーム読み込み）
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: '検索数字を指定してください' });
  }
  if (!/^\d+$/.test(query)) {
    return res.status(400).json({ error: '数字だけを入力してください' });
  }

  try {
    const fileStream = fs.createReadStream(USER_FILE, 'utf8');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;
    const results = [];

    for await (const line of rl) {
      lineNum++;
      if (line.trim() === query) {
        results.push({ line: lineNum, text: line.trim() });
      }
    }

    res.json({
      hits: results.length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: 'ファイル読み込みエラー', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at ${PORT}`);
});
