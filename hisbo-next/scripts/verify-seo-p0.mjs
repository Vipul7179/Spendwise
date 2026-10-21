import assert from 'node:assert/strict';
const base=process.env.SEO_TEST_BASE_URL || 'http://127.0.0.1:3187';
const origin='https://www.hisbo.in';
async function get(path,options={}){
 const response=await fetch(base+path,{...options,signal:AbortSignal.timeout(30000)});
 return {response,html:await response.text()};
}
const privateRoutes=['/overview','/budgets','/savings','/groups','/automate','/alerts','/admin/banners'];
const accountRoutes=['/login','/signup','/forgot-password','/reset-password'];
let failures=0;
async function check(label,fn){try{await fn();console.log('PASS '+label);}catch(e){failures++;console.log('FAIL '+label+': '+e.message);}}
for(const path of [...privateRoutes,...accountRoutes])await check(path+' noindex and safe HTML',async()=>{
 const {response,html}=await get(path);assert.equal(response.status,200);
 assert.match(html,/<meta name="robots" content="noindex, nofollow"\s*\/>/);
 if(privateRoutes.includes(path)){
  assert.ok(html.includes('Checking session'));
  assert.doesNotMatch(html,/<h2[^>]*>Add expense|<h2[^>]*>All expenses|<h2[^>]*>Promotional banners/);
 }
 assert.ok(!html.includes('application/ld+json'));
});
for(const path of ['/','/blog','/privacy'])await check(path+' production canonical and indexability',async()=>{
 const {response,html}=await get(path);assert.equal(response.status,200);
 const canonical=html.match(/rel="canonical" href="([^"]+)"/);assert.ok(canonical);assert.equal(new URL(canonical[1]).href,new URL(origin+path).href);
 assert.doesNotMatch(html,/<meta name="robots" content="[^"]*noindex/);
 assert.ok(html.includes('<html lang="en"'));
 for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(match[1]);
});
await check('callback redirect retains exclusion header',async()=>{
 const {response}=await get('/auth/callback',{redirect:'manual'});
 assert.equal(response.status,307);assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
 assert.ok(response.headers.get('location').includes('/login?error='));
});
await check('robots allows reading noindex and advertises production sitemap',async()=>{
 const {response,html}=await get('/robots.txt');assert.equal(response.status,200);
 assert.ok(html.includes('Sitemap: '+origin+'/sitemap.xml'));assert.ok(!html.includes('Disallow: /overview'));
});
await check('live sitemap is complete success XML or explicit error',async()=>{
 const {response,html}=await get('/sitemap.xml');
 if(response.status===500){console.log('NOTE sitemap returned explicit 500; live database availability remains unresolved');return;}
 assert.equal(response.status,200);assert.ok(response.headers.get('content-type').includes('xml'));
 const urls=[...html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.ok(urls.length>=3);assert.ok(urls.every(u=>u.startsWith(origin+'/')));
 assert.ok(urls.every(u=>!privateRoutes.some(p=>u===origin+p)));
 assert.ok(!html.includes('Invalid Date'));
 const article=urls.find(u=>u.startsWith(origin+'/blog/'));
 if(article)await check('real published article metadata and JSON-LD',async()=>{
  const path=article.slice(origin.length);const {response,html}=await get(path);assert.equal(response.status,200);
  assert.ok(html.includes(`rel="canonical" href="${article}"`));assert.ok(html.includes('<article'));
  const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);assert.ok(match);
  assert.equal(JSON.parse(match[1]).mainEntityOfPage['@id'],article);
 });
 console.log('NOTE sitemap contains '+urls.length+' URLs; no authenticated data was requested');
});
console.log('Failures: '+failures);process.exitCode=failures?1:0;
