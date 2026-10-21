const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const runtime=require('./helpers/source-runtime.cjs');
const seo=runtime()('src/lib/seo.ts');

test('JSON-LD hostile text cannot close script and round-trips unchanged',()=>{
 const value={headline:'</script><script>alert(1)</script><!--',author:{name:'<img src=x onerror=alert(1)>'}};
 const json=seo.serializeJsonLd(value);
 assert.equal(json.includes('<'),false);
 assert.deepEqual(JSON.parse(json),value);
});
test('SEO origin is fixed and slug is encoded as a single segment',()=>{
 assert.equal(seo.canonicalUrl('/blog'),'https://www.hisbo.in/blog');
 assert.equal(seo.canonicalUrl('//evil.test/x'),'https://www.hisbo.in/evil.test/x');
 assert.equal(seo.blogUrl('a/b ?#%'),'https://www.hisbo.in/blog/a%2Fb%20%3F%23%25');
});
function fixture({failAt=-1,cap=37,config=false,stuck=false}={}){
 const calls=[];
 const rows=Array.from({length:245},(_,i)=>({id:String(i).padStart(4,'0'),slug:'article-'+i,status:i%17===0?'draft':'published',published_at:i%19===0?'2999-01-01':i%23===0?null:'2026-01-01',updated_at:'2026-01-02',noindex:i%13===0?true:i%2===0?null:false}));
 const client={from(table){assert.equal(table,'blog_posts');const filters={};let limit;
 const q={select(value){assert.equal(value,'id,slug,published_at,updated_at');return q;},eq(k,v){filters[k]=v;return q;},not(k,op,v){assert.deepEqual([k,op,v],['published_at','is',null]);return q;},lte(k,v){filters.now=v;return q;},or(v){assert.equal(v,'noindex.is.null,noindex.eq.false');return q;},order(k,o){assert.equal(k,'id');assert.equal(o.ascending,true);return q;},limit(v){limit=v;return q;},gt(k,v){assert.equal(k,'id');filters.cursor=v;return q;},then(resolve,reject){const n=calls.length;calls.push(filters);if(n===failAt)return Promise.resolve({data:null,error:{message:'offline'}}).then(resolve,reject);
 const data=rows.filter(r=>r.status===filters.status && r.published_at!==null && r.published_at<=filters.now && r.noindex!==true && (stuck||!filters.cursor||r.id>filters.cursor)).slice(0,Math.min(limit,cap)).map(({id,slug,published_at,updated_at})=>({id,slug,published_at,updated_at}));
 return Promise.resolve({data,error:null}).then(resolve,reject);}};return q;}};
 const blog=runtime({'./supabase/public':{createPublicClient(){if(config)throw Error('missing');return client;}}})('src/lib/blog.ts');
 return {blog,calls,expected:rows.filter(r=>r.status==='published'&&r.published_at &&r.published_at<'2999'&&r.noindex!==true)};
}
test('sitemap keyset pagination includes all >100 eligible articles despite row cap and equal dates',async()=>{
 const f=fixture();const posts=await f.blog.getSitemapBlogPosts();
 assert.equal(posts.length,f.expected.length);assert.ok(posts.length>100);
 assert.deepEqual(Array.from(posts,p=>p.id),f.expected.map(p=>p.id));
 assert.equal(new Set(f.calls.map(c=>c.now)).size,1);
 assert.ok(f.calls.length>3);
 const sitemap=runtime({'@/lib/blog':{getSitemapBlogPosts:async()=>posts}})('src/app/sitemap.ts');
 const entries=await sitemap.default();assert.equal(entries.length,posts.length+3);
 assert.ok(entries.every(e=>e.url.startsWith('https://www.hisbo.in/')));
 assert.ok(entries.every(e=>!e.url.includes('/overview')));
});
for(const failAt of [0,2])test('sitemap fails instead of returning partial data on query failure '+failAt,async()=>{
 const f=fixture({failAt});await assert.rejects(f.blog.getSitemapBlogPosts(),e=>e.name==='BlogDataError');
 const sitemap=runtime({'@/lib/blog':{getSitemapBlogPosts:f.blog.getSitemapBlogPosts}})('src/app/sitemap.ts');
 // Separate fixture because calls have already advanced.
 const broken=fixture({failAt:0});
 const failed=runtime({'@/lib/blog':{getSitemapBlogPosts:broken.blog.getSitemapBlogPosts}})('src/app/sitemap.ts');
 await assert.rejects(failed.default());assert.equal(sitemap.dynamic,'force-dynamic');
});
test('missing configuration and non-advancing pagination fail explicitly',async()=>{
 await assert.rejects(fixture({config:true}).blog.getSitemapBlogPosts(),e=>e.name==='BlogDataError');
 await assert.rejects(fixture({stuck:true}).blog.getSitemapBlogPosts(),e=>e.name==='BlogDataError');
});
test('empty sitemap succeeds and invalid dates are omitted instead of invented',async()=>{
 const empty=runtime({'@/lib/blog':{getSitemapBlogPosts:async()=>[]}})('src/app/sitemap.ts');
 assert.equal((await empty.default()).length,3);
 const page=runtime({'@/lib/blog':{getSitemapBlogPosts:async()=>[{slug:'invalid',updated_at:'bad',published_at:null},{slug:'fallback',updated_at:'bad',published_at:'2026-01-01'}]}})('src/app/sitemap.ts');
 const result=await page.default();assert.equal(result[0].lastModified,undefined);assert.equal(result[3].lastModified,undefined);assert.equal(result[4].lastModified.toISOString(),'2026-01-01T00:00:00.000Z');
});
test('private metadata does not leak into public blog; robots permits observing noindex',async()=>{
 const app=runtime({'@/components/app/AppLayout':{}})('src/app/(app)/layout.tsx');
 const auth=runtime({'./auth-reference.css':{},'@/components/auth/AuthSidebar':{},'@/components/auth/AuthSessionRedirect':{}})('src/app/(auth)/layout.tsx');
 assert.equal(app.metadata.robots.index,false);assert.equal(auth.metadata.robots.index,false);
 const blog=runtime({'@/components/app/AppLayout':{}})('src/app/(marketing)/blog/layout.tsx');assert.equal(blog.metadata,undefined);
 const robots=runtime()('src/app/robots.ts').default();assert.equal(robots.rules[0].allow,'/');assert.equal(robots.rules[0].disallow.length,1);
 const config=(await import('../next.config.mjs')).default;
 const callback=(await config.headers()).find(h=>h.source==='/auth/callback');assert.equal(callback.headers[0].value,'noindex, nofollow');
});
test('both JSON-LD emitters use safe serializer',()=>{
 for(const path of ['src/app/(marketing)/page.tsx','src/app/(marketing)/blog/[slug]/page.tsx']){
  const source=fs.readFileSync(path,'utf8');assert.match(source,/__html: serializeJsonLd\(/);assert.doesNotMatch(source,/__html: JSON.stringify/);
 }
});

test('article metadata and rendered JSON-LD agree on encoded production URL',async()=>{
 const post={id:'one',slug:'money / habits',title:'</script><script>alert(1)</script>',excerpt:'<unsafe>',content:'body',published_at:'2026-01-01',updated_at:'2026-01-02'};
 const page=runtime({
  '@/lib/blog':{getBlogPostBySlug:async()=>post,getBlogCategories:async()=>[],getRelatedBlogPosts:async()=>[],blogTimestampMeta:()=>({}),safeBlogImage:()=>''},
  '@/lib/markdown':{renderMarkdown:()=>'<p>Safe article</p>'},
 })('src/app/(marketing)/blog/[slug]/page.tsx');
 const props={params:Promise.resolve({slug:post.slug})};
 const metadata=await page.generateMetadata(props);
 assert.equal(metadata.alternates.canonical,seo.blogUrl(post.slug));
 assert.equal(metadata.openGraph.url,metadata.alternates.canonical);
 const {renderToStaticMarkup}=require('react-dom/server');
 const html=renderToStaticMarkup(await page.default(props));
 const scripts=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);
 const schema=JSON.parse(scripts[0][1]);
 assert.equal(schema.headline,post.title);assert.equal(schema.mainEntityOfPage['@id'],metadata.alternates.canonical);
 assert.equal(html.includes('<script>alert(1)</script>'),false);
 assert.ok(html.includes('<p>Safe article</p>'));
});

