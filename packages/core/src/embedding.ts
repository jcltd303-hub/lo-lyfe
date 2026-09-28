function tokens(value:string){return value.toLowerCase().match(/[a-z0-9]{3,}/g)??[]}
function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
/** Deterministic privacy-safe opportunity-text feature embedding; no user profile data is used. */
export function textFeatureEmbedding(value:string,dimensions=32):number[]{const v=Array<number>(dimensions).fill(0);for(const t of tokens(value)){const h=hash(t);v[h%dimensions]+=(h&0x100?1:-1)}const n=Math.hypot(...v)||1;return v.map(x=>x/n)}
export function cosineSimilarity(a:number[],b:number[]){if(a.length!==b.length)throw new Error('Embedding dimensions differ');return a.reduce((s,x,i)=>s+x*b[i],0)}
