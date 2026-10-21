const {test}=require('node:test');
const assert=require('node:assert/strict');
const runtime=require('./helpers/source-runtime.cjs');
const load=runtime({}, {URLSearchParams});
const {oauthReturnError,googleAuthError}=load('src/lib/google-auth.ts');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const walk=node=>node&&typeof node==='object'?[node,...[node.props?.children].flat().flatMap(walk)]:[];
function buttonFixture({result,throwError,disabled=false,signup=false,location=''}={}){
 let cursor=0;const hooks=[],listeners=new Map(),busy=[],calls=[];
 const react={useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=initial;return [hooks[i],v=>{hooks[i]=v;}];},useRef(initial){const i=cursor++;return hooks[i]??={current:initial};},useEffect(fn){fn();},useSyncExternalStore(){return location;}};
 const client={auth:{async signInWithOAuth(options){calls.push(options);if(throwError)throw throwError;return result?await result:{data:{url:'https://provider.test'},error:null};}},from(){assert.fail('OAuth button must not write database/profile data');}};
 const Button=runtime({react,'@/lib/supabase/client':{createClient:()=>client},'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'next/link':{}},{URLSearchParams,window:{location:{origin:'http://localhost:3000'},addEventListener:(e,f)=>listeners.set(e,f),removeEventListener:e=>listeners.delete(e)},localStorage:{setItem(){assert.fail('OAuth mutated guest storage');},removeItem(){assert.fail('OAuth removed guest storage');},getItem(){assert.fail('OAuth need not access financial data');}}})('src/components/auth/GoogleAuthButton.tsx').default;
 const render=()=>{cursor=0;return Button({disabled,signup,onBusyChange:v=>busy.push(v)});};
 const button=()=>walk(render()).find(n=>n.type==='button');
 return {render,button,calls,busy,listeners};
}
test('login and signup invoke Google OAuth with origin callback; no profile or guest writes',async()=>{
 for(const signup of [false,true]){
  const f=buttonFixture({signup});const node=f.button();assert.equal(node.props.type,'button');
  await node.props.onClick();assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].provider,'google');assert.equal(f.calls[0].options.redirectTo,'http://localhost:3000/auth/callback?next=/overview');
  assert.equal(f.button().props.disabled,true);assert.deepEqual(f.busy,[true]);
  assert.ok(walk(f.render()).some(n=>n.props?.className==='auth-email-divider'));
  assert.equal(walk(f.render()).some(n=>n.props?.className==='google-auth-terms'),false);
 }
});
test('Google duplicate clicks are locked synchronously, even before rerender',async()=>{
 let resolve;const f=buttonFixture({result:new Promise(r=>resolve=r)});const node=f.button();const first=node.props.onClick();await node.props.onClick();assert.equal(f.calls.length,1);resolve({error:null});await first;
});
test('disabled Google button does not start while email auth is pending',async()=>{
 const f=buttonFixture({disabled:true});await f.button().props.onClick();assert.equal(f.calls.length,0);
});
for(const failure of [{error:{message:'Provider not enabled'}},{thrown:Error('Failed to fetch')}])test('Google startup failures unlock button and show useful errors '+JSON.stringify(failure),async()=>{
 const f=buttonFixture({result:failure.thrown?undefined:{error:failure.error},throwError:failure.thrown});await f.button().props.onClick();assert.deepEqual(f.busy,[true,false]);assert.equal(f.button().props.disabled,false);assert.ok(walk(f.render()).some(n=>n.props?.role==='alert'));
});
test('browser back/pageshow makes Google button usable again',async()=>{
 const f=buttonFixture();await f.button().props.onClick();f.listeners.get('pageshow')();assert.equal(f.button().props.disabled,false);assert.deepEqual(f.busy,[true,false]);
});
test('callback errors display safe messages, including cancellation fragments',()=>{
 assert.match(oauthReturnError('?error=access_denied'),/cancelled/);
 assert.match(oauthReturnError('?error=missing_code#error=access_denied'),/cancelled/);
 assert.match(oauthReturnError('?error=exchange_failed&error_description=SECRET'),/expired/);
 assert.ok(!oauthReturnError('?error=<script>SECRET').includes('SECRET'));
 assert.equal(oauthReturnError('?next=/overview'),null);
 assert.match(googleAuthError(Error('Missing NEXT_PUBLIC_SUPABASE_URL')),/unavailable/);
});
function callbackFixture({error=null,throwError=false,session={user:{id:'existing-supabase-id'}}}={}){
 const cookies=[],exchanges=[];
 const route=runtime({
  '@supabase/ssr':{createServerClient(url,key,options){assert.equal(key,'fixture-anon');return {auth:{async exchangeCodeForSession(code){exchanges.push(code);if(throwError)throw Error('Network');if(!error&&session)options.cookies.setAll([{name:'sb-fixture-auth-token',value:'session-fixture',options:{httpOnly:false,path:'/'}}]);return {data:{session},error};}}};}},
  'next/headers':{cookies:async()=>({getAll:()=>[{name:'sb-fixture-code-verifier',value:'verifier'}],set:(name,value,options)=>cookies.push({name,value,options})})},
 },{process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon'}}})('src/app/auth/callback/route.ts');
 return {GET:route.GET,cookies,exchanges};
}
for(const next of ['/overview','/reset-password','/budgets?month=10'])test('callback exchanges code, persists SSR session cookies and redirects safely '+next,async()=>{
 const f=callbackFixture();const request=new Request('http://localhost:3000/auth/callback?code=fixture&next='+encodeURIComponent(next));const res=await f.GET(request);assert.equal(res.status,307);assert.equal(res.headers.get('location'),'http://localhost:3000'+next);assert.deepEqual(f.exchanges,['fixture']);assert.equal(f.cookies[0].name,'sb-fixture-auth-token');
});
for(const next of ['https://evil.test','//evil.test','/\\evil.test','/%2f%2fevil.test','/auth/callback','/login','/overview\n'])test('callback rejects unsafe or unsupported redirect '+JSON.stringify(next),async()=>{
 const f=callbackFixture();const res=await f.GET(new Request('https://www.hisbo.in/auth/callback?code=fixture&next='+encodeURIComponent(next),{headers:{'x-forwarded-host':'evil.test'}}));assert.equal(res.headers.get('location'),'https://www.hisbo.in/overview');
});
for(const options of [{error:Error('Expired code')},{throwError:true},{session:null}])test('callback exchange failure redirects to usable login error '+JSON.stringify(options),async()=>{
 const res=await callbackFixture(options).GET(new Request('http://localhost:3000/auth/callback?code=fixture'));assert.equal(res.headers.get('location'),'http://localhost:3000/login?error=exchange_failed');
});
test('cancellation and missing code never perform code exchange',async()=>{
 for(const [query,error] of [['error=access_denied&error_description=SECRET','access_denied'],['','missing_code']]){
  const f=callbackFixture();const res=await f.GET(new Request('https://www.hisbo.in/auth/callback?'+query));assert.deepEqual(f.exchanges,[]);assert.equal(res.headers.get('location'),'https://www.hisbo.in/login?error='+error);
 }
});
test('email forms retain password auth handlers and exclude concurrent OAuth submission',async()=>{
 for(const [path,handler] of [['src/components/auth/LoginForm.tsx','signInWithPassword'],['src/app/(auth)/signup/page.tsx','signUp']]){
  const fs=require('node:fs');const source=fs.readFileSync(path,'utf8');assert.ok(source.includes('supabase.auth.'+handler+'('));assert.ok(source.includes('disabled={loading || oauthLoading}'));assert.ok(source.includes('if (oauthLoading) return;'));
 }
 await tick();
});

test('existing email/password login still submits and retains local financial records',async()=>{
 const hooks=[];let cursor=0;const routes=[],attempts=[];
 const snapshot=JSON.stringify({exps:[{id:'local-expense',amt:99}],goals:[{id:'local-goal'}],groups:[{id:'local-group'}]});
 const storage=new Map([['spendwise_v1',snapshot],['sw_guest','1']]);
 const client={auth:{async signInWithPassword(payload){attempts.push(payload);return {data:{session:{user:{id:'existing-user'}},user:{id:'existing-user'}},error:null};}},from(){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{data:{exps:[{id:'cloud-expense'}]}}}),upsert(){assert.fail('Existing cloud record should not be overwritten by login form');}};}};
 const react={useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=initial;return [hooks[i],v=>hooks[i]=v];}};
 const Form=runtime({react,'next/navigation':{useRouter:()=>({push:p=>routes.push(p),refresh(){}})},'next/link':{},'@/components/auth/AuthTabs':{},'@/components/auth/GuestEntryButton':{},'@/components/auth/GoogleAuthButton':{},'@/lib/supabase/client':{createClient:()=>client},'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}},{localStorage:{getItem:k=>storage.get(k),removeItem:k=>storage.delete(k),setItem:(k,v)=>storage.set(k,v)},console:{log(){},warn(){}}})('src/components/auth/LoginForm.tsx').default;
 const render=()=>{cursor=0;return Form();};
 let nodes=walk(render());nodes.find(n=>n.props?.id==='login-email').props.onChange({target:{value:'existing@example.test'}});nodes.find(n=>n.props?.id==='login-password').props.onChange({target:{value:'fixture-password'}});
 nodes=walk(render());await nodes.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
 assert.equal(attempts.length,1);assert.equal(attempts[0].email,'existing@example.test');assert.equal(storage.get('spendwise_v1'),snapshot);assert.deepEqual(routes,['/overview']);
});

