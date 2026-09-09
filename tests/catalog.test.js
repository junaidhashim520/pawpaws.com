import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index.js';
import { hashPassword } from '../server/auth.js';

async function fixture(t) {
 const uploadDir=mkdtempSync(path.join(os.tmpdir(),'pawpass-catalog-'));
 const {app,db}=createApp(':memory:',{uploadDir});
 db.prepare('INSERT INTO administrators VALUES (?,?)').run('shop@example.test',hashPassword('test-only-password'));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();rmSync(uploadDir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`;
 let cookie='';
 const call=(url,method='GET',body,extra={})=>fetch(base+url,{method,headers:{'Content-Type':'application/json','X-PawPass-Admin':'1',Cookie:cookie,...extra},body:body===undefined?undefined:JSON.stringify(body)});
 const login=async()=>{const response=await call('/api/admin/login','POST',{email:' SHOP@example.test ',password:'test-only-password'});assert.equal(response.status,200);cookie=response.headers.get('set-cookie').split(';')[0];return response;};
 return {db,call,login};
}

test('admin authentication protects writes, rejects foreign origins, and invalidates logout',async t=>{
 const {db,call,login}=await fixture(t);
 assert.equal((await call('/api/admin/catalog')).status,401);
 assert.equal((await call('/api/admin/products','POST',{})).status,401);
 assert.equal((await call('/api/admin/login','POST',{email:'shop@example.test',password:'wrong'})).status,401);
 const response=await login();assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('set-cookie'),/SameSite=Strict/);
 assert.equal((await call('/api/admin/catalog')).status,200);
 assert.equal((await call('/api/admin/categories','POST',{}, {Origin:'https://unrelated.example'})).status,403);
 assert.equal((await call('/api/admin/categories','POST',{}, {'X-PawPass-Admin':''})).status,403);
 assert.equal((await call('/api/admin/logout','POST')).status,200);
 assert.equal((await call('/api/admin/catalog')).status,401);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM admin_sessions').get().n,0);
});

test('listing lifecycle persists edits, visibility, stock, relationships, ordering and deletions',async t=>{
 const {db,call,login}=await fixture(t);await login();
 const catalog=await (await call('/api/admin/catalog')).json();
 const cat=await (await call('/api/admin/categories','POST',{name:'New essentials',kind:'category'})).json();
 const pet=await (await call('/api/admin/categories','POST',{name:'New companions',kind:'pet',note:'Little friends'})).json();
 const draft={...catalog.products[0],name:'A new favorite',categoryId:cat.id,petIds:[pet.id],stock:2,price:12.35,published:false};
 const created=await call('/api/admin/products','POST',draft);assert.equal(created.status,201);const {id}=await created.json();
 assert.ok(!(await (await call('/api/catalog')).json()).products.some(p=>p.id===id));
 let admin=await (await call('/api/admin/catalog')).json();assert.equal(admin.products.find(p=>p.id===id).stock,2);
 assert.equal((await call(`/api/admin/products/${id}`,'PUT',{...draft,name:'An edited favorite',published:true})).status,200);
 let live=(await (await call('/api/catalog')).json()).products.find(p=>p.id===id);assert.equal(live.name,'An edited favorite');assert.equal(live.price,12.35);assert.equal(live.category,'New essentials');assert.deepEqual(live.pets,['New companions']);
 assert.equal((await call(`/api/admin/categories/${cat.id}`,'DELETE')).status,409);
 assert.equal((await call(`/api/admin/categories/${pet.id}`,'DELETE')).status,409);
 assert.equal((await call(`/api/admin/categories/${cat.id}`,'PUT',{name:'Renamed essentials',kind:'category'})).status,200);
 assert.equal((await (await call('/api/catalog')).json()).products.find(p=>p.id===id).category,'Renamed essentials');
 for(const [entity,items] of [['products',admin.products],['category',admin.categories],['pet',admin.petGroups]]){
  const ids=items.map(p=>p.id).reverse();assert.equal((await call('/api/admin/reorder','POST',{entity,ids})).status,200);
  const updated=await (await call('/api/admin/catalog')).json();assert.deepEqual(updated[entity==='category'?'categories':entity==='pet'?'petGroups':'products'].map(p=>p.id),ids);
 }
 assert.equal((await call('/api/admin/reorder','POST',{entity:'products',ids:[id]})).status,409);
 assert.equal((await call(`/api/admin/products/${id}`,'PUT',{...draft,petIds:[catalog.petGroups[0].id],categoryId:catalog.categories[0].id,published:true,stock:0})).status,200);
 assert.equal((await call(`/api/admin/categories/${cat.id}`,'DELETE')).status,200);assert.equal((await call(`/api/admin/categories/${pet.id}`,'DELETE')).status,200);
 assert.equal((await call(`/api/admin/products/${id}`,'DELETE')).status,200);assert.equal((await call(`/api/admin/products/${id}`,'DELETE')).status,404);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM catalog_product_pets WHERE product_id=?').get(id).n,0);
});

test('invalid catalog input cannot corrupt existing listings',async t=>{
 const {call,login}=await fixture(t);await login();const catalog=await (await call('/api/admin/catalog')).json();const draft=catalog.products[0];
 for(const change of [{name:' '},{stock:-1},{stock:1.5},{price:-1},{price:1.001},{petIds:[]},{petIds:[draft.petIds[0],draft.petIds[0]]},{petIds:['missing']},{categoryId:catalog.petGroups[0].id},{image:'javascript:alert(1)'},{image:'http://unsafe.test/photo.png'},{color:'red'}]){
  assert.equal((await call(`/api/admin/products/${draft.id}`,'PUT',{...draft,...change})).status,400,JSON.stringify(change));
 }
 assert.deepEqual((await (await call('/api/admin/catalog')).json()).products[0],draft);
 assert.equal((await call('/api/admin/categories','POST',{name:catalog.categories[0].name.toUpperCase(),kind:'category'})).status,409);
 assert.equal((await call(`/api/admin/categories/${catalog.categories[0].id}`,'PUT',{name:'Changed',kind:'pet'})).status,400);
});

test('photo uploads are authenticated, validated, served and usable by listings',async t=>{
 const {call,login}=await fixture(t);
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
 assert.equal((await call('/api/admin/upload','POST',{data:png})).status,401);await login();
 assert.equal((await call('/api/admin/upload','POST',{data:Buffer.from('<script>alert(1)</script>').toString('base64')})).status,400);
 const result=await call('/api/admin/upload','POST',{data:png});assert.equal(result.status,201);const {url}=await result.json();
 const image=await call(url);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image\/png/);assert.equal(image.headers.get('x-content-type-options'),'nosniff');
 const catalog=await (await call('/api/admin/catalog')).json();assert.equal((await call(`/api/admin/products/${catalog.products[0].id}`,'PUT',{...catalog.products[0],image:url})).status,200);
});
