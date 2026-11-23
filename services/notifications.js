const Notification = require('../models/Notification');
const clients = new Map();
function emit(userId, event) {
  const id = String(userId || '');
  for (const client of clients.get(id) || []) {
    try { client.write(`event: update\ndata: ${JSON.stringify(event)}\n\n`); } catch (_) { /* disconnected client */ }
  }
}
async function notify(userId, type, text, url = '/notifications') {
  if (!userId) return null;
  const n = await Notification.create({ user: userId, type, text: String(text).slice(0,300), url });
  emit(userId, {id:String(n._id),type, url});
  return n;
}
function subscribe(userId, res) {
  const id=String(userId);
  if (!clients.has(id)) clients.set(id,new Set());
  clients.get(id).add(res);
  res.write(': connected\n\n');
  const ping=setInterval(()=>{try{res.write(': heartbeat\n\n')}catch(_){}},25000);
  return ()=>{clearInterval(ping);clients.get(id)?.delete(res);if(!clients.get(id)?.size)clients.delete(id)};
}
module.exports={notify,subscribe,emit};
