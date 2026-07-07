// NetDraw Share Server - minimal JSON relay
// POST /api/share       → save JSON, return {id, url}
// GET  /api/share/:id   → return JSON
// DELETE /api/share/:id → remove JSON
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const DIR='/var/www/html/shares';
if(!fs.existsSync(DIR))fs.mkdirSync(DIR,{recursive:true});
const MAX_AGE=24*3600*1000; // 24 hours

function cleanOld(){
  try{
    fs.readdirSync(DIR).forEach(f=>{
      const fp=path.join(DIR,f);
      if(Date.now()-fs.statSync(fp).mtimeMs>MAX_AGE)fs.unlinkSync(fp);
    });
  }catch(_){}
}
setInterval(cleanOld,3600*1000);cleanOld();

http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(200);res.end();return;}

  // POST /api/share
  if(req.method==='POST'&&req.url==='/api/share'){
    let body='';
    req.on('data',c=>body+=c);
    req.on('end',()=>{
      try{
        JSON.parse(body); // validate
        const id=crypto.randomBytes(4).toString('hex');
        fs.writeFileSync(path.join(DIR,id+'.json'),body);
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({id,url:'https://draw.pepcn.com/?share='+id}));
      }catch(e){
        res.writeHead(400);res.end('{"error":"invalid json"}');
      }
    });
    return;
  }

  // GET /api/share/:id
  const m=req.url.match(/^\/api\/share\/([a-f0-9]{8,})$/);
  if(req.method==='GET'&&m){
    const fp=path.join(DIR,m[1]+'.json');
    if(fs.existsSync(fp)){
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'public,max-age=3600'});
      res.end(fs.readFileSync(fp));
    }else{
      res.writeHead(404,{'Content-Type':'application/json'});
      res.end('{"error":"not found"}');
    }
    return;
  }

  // DELETE /api/share/:id
  const dm=req.url.match(/^\/api\/share\/([a-f0-9]{8,})$/);
  if(req.method==='DELETE'&&dm){
    const fp=path.join(DIR,dm[1]+'.json');
    try{fs.unlinkSync(fp);res.writeHead(200);res.end('{"ok":true}');}
    catch(_){res.writeHead(404);res.end('{"error":"not found"}');}
    return;
  }

  res.writeHead(404);res.end('Not found');
}).listen(3100,()=>console.log('NetDraw share server on :3100'));
