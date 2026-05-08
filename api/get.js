import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing ID' });
  
  try {
    const data = await kv.get(`meeting_${id}`);
    if (!data) return res.status(404).json({ error: '找不到會議紀錄' });
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: '讀取失敗' });
  }
}
