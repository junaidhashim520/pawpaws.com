import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export function hashPassword(password) { const salt=randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password,salt,64).toString('hex')}`; }
export function verifyPassword(password,stored) {try{const [salt,key]=stored.split(':');const actual=scryptSync(password,salt,64);const expected=Buffer.from(key,'hex');return expected.length===actual.length&&timingSafeEqual(expected,actual);}catch{return false;}}
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export function installAuth(app,db) {
 db.exec(`CREATE TABLE IF NOT EXISTS administrators(email TEXT PRIMARY KEY,password_hash TEXT NOT NULL); CREATE TABLE IF NOT EXISTS admin_sessions(token_hash TEXT PRIMARY KEY,email TEXT NOT NULL REFERENCES administrators(email) ON DELETE CASCADE,expires INTEGER NOT NULL);`);
 const attempts=new Map();
 const cookie='pawpass_admin';
 const getSession=req=>{const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookie+'='))?.slice(cookie.length+1);return token?db.prepare('SELECT email FROM admin_sessions WHERE token_hash=? AND expires>?').get(tokenHash(token),Date.now()):undefined;};
 const requireAdmin=(req,res,next)=>{const session=getSession(req);if(!session)return res.status(401).json({error:'Please sign in to continue.'});req.admin=session;next();};
 app.use('/api/admin',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD'].includes(req.method)){if(req.get('X-PawPass-Admin')!=='1')return res.status(403).json({error:'Invalid admin request.'});const origin=req.get('origin');if(origin){try{const originUrl=new URL(origin);const allowedHosts=new Set([req.get('host'),'localhost:5173','127.0.0.1:5173']);if(!allowedHosts.has(originUrl.host))return res.status(403).json({error:'Cross-origin requests are not allowed.'});}catch{return res.status(403).json({error:'Invalid origin.'});}}}next();});
 app.get('/api/admin/session',(req,res)=>res.json({user:getSession(req)?.email||null,configured:!!db.prepare('SELECT 1 FROM administrators LIMIT 1').get()}));
 app.post('/api/admin/login',(req,res)=>{
  const now=Date.now(),key=req.ip;for(const [ip,a] of attempts)if(a.until<now)attempts.delete(ip);
  const attempt=attempts.get(key);if(attempt?.count>=10)return res.status(429).json({error:'Too many attempts. Please wait 15 minutes.'});
  const {email,password}=req.body||{};if(typeof email!=='string'||typeof password!=='string'||password.length>200)return res.status(400).json({error:'Enter an email and password.'});
  const user=db.prepare('SELECT * FROM administrators WHERE email=?').get(email.trim().toLowerCase());
  if(!user||!verifyPassword(password,user.password_hash)){attempts.set(key,{count:(attempt?.count||0)+1,until:attempt?.until||now+900000});return res.status(401).json({error:'Email or password is incorrect.'});}
  attempts.delete(key);db.prepare('DELETE FROM admin_sessions WHERE expires<?').run(now);const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO admin_sessions VALUES (?,?,?)').run(tokenHash(token),user.email,now+43200000);
  res.cookie(cookie,token,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='true'||req.secure,maxAge:43200000,path:'/api/admin'});res.json({user:user.email});
 });
 app.post('/api/admin/logout',requireAdmin,(req,res)=>{const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookie+'='))?.slice(cookie.length+1);if(token)db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(tokenHash(token));res.clearCookie(cookie,{path:'/api/admin'});res.json({ok:true});});
 return requireAdmin;
}
