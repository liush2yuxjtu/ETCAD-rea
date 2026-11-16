// Independent pattern geometry. All stored coordinates and lengths are millimetres.
export const clone = value => structuredClone(value);
export const round = (value, places = 1) => Number(value.toFixed(places));
export const defaults = { chest: 880, waist: 720, length: 580, shoulder: 380, ease: 80 };
export const ranges = { chest: [600, 1600], waist: [500, 1500], length: [250, 1400], shoulder: [260, 600], ease: [0, 300] };
export const uid = () => globalThis.crypto.randomUUID();
export const escapeXML = value => String(value).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

export function validateMeasurements(m) {
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (typeof m[key] !== 'number' || !Number.isFinite(m[key]) || m[key] < min || m[key] > max) throw new Error(`尺寸超出范围：${key}（${min / 10}–${max / 10} cm）`);
  }
  if (m.waist > m.chest + m.ease + 300) throw new Error('腰围与胸围相差过大，请核对尺寸');
}

export function draftPieces(template, m) {
  validateMeasurements(m);
  return ['front', 'back'].map((id, i) => {
    const w = (m.chest + m.ease) / 4, waist = (m.waist + m.ease) / 4;
    const neck = m.chest / 12, depth = i ? 26 : 85, arm = m.chest / 6 + 65;
    const nodes = template === 'skirt' ? [
      { x: 0, y: 12 }, { x: waist, y: 0, cx: waist * .5, cy: 0 },
      { x: w + 30, y: m.length }, { x: 0, y: m.length },
    ] : [
      { x: 0, y: depth }, { x: neck, y: 0, cx: neck * .92, cy: depth },
      { x: m.shoulder / 2, y: 28 },
      { x: w, y: arm, cx: m.shoulder / 2 - 24, cy: arm - 10 },
      { x: waist, y: m.length }, { x: 0, y: m.length },
    ];
    return { id, name: i ? '后片' : '前片', material: '主面料', quantity: 2, seamAllowance: 10, nodes, notches: [], grain: { x: w * .5, y1: m.length * .4, y2: m.length * .72 } };
  });
}

export function createProject({ name = '日常 · 无袖上衣', styleNo = 'ET-001', size = '160/84A', template = 'bodice', measurements = defaults } = {}) {
  if (!['bodice', 'skirt'].includes(template)) throw new Error('未知基础版');
  const pieces = draftPieces(template, measurements);
  return { schemaVersion: 1, id: uid(), name, styleNo, size, template, measurements: clone(measurements), pieces, revision: 1, updatedAt: new Date().toISOString(), review: { status: 'draft', comments: [], baseline: clone(pieces), submittedRevision: null, approvedRevision: null } };
}

export function editProject(project, change) {
  if (project.review.status !== 'draft') throw new Error('当前版本已锁定，请先退回修改');
  const next = clone(project);
  change(next);
  next.revision++;
  next.updatedAt = new Date().toISOString();
  next.review.approvedRevision = null;
  return next;
}

export function changeMeasurements(project, measurements) {
  const before = draftPieces(project.template, project.measurements);
  const after = draftPieces(project.template, measurements);
  return editProject(project, next => {
    next.measurements = clone(measurements);
    next.pieces.forEach(piece => {
      const old = before.find(p => p.id === piece.id), fresh = after.find(p => p.id === piece.id);
      // Preserve each manual point/control adjustment when the base is regenerated.
      piece.nodes = piece.nodes.map((node, index) => {
        const moved = { ...fresh.nodes[index] };
        for (const k of ['x', 'y', 'cx', 'cy']) if (node[k] !== undefined && old.nodes[index][k] !== undefined) moved[k] += node[k] - old.nodes[index][k];
        return moved;
      });
      piece.grain = clone(fresh.grain);
    });
  });
}

export function pathData(piece) {
  return piece.nodes.map((n, i) => i === 0 ? `M ${n.x} ${n.y}` : n.cx !== undefined ? `Q ${n.cx} ${n.cy} ${n.x} ${n.y}` : `L ${n.x} ${n.y}`).join(' ') + ' Z';
}

export function edgePoint(piece, edge, t) {
  const a = piece.nodes[edge], b = piece.nodes[(edge + 1) % piece.nodes.length];
  if (b.cx === undefined) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  return { x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * b.cx + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * b.cy + t * t * b.y };
}

