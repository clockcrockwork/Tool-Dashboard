const $=id=>document.getElementById(id);
const MLC="https://esm.run/@mlc-ai/web-llm@0.2.84";
const WLLAMA="https://esm.run/@wllama/wllama@3.13.0";
const WASM="https://cdn.jsdelivr.net/npm/@wllama/wllama@3.13.0/esm/wasm-from-cdn.js";
const instruction='日本語の文章からタスクを抽出し、JSONだけを返してください。形式: {"title":"タスク名","due_date":"YYYY-MM-DDまたはnull","priority":"high|medium|low|unknown","tags":["分類"]}。日付不明ならnull、優先度不明ならunknown。Markdownや説明は禁止。';
const models={
webllm:[{id:"Qwen2.5-0.5B-Instruct-q4f16_1-MLC",label:"Qwen2.5 0.5B q4f16",info:"WebGPU shader-f16必須、推定GPUメモリ約945MB"},
{id:"Qwen2.5-0.5B-Instruct-q4f32_1-MLC",label:"Qwen2.5 0.5B q4f32",info:"f16が使えない場合の候補、推定GPUメモリ約1GB"}],
wllama:[{id:"Qwen/Qwen2.5-0.5B-Instruct-GGUF",label:"Qwen2.5 0.5B GGUF Q4_K_M",info:"公式GGUF、ダウンロード約491MB。WebLLMとは量子化が異なる",file:"qwen2.5-0.5b-instruct-q4_k_m.gguf"}]
};
const state={phase:"idle",engine:null,worker:null,backend:null,runtime:null,model:null,loadMs:null,device:null,records:[],abort:null,stopRequested:false};
const ms=v=>v==null?"—":(v/1000).toFixed(2)+"秒";
const error=e=>e instanceof Error?e.name+": "+e.message:String(e);
function phase(name,message){
 state.phase=name;if(message)$("status").textContent=message;
 for(const id of ["runtime","model","backend","load"])$(id).disabled=name!=="idle";
 $("release").disabled=name!=="ready";$("run").disabled=name!=="ready";$("stop").disabled=name!=="running";
 $("export").disabled=!state.records.length;$("clear").disabled=!state.records.length;
}
function setModels(){
 const r=$("runtime").value;
 $("model").replaceChildren(...models[r].map(m=>{const o=document.createElement("option");o.value=m.id;o.textContent=m.label;return o}));
 $("backendField").hidden=r!=="wllama";setInfo();
}
function setInfo(){$("modelInfo").textContent=models[$("runtime").value].find(m=>m.id===$("model").value)?.info||"";}
function progress(value,message){if(Number.isFinite(value))$("progress").value=Math.min(100,Math.max(0,value));if(message)$("status").textContent=String(message).slice(0,250);}
async function probe(){
 const d={"ブラウザ":navigator.userAgent,"安全な文脈":String(isSecureContext),"WebGPU":navigator.gpu?"APIあり":"なし","WebAssembly":String(typeof WebAssembly!=="undefined"),"SharedArrayBuffer":String(typeof SharedArrayBuffer!=="undefined"&&crossOriginIsolated),"論理コア":navigator.hardwareConcurrency??"取得不可","RAM概算":navigator.deviceMemory?navigator.deviceMemory+"GB（参考）":"取得不可"};
 if(navigator.gpu)try{const a=await navigator.gpu.requestAdapter();d.WebGPU=a?"アダプタ取得成功":"アダプタ取得不可";d["shader-f16"]=a?String(a.features.has("shader-f16")):"不明";}catch(e){d.WebGPU=error(e);}
 if(navigator.storage?.estimate)try{const s=await navigator.storage.estimate();if(s.quota!=null&&s.usage!=null)d["ストレージ空き（推定）"]=((s.quota-s.usage)/1024**3).toFixed(1)+"GB";}catch{}
 state.device=d;$("device").replaceChildren();
 for(const [key,value] of Object.entries(d)){const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=key;dd.textContent=String(value);$("device").append(dt,dd);}
}
async function release(){
 const engine=state.engine,runtime=state.runtime;state.engine=null;
 try{if(engine){if(runtime==="webllm")await engine.unload();else await engine.exit();}}
 finally{state.worker?.terminate();state.worker=null;}
}
async function load(){
 if(state.phase!=="idle")return;
 const runtime=$("runtime").value,model=models[runtime].find(m=>m.id===$("model").value);
 if(!model)return;
 const backend=runtime==="webllm"?"WebGPU":$("backend").value;
 if((runtime==="webllm"||backend==="gpu")&&!navigator.gpu){$("status").textContent="WebGPU非対応です。wllama CPUを試してください。";return;}
 phase("loading","読み込み中。初回は数百MB以上ダウンロードします。");progress(0);
 let candidate=null;const t=performance.now();
 try{
  if(runtime==="webllm"){
   const api=await import(MLC);state.worker=new Worker("./webllm-worker.js",{type:"module"});
   candidate=await api.CreateWebWorkerMLCEngine(state.worker,model.id,{initProgressCallback:p=>progress((p.progress||0)*100,p.text||"WebLLM準備中")},{context_window_size:1024});
  }else{
   const [api,wasm]=await Promise.all([import(WLLAMA),import(WASM)]);
   candidate=new api.Wllama(wasm.default);candidate.setCompat("default");
   await candidate.loadModelFromHF({repo:model.id,file:model.file},{n_ctx:1024,n_threads:1,n_gpu_layers:backend==="gpu"?99:0,progressCallback:({loaded,total})=>progress(total?100*loaded/total:0,total?"GGUF "+Math.round(loaded*100/total)+"%":"GGUF準備中")});
  }
  state.engine=candidate;state.runtime=runtime;state.model=model.id;state.backend=backend;state.loadMs=performance.now()-t;
  $("loadMs").textContent=ms(state.loadMs);progress(100,"モデルを読み込みました。");phase("ready");
 }catch(e){
  try{if(candidate){if(runtime==="webllm")await candidate.unload();else await candidate.exit();}}catch{}
  state.worker?.terminate();state.worker=null;progress(0);phase("idle","読み込み失敗: "+error(e));
 }
}
function assess(output){
 try{const x=JSON.parse(output);return {json:true,schema:Boolean(x&&!Array.isArray(x)&&typeof x.title==="string"&&x.title.length>0&&(x.due_date===null||typeof x.due_date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x.due_date))&&["high","medium","low","unknown"].includes(x.priority)&&Array.isArray(x.tags)&&x.tags.every(t=>typeof t==="string"))};}
 catch{return {json:false,schema:false};}
}
function render(){
 $("records").replaceChildren();
 if(!state.records.length)$("records").textContent="記録はありません。";
 for(const r of [...state.records].reverse()){
  const div=document.createElement("div"),b=document.createElement("strong"),small=document.createElement("span");div.className="record";
  b.textContent=r.runtime+" / "+r.model+" / "+r.backend;small.textContent=r.status+" | 読み込み "+ms(r.loadMs)+" | 生成 "+ms(r.generationMs)+" | JSON "+(r.schema?"合格":"不合格");
  div.append(b,small);$("records").append(div);
 }
 phase(state.phase);
}
async function run(){
 if(state.phase!=="ready")return;
 const prompt=$("prompt").value.trim();if(!prompt){$("status").textContent="文章を入力してください。";return;}
 state.abort=new AbortController();state.stopRequested=false;phase("running","生成中...");$("output").textContent="生成中...";
 const t=performance.now();let text="",tokens=null,status="success",failure=null;
 try{
  const args={messages:[{role:"system",content:instruction},{role:"user",content:prompt}],max_tokens:128,temperature:0,top_p:1};
  const res=state.runtime==="webllm"?await state.engine.chat.completions.create(args):await state.engine.createChatCompletion({...args,abortSignal:state.abort.signal});
  text=res.choices?.[0]?.message?.content||"";if(Number.isInteger(res.usage?.completion_tokens)&&res.usage.completion_tokens>0)tokens=res.usage.completion_tokens;
  if(state.stopRequested)status="stopped";
 }catch(e){status=state.stopRequested?"stopped":"error";failure=error(e);}
 const generationMs=performance.now()-t,q=status==="success"?assess(text):{json:false,schema:false},speed=tokens&&generationMs>0?tokens/(generationMs/1000):null;
 $("generationMs").textContent=ms(generationMs);$("tokens").textContent=tokens??"取得不可";$("speed").textContent=speed==null?"—":speed.toFixed(1)+" token/s";
 $("output").textContent=failure||text||(status==="stopped"?"中断しました":"空の応答");
 $("validity").textContent=status!=="success"?status:q.schema?"JSONスキーマ合格":q.json?"JSONだが形式不一致":"JSONではない";
 state.records.push({at:new Date().toISOString(),runtime:state.runtime,model:state.model,backend:state.backend,status,loadMs:state.loadMs,generationMs,tokens,tokenRate:speed,json:q.json,schema:q.schema,prompt,output:text,error:failure,device:state.device});
 state.abort=null;phase("ready",status==="success"?"生成完了":status+" "+(failure||""));render();
}
async function stop(){
 if(state.phase!=="running")return;state.stopRequested=true;state.abort?.abort();$("stop").disabled=true;$("status").textContent="中断要求を送信...";
 if(state.runtime==="webllm")try{await state.engine.interruptGenerate();}catch{}
}
function exportData(){
 if(!state.records.length)return;
 const data=JSON.stringify({version:1,exportedAt:new Date().toISOString(),records:state.records},null,2);
 const url=URL.createObjectURL(new Blob([data],{type:"application/json"})),a=document.createElement("a");
 a.href=url;a.download="mobile-local-llm-"+new Date().toISOString().replace(/[:.]/g,"-")+".json";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
$("runtime").addEventListener("change",setModels);$("model").addEventListener("change",setInfo);
$("probe").addEventListener("click",probe);$("load").addEventListener("click",load);$("run").addEventListener("click",run);$("stop").addEventListener("click",stop);
$("release").addEventListener("click",async()=>{if(state.phase!=="ready")return;phase("loading","解放中...");try{await release();phase("idle","メモリを解放しました。");}catch(e){phase("idle","解放中のエラー: "+error(e));}state.loadMs=null;progress(0);});
$("export").addEventListener("click",exportData);$("clear").addEventListener("click",()=>{state.records=[];render();});
setModels();phase("idle");probe();
