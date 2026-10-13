// L'ancien débit visuel de 20% devient le nouveau repère à 100%.
// Conserver les taux historiques dans les sauvegardes évite de modifier les scènes.
export const FOG_REFERENCE_MAX = .20;
export function fogDisplayPercent(rate){
 const n=Number(rate);
 return Math.round(Math.min(FOG_REFERENCE_MAX,Math.max(0,Number.isFinite(n)?n:0))/FOG_REFERENCE_MAX*100);
}
export function fogStoredRate(percent){
 const n=Number(percent);
 return Math.min(100,Math.max(0,Number.isFinite(n)?n:0))/100*FOG_REFERENCE_MAX;
}
