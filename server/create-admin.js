import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createApp } from './index.js';
import { hashPassword } from './auth.js';
const rl=createInterface({input:stdin,output:stdout});
try {
 const email=(await rl.question('Administrator email: ')).trim().toLowerCase();
 const password=await rl.question('Password (12+ characters; visible in this terminal): ');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>200)throw new Error('Use a valid email and a password between 12 and 200 characters.');
 const {db}=createApp(process.env.DATA_FILE||'data/pawpass.sqlite');
 try {if(db.prepare('SELECT 1 FROM administrators WHERE email=?').get(email))throw new Error('That account already exists. No password was changed.');db.prepare('INSERT INTO administrators VALUES (?,?)').run(email,hashPassword(password));console.log('Administrator created. Open http://localhost:5173/admin to sign in.');}finally{db.close();}
} catch(error){console.error(error.message);process.exitCode=1;}finally{rl.close();}
