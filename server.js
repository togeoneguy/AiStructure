const express=require('express');
const helmet=require('helmet');
const rateLimit=require('express-rate-limit');
const app=express();
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false,crossOriginResourcePolicy:{policy:'same-site'}}));
app.use(express.json({limit:'32kb'}));
app.use('/api/',rateLimit({windowMs:60_000,max:15,standardHeaders:true,legacyHeaders:false}));
app.use(express.static(__dirname,{dotfiles:'deny',extensions:['html']}));

const FALLBACK_MODELS=[
  {id:'openrouter/free',name:'OpenRouter Free — авто-выбор'},
  {id:'deepseek/deepseek-r1:free',name:'DeepSeek R1 — бесплатный тариф'},
  {id:'google/gemma-3-27b-it:free',name:'Gemma 3 27B — бесплатный тариф'}
];
let modelCache={expires:0,models:FALLBACK_MODELS};
async function getFreeModels(){
  if(modelCache.expires>Date.now())return modelCache.models;
  try{
    const response=await fetch('https://openrouter.ai/api/v1/models',{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('catalog unavailable');
    const payload=await response.json();
    const free=(payload.data||[]).filter(model=>Number(model.pricing?.prompt)===0&&Number(model.pricing?.completion)===0&&typeof model.id==='string'&&!model.id.endsWith('/free'))
      .sort((a,b)=>(b.context_length||0)-(a.context_length||0)).slice(0,80)
      .map(model=>({id:model.id,name:`${model.name||model.id} · FREE`}));
    const models=[{id:'openrouter/free',name:'OpenRouter Free — авто-выбор'},...free];
    modelCache={expires:Date.now()+5*60_000,models};
    return models;
  }catch{return modelCache.models;}
}
app.get('/api/models',async(_req,res)=>{
  const models=await getFreeModels();
  res.setHeader('Cache-Control','public, max-age=60');
  res.json({models,source:modelCache.expires>Date.now()?'live':'cached'});
});

app.post('/api/chat',async(req,res)=>{
  const prompt=typeof req.body?.prompt==='string'?req.body.prompt.trim():'';
  const model=typeof req.body?.model==='string'?req.body.model:'';
  if(!prompt||prompt.length>4000)return res.status(400).json({error:'Введите описание длиной до 4000 символов.'});
  const allowed=await getFreeModels();
  if(!allowed.some(item=>item.id===model))return res.status(400).json({error:'Модель не найдена в каталоге бесплатных моделей. Обновите страницу и выберите модель из списка.'});
  const key=process.env.OPENROUTER_API_KEY;
  if(!key)return res.status(503).json({error:'Не настроен OPENROUTER_API_KEY на сервере.'});
  try{
    const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST',signal:AbortSignal.timeout(45_000),
      headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':process.env.SITE_URL||'http://localhost:3000','X-Title':'AiStructure'},
      body:JSON.stringify({model,messages:[
        {role:'system',content:'You convert text requests into a safe, simple 3D scene plan. Reply ONLY as JSON with keys name, description, objects. objects is an array of 3-20 objects; every object has name, type (box, sphere, cylinder, cone), x,y,z, size (0.2-8), color (#RRGGBB), and optional rotationX,rotationY,rotationZ. Coordinates should make a coherent scene centered near origin. Do not output code, markdown, or instructions.'},
        {role:'user',content:prompt}
      ],temperature:0.35,max_tokens:1200})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const message=data.error?.message||'Провайдер ИИ отклонил запрос.';return res.status(502).json({error:message.slice(0,300)});}
    const reply=data.choices?.[0]?.message?.content;
    if(typeof reply!=='string'||!reply.trim())return res.status(502).json({error:'Модель вернула пустой ответ.'});
    res.setHeader('Cache-Control','no-store');res.json({reply});
  }catch(error){res.status(502).json({error:error.name==='TimeoutError'?'Модель не ответила вовремя. Попробуйте ещё раз.':'Не удалось связаться с провайдером ИИ.'});}
});
app.listen(process.env.PORT||3000,()=>console.log(`AiStructure running on port ${process.env.PORT||3000}`));
