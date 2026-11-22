const express=require('express');const helmet=require('helmet');const rateLimit=require('express-rate-limit');
const app=express();app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'32kb'}));
app.use('/api/',rateLimit({windowMs:60_000,max:12,standardHeaders:true,legacyHeaders:false}));
app.use(express.static('.',{dotfiles:'deny',extensions:['html']}));
const ALLOWED_MODELS=new Set(['openrouter/free','deepseek/deepseek-r1:free','google/gemma-3-27b-it:free']);
app.post('/api/chat',async(req,res)=>{const prompt=typeof req.body?.prompt==='string'?req.body.prompt.trim():'';const model=ALLOWED_MODELS.has(req.body?.model)?req.body.model:'openrouter/free';if(!prompt||prompt.length>4000)return res.status(400).json({error:'Invalid prompt'});
 const key=process.env.OPENROUTER_API_KEY;if(!key)return res.status(503).json({error:'OPENROUTER_API_KEY is not configured'});
 try{const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':process.env.SITE_URL||'http://localhost:3000','X-Title':'AiStructure'},body:JSON.stringify({model,messages:[{role:'system',content:'Return a short JSON scene plan with name and primitive objects. Never return executable code or secrets.'},{role:'user',content:prompt}],response_format:{type:'json_object'},max_tokens:500}});const data=await response.json();if(!response.ok)return res.status(502).json({error:'AI provider error'});return res.json({reply:data.choices?.[0]?.message?.content||''});}catch{res.status(502).json({error:'AI provider unavailable'})}});
app.listen(process.env.PORT||3000,()=>console.log('AiStructure running')); 