test('AdSense script requires separate advertising consent and remains blog-only', () => {
  for (const pathname of ['/blog', '/blog/article', '/', '/overview', '/budgets', '/savings', '/login', '/signup', '/blogger']) {
    for (const advertisingConsent of [false, true]) {
      const load = runtime({
        'next/script': { default: 'script' },
        'next/navigation': { usePathname: () => pathname },
        'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
      }, { window: { navigator: {} } });
      const AdSense = load('src/components/blog/AdSenseScript.tsx').default;
      assert.equal(AdSense({}), null, 'Verification alone never opts a visitor into advertising');
      const tree = AdSense({ advertisingConsent });
      const permitted = advertisingConsent && (pathname === '/blog' || pathname.startsWith('/blog/'));
      if (!permitted) { assert.equal(tree, null); continue; }
      assert.equal(tree.props.id, 'hisbo-adsense');
      assert.equal(tree.props.src, 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6490828357850980');
      assert.equal(tree.props.crossOrigin, 'anonymous');
      assert.equal(tree.props.async, true);
      assert.equal(tree.props.strategy, 'afterInteractive');
    }
  }
});

test('AdSense does not override browser privacy opt-outs', () => {
  for (const navigator of [{ globalPrivacyControl: true }, { doNotTrack: '1' }, { doNotTrack: 'yes' }]) {
    const load = runtime({
      'next/script': {}, 'next/navigation': { usePathname: () => '/blog' },
    }, { window: { navigator } });
    assert.equal(load('src/components/blog/AdSenseScript.tsx').default({ advertisingConsent: true }), null);
  }
});

test('root AdSense verification metadata preserves existing site metadata and providers', () => {
  const layout = runtime({
    'next/font/google': { Bricolage_Grotesque: () => ({ variable: 'font' }) },
    './globals.css': {},
    '@/components/common/LegacyHashHandler': {},
    '@/components/common/NavigationFeedback': {},
    '@/components/common/AnalyticsProvider': {},
  })('src/app/layout.tsx');
  assert.equal(layout.metadata.other['google-adsense-account'], 'ca-pub-6490828357850980');
  assert.equal(layout.metadata.metadataBase.href, 'https://www.hisbo.in/');
  assert.equal(layout.metadata.manifest, '/manifest.json');
  assert.ok(layout.metadata.title.default.includes('Hisbo'));
});
