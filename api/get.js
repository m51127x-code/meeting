export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing ID' });
  
  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (!kvUrl || !kvToken) {
      return res.status(500).json({ error: '未偵測到 KV 資料庫綁定' });
    }

    // 使用原生 fetch 讀取資料庫
    const response = await fetch(`${kvUrl}/get/meeting_${id}`, {
      headers: {
        Authorization: `Bearer ${kvToken}`,
      }
    });

    const json = await response.json();
    
    if (!json.result) {
      return res.status(404).json({ error: '找不到此會議紀錄' });
    }

    let data = json.result;
    // Vercel KV 傳回的可能是字串格式，嘗試解析回 JSON
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch(e) {}
    }

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '讀取失敗' });
  }
}