test('callback keeps loopback host and accepts only known production proxy host',async()=>{
 const cases=[['http://localhost:3188/auth/callback?error=access_denied',{'host':'127.0.0.1:3188'},'http://127.0.0.1:3188'],['http://localhost:3000/auth/callback?error=access_denied',{'x-forwarded-host':'www.hisbo.in'},'https://www.hisbo.in'],['https://preview.test/auth/callback?error=access_denied',{'x-forwarded-host':'evil.test'},'https://www.hisbo.in']];
 for(const [url,headers,origin] of cases){const res=await callbackFixture().GET(new Request(url,{headers}));assert.equal(res.headers.get('location'),origin+'/login?error=access_denied');}
});

test('signup has one shared required consent checkbox gating Google and email signup',()=>{
 const hooks=[];let cursor=0;
 const Signup=runtime({react:{useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=initial;return [hooks[i],value=>hooks[i]=value];}},'next/navigation':{useRouter:()=>({})},'next/link':{},'@/components/auth/AuthTabs':{},'@/components/auth/GuestEntryButton':{},'@/components/auth/GoogleAuthButton':{default:'GoogleAuthButton'},'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}})('src/app/(auth)/signup/page.tsx').default;
 const render=()=>{cursor=0;return walk(Signup());};
 let nodes=render();let boxes=nodes.filter(n=>n.type==='input'&&n.props.type==='checkbox');
 assert.equal(boxes.length,1);assert.equal(boxes[0].props.required,true);
 assert.equal(boxes[0].props.form,nodes.find(n=>n.type==='form').props.id);
 assert.equal(nodes.find(n=>n.type==='GoogleAuthButton').props.disabled,true);
 boxes[0].props.onChange({target:{checked:true}});nodes=render();
 assert.equal(nodes.find(n=>n.type==='GoogleAuthButton').props.disabled,false);
});
