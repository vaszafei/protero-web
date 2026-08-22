import { chromium } from 'playwright'
import fs from 'node:fs'
const BASE=process.env.PROTERO_BASE||'http://localhost:3000'
const TOKEN=process.env.PROTERO_SESSION
if(!TOKEN){console.error('set PROTERO_SESSION — see tools/audit/README.md');process.exit(1)}
const paths=process.argv.slice(2)
if(!paths.length){console.error('usage: node check.mjs /path [/path...]');process.exit(1)}
const b=await chromium.launch()
const ctx=await b.newContext({viewport:{width:1440,height:900}})
await ctx.addCookies([{name:'session_id',value:TOKEN,domain:'localhost',path:'/'}])
for(const path of paths){
  const name=path.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'root'
  const p=await ctx.newPage()
  const errs=[],net=[]
  p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text().slice(0,200))})
  p.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,200)))
  p.on('response',r=>{if(r.status()>=400)net.push(`${r.status()} ${r.url().replace(BASE,'').slice(0,110)}`)})
  await p.goto(BASE+path,{waitUntil:'networkidle',timeout:45000}).catch(e=>errs.push('NAV '+e))
  await p.waitForTimeout(2200)
  const m=await p.evaluate(()=>{const de=document.documentElement
    return {len:(document.body.innerText||'').trim().length,
            head:(document.body.innerText||'').trim().slice(0,300),
            hscroll:de.scrollWidth>de.clientWidth+2}})
  console.log(`\n### ${path}   text=${m.len}${m.hscroll?'  H-SCROLL!':''}`)
  console.log('   '+JSON.stringify(m.head))
  ;[...new Set(errs)].slice(0,6).forEach(e=>console.log('   ERR '+e))
  ;[...new Set(net)].slice(0,6).forEach(e=>console.log('   NET '+e))
  await p.screenshot({path:`shots/chk-${name}.png`,fullPage:true}).catch(()=>{})
  await p.close()
}
await b.close()
