import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  try {
    const { configData } = req.body;
    // 產生一個 6 碼隨機 ID
    const meetingId = Math.random().toString(36).substring(2, 8);
    
    // 存入 Vercel KV (拿掉 ex 設定，資料即為永久保存)
    await kv.set(`meeting_${meetingId}`, configData);
    
    res.status(200).json({ id: meetingId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '儲存失敗' });
  }
}
