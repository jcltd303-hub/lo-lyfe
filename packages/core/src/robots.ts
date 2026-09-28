export interface RobotsRules { allowed:string[]; disallowed:string[]; crawlDelaySeconds?:number }
export function parseRobotsTxt(raw:string,userAgent='lo-lyfe-bot'):RobotsRules {
 if(raw.length>500000)throw new Error('robots.txt exceeds size limit');
 const allowed:string[]=[],disallowed:string[]=[];let applies=false,delay:number|undefined;
 for(const line of raw.split(/\r?\n/)){const clean=line.replace(/#.*/,'').trim();if(!clean)continue;const i=clean.indexOf(':');if(i<0)continue;const k=clean.slice(0,i).trim().toLowerCase(),v=clean.slice(i+1).trim();
 if(k==='user-agent')applies=v==='*'||userAgent.toLowerCase().includes(v.toLowerCase());else if(applies&&k==='allow'&&v)allowed.push(v);else if(applies&&k==='disallow'&&v)disallowed.push(v);else if(applies&&k==='crawl-delay'&&Number.isFinite(Number(v)))delay=Math.max(0,Number(v))}
 return {allowed,disallowed,...(delay===undefined?{}:{crawlDelaySeconds:delay})}
}
function match(path:string,rule:string){return rule.endsWith('$')?path===rule.slice(0,-1):path.startsWith(rule)}
export function isRobotsAllowed(url:string,rules:RobotsRules){const p=new URL(url).pathname;const a=rules.allowed.filter(r=>match(p,r)).sort((x,y)=>y.length-x.length)[0];const d=rules.disallowed.filter(r=>match(p,r)).sort((x,y)=>y.length-x.length)[0];return !d||Boolean(a&&a.length>=d.length)}
