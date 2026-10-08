import assert from 'node:assert/strict';
import {FOG_REFERENCE_MAX,fogDisplayPercent,fogStoredRate} from './fog-scale.mjs';
assert.equal(FOG_REFERENCE_MAX,.20);
for(const [legacy,display] of [[0,0],[.05,25],[.06,30],[.07,35],[.10,50],[.15,75],[.20,100]]) {
 assert.equal(fogDisplayPercent(legacy),display);
 assert.ok(Math.abs(fogStoredRate(display)-legacy)<1e-12);
}
assert.equal(fogDisplayPercent(.4),100);
assert.equal(fogStoredRate(150),.20);
assert.equal(fogStoredRate(-1),0);
console.log('Échelle du brouillard OK : 20%=100%, 7%=35%, Bleu océan 6%=30%.');
