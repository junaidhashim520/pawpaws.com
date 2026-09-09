import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import { initialProducts } from './seed.js';
import { installAuth } from './auth.js';
const imageSchema=z.string().max(2000).refine(s=>!s||/^\/uploads\/[a-f0-9-]+\.(png|jpg|webp|gif)$/.test(s)||s==='/pawpass-dog.png'||(()=>{try{return new URL(s).protocol==='https:';}catch{return false;}})(),'Use an HTTPS image URL or upload a photo.');
const categorySchema=z.object({name:z.string().trim().min(1).max(60),kind:z.enum(['category','pet']),image:imageSchema.default(''),note:z.string().trim().max(100).default('')});
const productSchema=z.object({name:z.string().trim().min(1).max(100),categoryId:z.string(),petIds:z.array(z.string()).min(1,'Choose at least one pet group.').max(30),kind:z.enum(['product','animal']),price:z.number().finite().min(0).max(1000000).refine(n=>Math.abs(n*100-Math.round(n*100))<0.000001,'Use a price with no more than two decimal places.'),stock:z.number().int().min(0).max(100000),published:z.boolean(),image:imageSchema.default(''),color:z.string().regex(/^#[0-9a-f]{6}$/i),ink:z.string().regex(/^#[0-9a-f]{6}$/i),art:z.enum(['food','bowl','toy','bed','bottle','leash','animal']),badge:z.string().trim().max(40).default(''),detail:z.string().trim().min(1).max(4000),size:z.string().trim().max(100)});
export function installCatalog(app,db,uploadDir) {
 db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS catalog_meta(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE IF NOT EXISTS catalog_categories(id TEXT PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE,kind TEXT NOT NULL CHECK(kind IN ('category','pet')),image TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL,UNIQUE(name,kind)); CREATE TABLE IF NOT EXISTS catalog_products(id TEXT PRIMARY KEY,category_id TEXT NOT NULL REFERENCES catalog_categories(id),position INTEGER NOT NULL,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS catalog_product_pets(product_id TEXT REFERENCES catalog_products(id) ON DELETE CASCADE,pet_id TEXT REFERENCES catalog_categories(id),PRIMARY KEY(product_id,pet_id));`);
 if(!db.prepare("SELECT 1 FROM catalog_meta WHERE key='seeded'").get()){
  db.exec('BEGIN');try{
   const cats=['Food & treats','Toys & play','Home & comfort','Grooming','Walk essentials'];
   const pets=[['Dogs','For the goodest friends','/pawpass-dog.png'],['Cats','For the little rulers','https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=85'],['Birds','For the early singers','https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=600&q=85'],['Small pets','For the tiny big personalities','https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=600&q=85']];
   cats.forEach((name,i)=>db.prepare('INSERT INTO catalog_categories VALUES (?,?,?,?,?,?)').run('cat-'+i,name,'category','','',i*10));pets.forEach(([name,note,image],i)=>db.prepare('INSERT INTO catalog_categories VALUES (?,?,?,?,?,?)').run('pet-'+i,name,'pet',image,note,i*10));
   initialProducts.forEach((p,i)=>{const {category,pets:petNames,...rest}=p;db.prepare('INSERT INTO catalog_products VALUES (?,?,?,?)').run(p.id,'cat-'+cats.indexOf(category),i*10,JSON.stringify({...rest,kind:'product',image:'',stock:20,published:true}));for(const name of petNames)db.prepare('INSERT INTO catalog_product_pets VALUES (?,?)').run(p.id,'pet-'+pets.findIndex(p=>p[0]===name));});
   db.prepare('INSERT INTO catalog_meta VALUES (?,?)').run('seeded','1');db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 const requireAdmin=installAuth(app,db);
 const allCategories=()=>db.prepare('SELECT * FROM catalog_categories ORDER BY position,id').all();
 const catalog=(admin=false)=>{
  const categories=allCategories();const products=db.prepare('SELECT * FROM catalog_products ORDER BY position,id').all().map(row=>{const petIds=db.prepare('SELECT pet_id FROM catalog_product_pets WHERE product_id=? ORDER BY pet_id').all(row.id).map(p=>p.pet_id);return {...JSON.parse(row.payload),id:row.id,position:row.position,categoryId:row.category_id,category:categories.find(c=>c.id===row.category_id)?.name||'',petIds,pets:petIds.map(id=>categories.find(c=>c.id===id)?.name||'')};}).filter(p=>admin||p.published);
  return {products,categories:categories.filter(c=>c.kind==='category'),petGroups:categories.filter(c=>c.kind==='pet')};
 };
 app.get('/api/catalog',(_req,res)=>{res.set('Cache-Control','no-store');res.json(catalog());});
 app.get('/api/admin/catalog',requireAdmin,(_req,res)=>res.json(catalog(true)));
 app.post('/api/admin/categories',requireAdmin,(req,res)=>{
  const result=categorySchema.safeParse(req.body);if(!result.success)return res.status(400).json({error:result.error.issues[0].message});const c=result.data;
  const id=randomUUID();const position=db.prepare('SELECT COALESCE(MAX(position),-10)+10 AS next FROM catalog_categories WHERE kind=?').get(c.kind).next;
  try{db.prepare('INSERT INTO catalog_categories VALUES (?,?,?,?,?,?)').run(id,c.name,c.kind,c.image,c.note,position);res.status(201).json({id});}catch{res.status(409).json({error:'A group with that name already exists.'});}
 });
 app.put('/api/admin/categories/:id',requireAdmin,(req,res)=>{
  const existing=db.prepare('SELECT * FROM catalog_categories WHERE id=?').get(req.params.id);if(!existing)return res.status(404).json({error:'Group not found.'});const result=categorySchema.safeParse(req.body);if(!result.success)return res.status(400).json({error:result.error.issues[0].message});const c=result.data;if(c.kind!==existing.kind)return res.status(400).json({error:'Group type cannot be changed.'});
  try{db.prepare('UPDATE catalog_categories SET name=?,image=?,note=? WHERE id=?').run(c.name,c.image,c.note,req.params.id);res.json({ok:true});}catch{res.status(409).json({error:'A group with that name already exists.'});}
 });
 app.delete('/api/admin/categories/:id',requireAdmin,(req,res)=>{try{const result=db.prepare('DELETE FROM catalog_categories WHERE id=?').run(req.params.id);if(!result.changes)return res.status(404).json({error:'Group not found.'});res.json({ok:true});}catch{res.status(409).json({error:'This group is used by a listing. Reassign those listings before deleting it.'});}});
 const saveProduct=(req,res)=>{
  const result=productSchema.safeParse(req.body);if(!result.success)return res.status(400).json({error:result.error.issues[0].message});const p=result.data;const categories=allCategories();if(!categories.some(c=>c.id===p.categoryId&&c.kind==='category')||p.petIds.some(id=>!categories.some(c=>c.id===id&&c.kind==='pet'))||new Set(p.petIds).size!==p.petIds.length)return res.status(400).json({error:'Choose a valid category and at least one pet group.'});
  const id=req.params.id||randomUUID();const existing=db.prepare('SELECT * FROM catalog_products WHERE id=?').get(id);if(req.params.id&&!existing)return res.status(404).json({error:'Listing not found.'});
  db.exec('BEGIN');try{const {categoryId,petIds,...payload}=p;if(existing)db.prepare('UPDATE catalog_products SET category_id=?,payload=? WHERE id=?').run(categoryId,JSON.stringify(payload),id);else{const position=db.prepare('SELECT COALESCE(MAX(position),-10)+10 AS next FROM catalog_products').get().next;db.prepare('INSERT INTO catalog_products VALUES (?,?,?,?)').run(id,categoryId,position,JSON.stringify(payload));}db.prepare('DELETE FROM catalog_product_pets WHERE product_id=?').run(id);petIds.forEach(petId=>db.prepare('INSERT INTO catalog_product_pets VALUES (?,?)').run(id,petId));db.exec('COMMIT');res.status(existing?200:201).json({id});}catch(e){db.exec('ROLLBACK');throw e;}
 };
 app.post('/api/admin/products',requireAdmin,saveProduct);app.put('/api/admin/products/:id',requireAdmin,saveProduct);
 app.delete('/api/admin/products/:id',requireAdmin,(req,res)=>{const result=db.prepare('DELETE FROM catalog_products WHERE id=?').run(req.params.id);if(!result.changes)return res.status(404).json({error:'Listing not found.'});res.json({ok:true});});
 app.post('/api/admin/reorder',requireAdmin,(req,res)=>{
  const {entity,ids}=req.body||{};if(!['products','category','pet'].includes(entity)||!Array.isArray(ids)||ids.some(id=>typeof id!=='string'))return res.status(400).json({error:'Invalid order.'});const table=entity==='products'?'catalog_products':'catalog_categories';const current=entity==='products'?db.prepare('SELECT id FROM catalog_products').all():db.prepare('SELECT id FROM catalog_categories WHERE kind=?').all(entity);
  if(ids.length!==current.length||new Set(ids).size!==ids.length||current.some(c=>!ids.includes(c.id)))return res.status(409).json({error:'The catalog changed. Refresh and try again.'});
  db.exec('BEGIN');try{const update=db.prepare(`UPDATE ${table} SET position=? WHERE id=?`);ids.forEach((id,i)=>update.run(i*10,id));db.exec('COMMIT');res.json({ok:true});}catch(e){db.exec('ROLLBACK');throw e;}
 });
 mkdirSync(uploadDir,{recursive:true});app.use('/uploads',express.static(uploadDir,{setHeaders:res=>{res.set('X-Content-Type-Options','nosniff');res.set('Cache-Control','public, max-age=86400');}}));
 app.post('/api/admin/upload',requireAdmin,(req,res)=>{const {data}=req.body||{};if(typeof data!=='string'||data.length>7000000)return res.status(400).json({error:'Choose a PNG, JPG, WebP, or GIF under 5 MB.'});const buffer=Buffer.from(data,'base64');let ext='';if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';else if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)ext='jpg';else if(['GIF87a','GIF89a'].includes(buffer.toString('ascii',0,6)))ext='gif';else if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')ext='webp';if(!ext||buffer.length>5*1024*1024)return res.status(400).json({error:'Choose a valid PNG, JPG, WebP, or GIF under 5 MB.'});const name=randomUUID()+'.'+ext;writeFileSync(path.join(uploadDir,name),buffer);res.status(201).json({url:'/uploads/'+name});});
 return requireAdmin;
}