export function flatten(piece, steps = 24) {
  return piece.nodes.flatMap((_, edge) => Array.from({ length: piece.nodes[(edge + 1) % piece.nodes.length].cx !== undefined ? steps : 1 }, (__, j) => edgePoint(piece, edge, j / (piece.nodes[(edge + 1) % piece.nodes.length].cx !== undefined ? steps : 1))));
}
export function edgeLength(piece, edge) {
  let len = 0, previous = edgePoint(piece, edge, 0);
  for (let i = 1; i <= 64; i++) { const p = edgePoint(piece, edge, i / 64); len += Math.hypot(p.x - previous.x, p.y - previous.y); previous = p; }
  return len;
}
export const perimeter = piece => piece.nodes.reduce((sum, _, i) => sum + edgeLength(piece, i), 0);
const signedArea = points => points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y; }, 0) / 2;
export const area = piece => Math.abs(signedArea(flatten(piece)));
export function bounds(piece) {
  const pts = flatten(piece);
  const minX = Math.min(...pts.map(p => p.x)), minY = Math.min(...pts.map(p => p.y));
  return { minX, minY, width: Math.max(...pts.map(p => p.x)) - minX, height: Math.max(...pts.map(p => p.y)) - minY };
}
export function hasCrossing(piece) {
  const pts = flatten(piece);
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const on = (a, b, c) => Math.abs(cross(a, b, c)) < 1e-7 && c.x >= Math.min(a.x, b.x) - 1e-7 && c.x <= Math.max(a.x, b.x) + 1e-7 && c.y >= Math.min(a.y, b.y) - 1e-7 && c.y <= Math.max(a.y, b.y) + 1e-7;
  for (let i = 0; i < pts.length; i++) for (let j = i + 2; j < pts.length; j++) {
    if (i === 0 && j === pts.length - 1) continue;
    const a = pts[i], b = pts[(i + 1) % pts.length], c = pts[j], d = pts[(j + 1) % pts.length];
    if (cross(a, b, c) * cross(a, b, d) < -1e-6 && cross(c, d, a) * cross(c, d, b) < -1e-6) return true;
    if (on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b)) return true;
  }
  return false;
}

// Offset the sampled stitch polygon. Curves are approximated; miters are limited.
export function cuttingPoints(piece) {
  const pts = flatten(piece), direction = signedArea(pts) >= 0 ? 1 : -1, distance = piece.seamAllowance;
  return pts.map((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
    const normal = (u, v) => { const l = Math.hypot(v.x - u.x, v.y - u.y) || 1; return { x: direction * (v.y - u.y) / l, y: direction * (u.x - v.x) / l }; };
    const n1 = normal(a, p), n2 = normal(p, b), denom = 1 + n1.x * n2.x + n1.y * n2.y;
    const scale = Math.min(distance / Math.max(denom, .1), distance * 4);
    return { x: p.x + (n1.x + n2.x) * scale, y: p.y + (n1.y + n2.y) * scale };
  });
}

export function checkProject(project) {
  const checks = [];
  const add = (id, level, title, detail) => checks.push({ id, level, title, detail });
  add('metadata', project.name.trim() && project.styleNo.trim() ? 'pass' : 'error', '款式信息', `${project.styleNo || '未填写款号'} · ${project.size}`);
  project.pieces.forEach(piece => {
    const valid = area(piece) > 100 && !hasCrossing(piece) && piece.nodes.every((_, i) => edgeLength(piece, i) > .1);
    add(`geometry-${piece.id}`, valid ? 'pass' : 'error', `${piece.name} · 轮廓检查`, valid ? '轮廓闭合，无交叉或零长度边' : '发现交叉、重合点或面积过小，请调整控制点');
    add(`seam-${piece.id}`, piece.seamAllowance > 0 && piece.seamAllowance <= 30 ? 'pass' : 'warning', `${piece.name} · 缝份`, `${piece.seamAllowance / 10} cm${piece.seamAllowance === 0 ? '，尚未设置缝份' : '（统一缝份）'}`);
    add(`notch-${piece.id}`, piece.notches.length ? 'pass' : 'warning', `${piece.name} · 刀口`, piece.notches.length ? `${piece.notches.length} 个定位刀口` : '尚未添加，请人工确认对位要求');
  });
  const [front, back] = project.pieces;
  const edge = project.template === 'bodice' ? 3 : 1;
  const delta = Math.abs(edgeLength(front, edge) - edgeLength(back, edge));
  add('side-seams', delta <= 3 ? 'pass' : 'error', '前后片侧缝核对', `差值 ${round(delta)} mm · 容差 3 mm`);
  return checks;
}

export function submitReview(project) {
  if (project.review.status !== 'draft') throw new Error('当前版本已送审');
  if (checkProject(project).some(c => c.level === 'error')) throw new Error('请先修复检查中的错误');
  const next = clone(project);
  next.review.status = 'review'; next.review.submittedRevision = next.revision;
  return next;
}
export function approveReview(project) {
  if (project.review.status !== 'review' || project.review.submittedRevision !== project.revision) throw new Error('请先送审当前版本');
  if (checkProject(project).some(c => c.level === 'error') || project.review.comments.some(c => !c.resolved)) throw new Error('请完成检查并解决所有审版意见');
  const next = clone(project);
  next.review.status = 'approved'; next.review.approvedRevision = project.revision;
  return next;
}
export function reopenProject(project) {
  const next = clone(project); next.review.baseline = clone(project.pieces);
  next.review.status = 'draft'; next.review.approvedRevision = null; next.review.submittedRevision = null;
  return next;
}

