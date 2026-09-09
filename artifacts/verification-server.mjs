import {createApp} from '../server/index.js';
import {hashPassword} from '../server/auth.js';
const {app,db}=createApp(':memory:',{uploadDir:new URL('./verification-uploads',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')});
db.prepare('INSERT INTO administrators VALUES (?,?)').run('review@example.test',hashPassword('Pawpass-review-only-2026'));
app.listen(3002,'127.0.0.1',()=>console.log('Isolated verification server http://127.0.0.1:3002'));
