export interface EvalCase{query:string;relevantIds:string[]}
export function precisionAtK(rankedIds:string[],relevantIds:string[],k=10){if(k<1)throw new Error('k must be positive');const relevant=new Set(relevantIds);return rankedIds.slice(0,k).filter(id=>relevant.has(id)).length/k}
export function evaluatePrecisionAt10(cases:EvalCase[],rank:(query:string)=>string[]){if(!cases.length)return 0;return cases.reduce((sum,c)=>sum+precisionAtK(rank(c.query),c.relevantIds,10),0)/cases.length}
