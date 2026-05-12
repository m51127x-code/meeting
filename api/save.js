export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { configData } = req.body;
    // 產生 6 碼隨機會議 ID
    const meetingId = Math.random().toString(36).substring(2, 8);
    
    // 讀取 Vercel 自動綁定的環境變數
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    if (!kvUrl || !kvToken) {
      return res.status(500).json({ error: '未偵測到 KV 資料庫綁定' });
    }

    // 【關鍵修改】：網址後方加上 ?EX=2592000，讓這份會議紀錄 30 天後自動刪除！
    const response = await fetch(`${kvUrl}/set/meeting_${meetingId}?EX=2592000`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      // Vercel KV 存入物件時建議轉為字串
      body: JSON.stringify(configData), 
    });

    if (!response.ok) throw new Error('寫入資料庫失敗');

    res.status(200).json({ id: meetingId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '儲存失敗' });
  }
}
