import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
app.use(express.json({limit:'2mb'}));
app.use(express.static(__dirname));
const port=process.env.PORT||3000;
const agentId=process.env.KOPAI_AGENT_ID||'cmu889j3z00000agmyyjq1bxc';
const apiKey=process.env.KOPAI_API_KEY;
const sessions=new Map();
function headers(){return {'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'}}
function endUser(user){return `webdoctor-${user.id}`}
function textFrom(d){const candidates=[d?.choices?.[0]?.message?.content,d?.message?.content,d?.content,d?.text?.text,d?.text,d?.output?.text,d?.output?.content,d?.raw?.output?.text,d?.raw?.text];const value=candidates.find(v=>typeof v==='string'&&v.trim());return value||''}
function extractJson(text){try{return JSON.parse(text)}catch{}const m=String(text||'').match(/```(?:json)?\s*([\s\S]*?)```/i);if(m)try{return JSON.parse(m[1])}catch{}const start=String(text||'').search(/[\[{]/);if(start>=0)try{return JSON.parse(String(text).slice(start))}catch{}return null}
async function run(messages,user){const r=await fetch(`https://usekopai.com/api/v1/agents/${agentId}/messages`,{method:'POST',headers:headers(),body:JSON.stringify({endUserId:endUser(user),messages})});const data=await r.json();if(!r.ok)throw new Error(data?.error?.message||data?.message||'Kopai request failed');return {raw:data,text:textFrom(data)}}
function auth(req,res,next){const id=req.headers['x-session-id']||req.body?.sessionId;const user=sessions.get(id);if(!user)return res.status(401).json({error:'unauthorized'});req.user=user;next()}
app.post('/api/auth/demo-login',(req,res)=>{const id=crypto.randomUUID();const user={id,name:req.body?.name||'Security Explorer',avatar:(req.body?.name||'SE').slice(0,2).toUpperCase()};sessions.set(id,user);res.json({sessionId:id,user})});
app.get('/api/auth/me',auth,(req,res)=>res.json({user:req.user}));
app.post('/api/auth/logout',auth,(req,res)=>{sessions.delete(req.headers['x-session-id']);res.json({ok:true})});
app.post('/api/integrations',auth,async(req,res)=>{try{const toolkit=req.body?.toolkit||'github';const redirectUri=req.body?.redirectUri||`${req.protocol}://${req.get('host')}/?connected=github`;const r=await fetch(`https://usekopai.com/api/v1/agents/${agentId}/integrations`,{method:'POST',headers:headers(),body:JSON.stringify({toolkit,endUserId:endUser(req.user),redirectUri})});const d=await r.json();res.status(r.status).json(d)}catch(e){res.status(502).json({error:'kopai_unreachable',message:e.message})}});
app.get('/api/integrations',auth,async(req,res)=>{try{const r=await fetch(`https://usekopai.com/api/v1/agents/${agentId}/integrations?endUserId=${encodeURIComponent(endUser(req.user))}`,{headers:headers()});const data=await r.json();const raw=data;const candidates=data.integrations||data.data||data;const github=Array.isArray(candidates)?candidates.find(x=>(x.toolkit||x.name)==='github'):candidates?.github||candidates;const connected=!!(github&&(github.connected===true||github.status==='connected'||github.state==='connected'||github.connectionStatus==='connected'||github.connectedAccountId));res.status(r.status).json({connected,toolkit:'github',integrations:data.integrations||data.data||data,raw})}catch(e){res.status(502).json({error:'kopai_unreachable',message:e.message})}});
app.post('/api/repositories',auth,async(req,res)=>{try{const out=await run([{role:'user',content:'You are operating the WebDoctor repository selection step. Use the connected GitHub account to list every repository this end user can access. Return ONLY valid JSON in this exact shape: {"repositories":[{"name":"string","fullName":"owner/name","description":"string","language":"string","private":false,"updatedAt":"YYYY-MM-DD"}]}. Do not use markdown or commentary.'}],req.user);const parsed=extractJson(out.text)||extractJson(out.raw?.text?.text)||extractJson(out.raw?.output?.text)||extractJson(out.raw?.output?.content)||extractJson(out.raw?.choices?.[0]?.message?.content);const repositories=Array.isArray(parsed?.repositories)?parsed.repositories:[];res.json({repositories,text:out.text,raw:out.raw})}catch(e){res.status(502).json({error:'repository_load_failed',message:e.message})}});
app.post('/api/investigations',auth,async(req,res)=>{const repo=req.body?.repository;if(!repo?.fullName)return res.status(400).json({error:'repository_required'});try{const prompt=`You are WebDoctor's investigation orchestrator. Investigate the authorized GitHub repository ${repo.fullName}. Inspect the repository deeply using the connected GitHub account. Analyze application/API security and system/infrastructure security, then correlate concrete evidence into attack paths. Return a concise but complete security assessment with: executive summary, security score, critical/high/medium findings, affected files or components, confidence, evidence, attack paths, and prioritized remediation. Do not ask questions. Begin immediately.`;const out=await run([{role:'user',content:prompt}],req.user);res.json({repository:repo,text:out.text,raw:out.raw})}catch(e){res.status(502).json({error:'investigation_failed',message:e.message})}});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.listen(port,()=>console.log(`WebDoctor running on http://localhost:${port}`));
