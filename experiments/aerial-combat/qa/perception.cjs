'use strict';
// Reuse the project's local visual agent; pixel metrics are not artistic approval.
const fs=require('node:fs');
const {inspectFrame}=require('../../../tools/visual-lab/agent-perception.cjs');
const samples=JSON.parse(fs.readFileSync(0,'utf8'));
console.log(JSON.stringify(samples.map(s=>({file:s.file,...inspectFrame(Buffer.from(s.rgb,'base64'),128,72)}))));
