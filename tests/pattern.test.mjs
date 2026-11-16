import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, defaults, draftPieces, changeMeasurements, editProject, edgeLength, edgePoint, area, hasCrossing, cuttingPoints, checkProject, parseProject, submitReview, approveReview, reopenProject, exportSVG, clone } from '../src/pattern.js';

test('both base templates create usable geometry with matching side seams', () => {
  for (const template of ['bodice','skirt']) {
    const p = createProject({template});
    assert.equal(p.pieces.length,2);
    for (const piece of p.pieces) { assert.ok(area(piece)>10000); assert.equal(hasCrossing(piece),false); }
    assert.equal(checkProject(p).filter(c=>c.level==='error').length,0);
    assert.deepEqual(parseProject(JSON.stringify(p)),p);
  }
});
test('measurement changes drive front and back while retaining manual point and curve edits',()=>{
  const p=editProject(createProject(),p=>{p.pieces[0].nodes[4].x+=7;p.pieces[0].nodes[3].cx+=3;p.pieces[0].notches.push({edge:3,t:.5});});
  const m={...defaults,chest:1000,length:650},next=changeMeasurements(p,m),base=draftPieces('bodice',m);
  assert.equal(next.pieces[0].nodes[4].x,base[0].nodes[4].x+7);
  assert.equal(next.pieces[0].nodes[3].cx,base[0].nodes[3].cx+3);
  assert.equal(next.pieces[1].nodes[3].x,270);
  assert.deepEqual(next.pieces[0].notches,[{edge:3,t:.5}]);
  assert.equal(p.measurements.length,580);
});
test('geometric lengths use curves rather than their endpoint chord',()=>{
  const p={nodes:[{x:0,y:0},{x:100,y:0,cx:50,cy:100},{x:100,y:100}]};
  assert.deepEqual(edgePoint(p,0,.5),{x:50,y:50});
  assert.ok(Math.abs(edgeLength(p,0)-147.894)<.03);
});
test('seam polygon offsets a known square by the requested millimetres',()=>{
  const p={seamAllowance:10,nodes:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]};
  assert.deepEqual(cuttingPoints(p),[{x:-10,y:-10},{x:110,y:-10},{x:110,y:110},{x:-10,y:110}]);
});
test('crossing contours and mismatched side seams fail the public review gate',()=>{
  const crossing={nodes:[{x:0,y:0},{x:100,y:100},{x:0,y:100},{x:100,y:0}]};
  assert.equal(hasCrossing(crossing),true);
  assert.equal(hasCrossing({nodes:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:50,y:0},{x:0,y:100}]}),true);
  const p=editProject(createProject(),p=>p.pieces[0].nodes[4].y+=50);
  assert.equal(checkProject(p).find(c=>c.id==='side-seams').level,'error');
  assert.throws(()=>submitReview(p),/错误/);
});
test('review freezes geometry, blocks unresolved findings and approves the exact revision',()=>{
  let p=submitReview(createProject());
  assert.throws(()=>editProject(p,()=>{}),/锁定/);
  p.review.comments.push({id:'finding',pieceId:'front',text:'请核对',resolved:false});
  assert.throws(()=>approveReview(p),/意见/);
  p.review.comments[0].resolved=true;p=approveReview(p);
  assert.equal(p.review.approvedRevision,p.revision);
  assert.deepEqual(parseProject(JSON.stringify(p)),p);
  assert.throws(()=>changeMeasurements(p,defaults),/锁定/);
  const reopened=reopenProject(p);assert.equal(reopened.review.status,'draft');assert.equal(reopened.review.approvedRevision,null);
  const changed=editProject(reopened,p=>p.pieces[0].nodes[1].y+=4);
  assert.equal(changed.revision,p.revision+1);
  assert.deepEqual(changed.review.baseline,p.pieces);
});
test('import rejects corrupt data, out-of-range numbers and stale approved state',()=>{
  assert.throws(()=>parseProject('{'),/JSON/);
  for(const corrupt of [
    p=>p.measurements.chest=-1,
    p=>p.pieces[0].nodes[0].x='80',
    p=>p.pieces[0].quantity=0,
    p=>p.pieces[0].notches.push({edge:99,t:.5}),
    p=>p.review.comments.push({id:'x',pieceId:'missing',text:'oops',resolved:false}),
    p=>p.review.baseline=null,
    p=>{p.review.status='approved';p.review.approvedRevision=1;p.review.submittedRevision=9;},
  ]){const p=clone(createProject());corrupt(p);assert.throws(()=>parseProject(JSON.stringify(p)));}
});
test('SVG is physically sized, contains a 100 mm calibration line, and escapes user content',()=>{
  const p=createProject({name:'<script>alert(1)</script>',styleNo:'"onload="bad'}),svg=exportSVG(p);
  assert.ok(svg.includes('mm" height="'));
  assert.ok(svg.includes('校准线 100 mm'));
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&quot;onload='));
});