// Imports are data-only: bound counts, coordinates, strings and expected structure.
export function parseProject(text) {
  if (text.length > 2_000_000) throw new Error('文件过大（上限 2 MB）');
  let p;
  try { p = JSON.parse(text); } catch { throw new Error('无法读取 JSON 文件'); }
  const str = (v, max = 200) => typeof v === 'string' && v.length > 0 && v.length <= max;
  const num = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 10000;
  const bad = () => { throw new Error('文件结构不正确，请导入 ETCAD-rea 导出的 JSON'); };
  if (!p || p.schemaVersion !== 1 || !str(p.id) || !str(p.name) || !str(p.styleNo) || !str(p.size) || !['bodice', 'skirt'].includes(p.template) || !Number.isSafeInteger(p.revision) || p.revision < 1) bad();
  validateMeasurements(p.measurements || {});
  const validPieces = pieces => Array.isArray(pieces) && pieces.length === 2 && pieces.every((piece, i) => {
    if (!piece || piece.id !== ['front', 'back'][i] || !str(piece.name) || !str(piece.material) || !Number.isInteger(piece.quantity) || piece.quantity < 1 || piece.quantity > 100 || !num(piece.seamAllowance) || piece.seamAllowance < 0 || piece.seamAllowance > 30) return false;
    if (!Array.isArray(piece.nodes) || piece.nodes.length !== (p.template === 'bodice' ? 6 : 4) || !piece.nodes.every((n, j) => n && num(n.x) && num(n.y) && ((n.cx === undefined && n.cy === undefined) || (j > 0 && num(n.cx) && num(n.cy))))) return false;
    if (!piece.grain || !['x', 'y1', 'y2'].every(k => num(piece.grain[k]))) return false;
    return Array.isArray(piece.notches) && piece.notches.length <= 100 && piece.notches.every(n => Number.isInteger(n.edge) && n.edge >= 0 && n.edge < piece.nodes.length && num(n.t) && n.t >= 0 && n.t <= 1);
  });
  if (!validPieces(p.pieces) || !p.review || !['draft', 'review', 'approved'].includes(p.review.status) || !validPieces(p.review.baseline) || !Array.isArray(p.review.comments) || p.review.comments.length > 500) bad();
  if (!p.review.comments.every(c => c && str(c.id) && ['front', 'back'].includes(c.pieceId) && str(c.text, 1000) && typeof c.resolved === 'boolean')) bad();
  if (p.review.status !== 'draft' && p.review.submittedRevision !== p.revision) bad();
  if (p.review.status === 'approved' && (p.review.approvedRevision !== p.revision || p.review.comments.some(c => !c.resolved) || checkProject(p).some(c => c.level === 'error'))) bad();
  return p;
}

export function exportSVG(project) {
  const boxes = project.pieces.map(bounds), margin = 45;
  const width = boxes.reduce((sum, b) => sum + b.width + margin * 2, 0), height = Math.max(...boxes.map(b => b.height)) + 130;
  let offset = 0;
  const body = project.pieces.map((piece, i) => {
    const b = boxes[i], x = offset + margin - b.minX, y = 70 - b.minY;
    offset += b.width + margin * 2;
    const g = piece.grain;
    return `<g transform="translate(${x},${y})"><polygon points="${cuttingPoints(piece).map(p => `${round(p.x, 3)},${round(p.y, 3)}`).join(' ')}" fill="none" stroke="#172a2a" stroke-width=".4"/><path d="${pathData(piece)}" fill="none" stroke="#172a2a" stroke-width=".35" stroke-dasharray="3 2"/><line x1="${g.x}" y1="${g.y1}" x2="${g.x}" y2="${g.y2}" stroke="#172a2a" stroke-width=".4" marker-end="url(#arrow)"/>${piece.notches.map(n => { const p = edgePoint(piece, n.edge, n.t); return `<path d="M${p.x - 3} ${p.y - 4}l3 4 3 -4" fill="none" stroke="#172a2a" stroke-width=".5"/>`; }).join('')}<text x="${g.x}" y="${g.y1 - 20}" text-anchor="middle" font-size="5">${escapeXML(piece.name)} · ${escapeXML(project.size)} · 裁 ${piece.quantity} 片</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><title>${escapeXML(project.name)}</title><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0L4 4 0 8" fill="none" stroke="#172a2a"/></marker></defs><text x="25" y="20" font-size="7">${escapeXML(project.name)} · ${escapeXML(project.styleNo)} · V${project.revision}</text><text x="25" y="34" font-size="4">实线：裁剪线 / 虚线：缝合线 · 100% 比例 · 统一缝份 ${project.pieces[0].seamAllowance} mm · 曲线缝份为采样近似</text>${body}<path d="M25 ${height - 20}h100m-100 -4v8m100 -8v8" stroke="black" fill="none"/><text x="25" y="${height - 25}" font-size="4">校准线 100 mm · 打印后请实测</text></svg>`;
}
