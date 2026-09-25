const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),url=require('url');
const PORT=process.env.PORT||3000, EMAIL=process.env.ADMIN_EMAIL||'', PASSWORD=process.env.ADMIN_PASSWORD||'', SECRET=process.env.SESSION_SECRET||'change-this-secret';
const DATA=path.join(__dirname,'data.json');
function data(){try{return JSON.parse(fs.readFileSync(DATA,'utf8'))}catch{return {visits:[],clicks:[],leads:[]}}}
function save(d){fs.writeFileSync(DATA,JSON.stringify(d))}
function token(){return crypto.createHmac('sha256',SECRET).update(EMAIL).digest('hex')}
function authed(req){return (req.headers.cookie||'').includes('bio_admin='+token())}
function json(res,obj,status=200){res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(obj))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})})}
const server=http.createServer(async(req,res)=>{
 const u=url.parse(req.url,true), p=u.pathname;
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'});return res.end()}
 if(p==='/api/login'&&req.method==='POST'){const b=await body(req);if(b.email===EMAIL&&b.password===PASSWORD){res.writeHead(200,{'Set-Cookie':'bio_admin='+token()+'; HttpOnly; Secure; SameSite=Strict; Path=/','Content-Type':'application/json'});return res.end(JSON.stringify({ok:true}))}return json(res,{ok:false,error:'Credenciais inválidas'},401)}
 if(p==='/api/logout'){res.writeHead(200,{'Set-Cookie':'bio_admin=; Max-Age=0; Path=/'});return res.end('ok')}
 if(p==='/api/track'&&req.method==='POST'){const b=await body(req),d=data(),now=new Date().toISOString();if(b.type==='visit')d.visits.push({at:now,ref:b.ref||''});if(b.type==='whatsapp')d.clicks.push({at:now});if(b.type==='lead')d.leads.push({...b,at:now});save(d);return json(res,{ok:true})}
 if(p==='/api/stats'){if(!authed(req))return json(res,{error:'Não autorizado'},401);const d=data(),days=30,cut=Date.now()-days*86400000;const recent=a=>a.filter(x=>new Date(x.at).getTime()>=cut);const visits=recent(d.visits),clicks=recent(d.clicks),leads=recent(d.leads);const daily={};for(let i=days-1;i>=0;i--){const k=new Date(Date.now()-i*86400000).toISOString().slice(0,10);daily[k]={visits:0,clicks:0,leads:0}};visits.forEach(x=>{const k=x.at.slice(0,10);if(daily[k]) daily[k].visits++;});clicks.forEach(x=>{const k=x.at.slice(0,10);if(daily[k]) daily[k].clicks++;});leads.forEach(x=>{const k=x.at.slice(0,10);if(daily[k]) daily[k].leads++;});const products={},segments={};leads.forEach(x=>{products[x.produto]=(products[x.produto]||0)+1;segments[x.segmento]=(segments[x.segmento]||0)+1});return json(res,{totals:{visits:d.visits.length,clicks:d.clicks.length,leads:d.leads.length},last30:{visits:visits.length,clicks:clicks.length,leads:leads.length},daily,products,segments,leads:leads.slice(-50).reverse()})}
 if(p==='/'){res.writeHead(302,{Location:'/admin.html'});return res.end()}
 const file=p==='/admin.html'?path.join(__dirname,'public/admin.html'):null;
 if(file&&fs.existsSync(file)){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return fs.createReadStream(file).pipe(res)}
 res.writeHead(404);res.end('Not found');
});server.listen(PORT,()=>console.log('Biomassa admin on '+PORT));