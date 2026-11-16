import { createProject, clone, round, uid, escapeXML as esc, pathData, flatten, cuttingPoints, bounds, area, perimeter, edgeLength, edgePoint, editProject, changeMeasurements, checkProject, submitReview, approveReview, reopenProject, parseProject, exportSVG, defaults, ranges } from './pattern.js';

const $ = selector => document.querySelector(selector);
const storeKey = 'etcad-rea.projects.v1';
const icons = {
  plus: '<path d="M12 5v14M5 12h14"/>', chevron: '<path d="m9 5 7 7-7 7"/>', down: '<path d="m6 9 6 6 6-6"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/>', save: '<path d="M4 4h13l3 3v13H4zM8 4v6h8V4M8 20v-6h8v6"/>',
  export: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/>', import: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/>',
  select: '<path d="m6 3 13 9-7 1-3 7z"/>', node: '<path d="m5 18 5-12 9 7M5 18l14-5"/><circle cx="5" cy="18" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="19" cy="13" r="2"/>',
  ruler: '<path d="m3 16 13-13 5 5L8 21zM7 12l3 3m0-6 3 3m0-6 3 3"/>', notch: '<path d="M3 6h5l4 7 4-7h5M3 18h18"/>',
  undo: '<path d="M8 5 3 10l5 5M3 10h10a6 6 0 0 1 0 12"/>', redo: '<path d="m16 5 5 5-5 5M21 10h-10a6 6 0 0 0 0 12"/>',
  grid: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h16M12 4v16"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
  check: '<path d="m5 12 4 4L19 6"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3v2M12 17h.01"/>',
  folder: '<path d="M3 7V4h6l3 3h9v13H3z"/>', lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>', minus: '<path d="M5 12h14"/>', fit: '<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>', layers: '<path d="m12 3 10 6-10 6L2 9zM2 13l10 6 10-6M2 17l10 6 10-6"/>', comment: '<path d="M4 4h16v13H9l-5 4zM8 8h8M8 12h5"/>',
};
const icon = key => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[key] || icons.file}</svg>`;
let projects, project, loadWarning = '';
try {
  const saved = localStorage.getItem(storeKey);
  if (saved) {
    const data = JSON.parse(saved);
    if (!Array.isArray(data.projects) || !data.projects.length) throw Error('无可读取项目');
    projects = data.projects.map(p => parseProject(JSON.stringify(p)));
    project = projects.find(p => p.id === data.activeId) || projects[0];
  }
} catch { loadWarning = '本地数据无法读取，原数据尚未覆盖。请先通过导入恢复备份。'; }
if (!project) { project = createProject(); projects = [project]; }
let selected = 'front', nodeIndex = null, selectedEdge = 3, tab = 'properties', mode = 'design', tool = 'select';
let zoom = 1, grid = true, showSeam = true, showBaseline = false, snap = true, measured = [], drag = null;
let undoStack = [], redoStack = [], saveError = '', toastTimer;
const piece = () => project.pieces.find(p => p.id === selected);
const locked = () => project.review.status !== 'draft';
const statusName = () => ({ draft: '编辑中', review: '待审版', approved: '已确认' })[project.review.status];
const cm = value => round(value / 10, 2);
const stagePosition = index => ({ x: 105 + index * 365, y: 95 });
function notify(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4000); }
function save(silent = false) {
  projects = projects.map(p => p.id === project.id ? clone(project) : p);
  try { localStorage.setItem(storeKey, JSON.stringify({ activeId: project.id, projects })); saveError = ''; if (!silent) notify('纸样已保存到此浏览器'); }
  catch { saveError = '保存失败，请导出 JSON 备份'; if (!silent) notify(saveError); }
}
function setProject(next, { history = false } = {}) {
  if (history) { undoStack.push(clone(project)); if (undoStack.length > 80) undoStack.shift(); redoStack = []; }
  project = next; save(true); render();
}
function edit(change) { try { setProject(editProject(project, change), { history: true }); } catch (e) { notify(e.message); } }
function guard(fn) { try { fn(); } catch (e) { notify(e.message); } }
function restoreHistory(direction) {
  if (locked()) return;
  const source = direction === 'undo' ? undoStack : redoStack, target = direction === 'undo' ? redoStack : undoStack;
  if (!source.length) return;
  target.push(clone(project));
  const old = source.pop(); old.revision = project.revision + 1; old.updatedAt = new Date().toISOString();
  // Review findings are records, not geometry undo state.
  old.review = clone(project.review); old.review.approvedRevision = null;
  setProject(old);
}
function field(label, name, value, { number = false, unit = '', disabled = locked(), min, max, step = '.1', required = true } = {}) {
  return `<label class="field">${label}<div class="input-unit"><input name="${name}" aria-label="${label}" value="${esc(value)}" ${number ? `type="number" step="${step}" ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''}` : 'maxlength="80"'} ${disabled ? 'disabled' : ''} ${required ? 'required' : ''}>${unit ? `<span>${unit}</span>` : ''}</div></label>`;
}
function thumb(p) { const b = bounds(p); return `<svg class="piece-thumb" viewBox="${b.minX - 20} ${b.minY - 20} ${b.width + 40} ${b.height + 40}" aria-hidden="true"><path d="${pathData(p)}" fill="currentColor" fill-opacity=".06" stroke="currentColor" stroke-width="8"/></svg>`; }

function render() {
  const p = piece(), checks = checkProject(project), errorCount = checks.filter(c => c.level === 'error').length;
  $('#app').innerHTML = `
    <header class="topbar"><div class="row"><div class="brand"><span class="brand-mark">E</span><div>ETCAD<span class="brand-sub">REA · 纸样工作台</span></div></div><nav class="global-nav" aria-label="工作区"><button class="active" data-action="design">纸样工作台</button><button data-action="library">我的版型库</button><button data-action="evidence">研究与证据 ${icon('export')}</button></nav></div><div class="row"><button class="mobile-library quiet" data-action="library" aria-label="我的版型库">${icon('folder')}</button><button class="quiet" data-action="help">${icon('help')} 使用指南</button><span class="separator"></span><span class="avatar" title="本地工作区">本</span></div></header>
    <section class="projectbar"><div><div class="breadcrumb">我的工作区 <span style="margin:0 7px">/</span> 纸样设计 <span style="margin:0 7px">/</span> ${esc(project.styleNo)}</div><div class="row"><div class="project-title">${esc(project.name)}</div><span class="badge ${project.review.status}"><i class="dot"></i>${statusName()}</span><span class="mono muted small">V${project.revision}</span></div></div><div class="project-actions"><span class="saved ${saveError ? 'save-failed' : ''}">${saveError || '本地工作区 · 可导出备份'}</span><button class="secondary" data-action="new">${icon('plus')} 新建纸样</button><button class="secondary" data-action="export">${icon('export')} 导出</button><button class="primary" data-action="review">${icon('check')} 审版检查${errorCount ? ` · ${errorCount}` : ''}</button></div></section>
    <main class="workspace"><aside class="sidebar" aria-label="裁片列表"><div class="sidebar-heading row spread"><span>裁片 <span class="muted mono small">${project.pieces.length.toString().padStart(2, '0')}</span></span>${icon('layers')}</div><div class="piece-list">${project.pieces.map((part, i) => `<button class="piece-card ${part.id === selected ? 'active' : ''}" data-piece="${part.id}" aria-pressed="${part.id === selected}">${thumb(part)}<span><strong>${esc(part.name)}</strong><small>${esc(part.material)} · 裁 ${part.quantity} 片</small></span><span class="piece-index mono">0${i + 1}</span></button>`).join('')}</div><div class="side-divider"></div><div class="project-summary"><div class="eyebrow" style="margin-bottom:12px">PROJECT INFO</div><div class="row"><span class="muted">款号</span><span class="mono">${esc(project.styleNo)}</span></div><div class="row"><span class="muted">号型</span><span>${esc(project.size)}</span></div><div class="row"><span class="muted">基础版</span><span>${project.template === 'skirt' ? 'A 字裙' : '无袖上衣'}</span></div><div class="row"><span class="muted">尺寸单位</span><span class="mono">cm</span></div></div><div class="side-bottom"><div class="tip-card"><strong>${icon('help')} 一点制版小提示</strong>先确认人体尺寸与松量，<br>再调整轮廓、设置刀口。<br>送审前记得核对前后侧缝。</div><a href="/docs/research/ETCAD-EVIDENCE.md" target="_blank" rel="noopener">独立实现 · 查看功能来源 ↗</a></div></aside>
    <section class="center" aria-label="纸样画布"><div class="toolbar"><div class="tool-group">${[['select','选择','V'],['node','编辑点','A'],['ruler','测量','M'],['notch','刀口','N']].map(([key,label,keybind]) => `<button class="tool ${tool === key ? 'active' : ''}" data-tool="${key}" aria-label="${label}" aria-pressed="${tool === key}" title="${label} (${keybind})" ${(locked() || mode === 'review') && ['node','notch'].includes(key) ? 'disabled' : ''}>${icon(key)}${label}<span class="keyboard">${keybind}</span></button>`).join('')}<span class="separator"></span><button class="tool" data-action="undo" aria-label="撤销" title="撤销 Ctrl+Z" ${locked() || !undoStack.length ? 'disabled' : ''}>${icon('undo')}</button><button class="tool" data-action="redo" aria-label="重做" title="重做 Ctrl+Shift+Z" ${locked() || !redoStack.length ? 'disabled' : ''}>${icon('redo')}</button></div><button class="tool ${grid ? 'active' : ''}" data-action="grid" aria-label="切换网格" title="切换网格">${icon('grid')}</button></div>${locked() ? `<div class="review-lock row">${icon('lock')} ${statusName()} · 当前版本只读，退回修改后可继续编辑</div>` : ''}<div class="canvas-wrap"><svg class="canvas" id="canvas" aria-label="二维纸样，使用右侧坐标输入也可精确编辑" role="group"></svg><div class="canvas-hint">${mode === 'review' ? '审版模式 · 核对尺寸与裁片信息' : ({ select: '选择裁片，或切换「编辑点」调整轮廓', node: '拖动实心点调整轮廓 · 空心点调整曲线', ruler: '依次点击两处，测量直线距离', notch: '点击裁片边线，在该位置添加刀口' })[tool]}</div><div id="measure-readout" class="measure-readout" ${measured.length !== 2 ? 'hidden' : ''}>${measured.length === 2 ? `两点距离 ${cm(Math.hypot(measured[1].x - measured[0].x, measured[1].y - measured[0].y))} cm` : ''}</div><div class="canvas-toolbar"><button data-action="zoom-out" aria-label="缩小">${icon('minus')}</button><span class="zoom mono">${Math.round(zoom * 100)}%</span><button data-action="zoom-in" aria-label="放大">${icon('plus')}</button><span class="separator"></span><button data-action="fit" aria-label="适合画布">${icon('fit')}</button></div><div class="canvas-legend"><span><i class="legend-line"></i>裁剪线</span><span><i class="legend-line dashed"></i>缝合线</span><span><i class="dot"></i>控制点</span></div></div></section>
    <aside class="inspector" aria-label="属性与审版"><div class="inspector-tabs"><button data-tab="properties" class="${mode === 'design' && tab === 'properties' ? 'active' : ''}">裁片属性</button><button data-tab="measurements" class="${mode === 'design' && tab === 'measurements' ? 'active' : ''}">尺寸表</button><button data-tab="review" class="${mode === 'review' ? 'active' : ''}">审版</button></div><div class="inspector-content">${mode === 'review' ? reviewPanel(checks) : tab === 'measurements' ? measurementPanel() : propertyPanel(p)}</div></aside></main>
    <footer class="footer"><div class="row"><span><i class="dot"></i> ${saveError ? '请导出备份' : '本地工作区'}</span><span>裁片 ${project.pieces.length} · 已选 ${esc(p.name)}</span><span>单位 cm / 内部精度 mm</span></div><div class="row"><span>${snap ? '1 mm 网格吸附' : '自由移动'}</span><span>二维基础版 · 试制后再生产</span></div></footer>`;
  renderCanvas();
  $('#canvas').addEventListener('pointerdown', pointerDown);
  $('#canvas').addEventListener('pointermove', pointerMove);
  $('#canvas').addEventListener('pointerup', pointerUp);
  $('#canvas').addEventListener('pointercancel', () => { drag = null; renderCanvas(); });
}

function propertyPanel(p) {
  const b = bounds(p), node = nodeIndex !== null ? p.nodes[nodeIndex] : null;
  return `<form id="piece-form"><section class="panel-section"><h2 class="section-title">基本信息 <span class="muted mono small">${p.id === 'front' ? '01' : '02'}</span></h2>${field('裁片名称','name',p.name)}${field('物料名称','material',p.material)}<div class="two-col">${field('裁片数量','quantity',p.quantity,{number:true,step:'1',min:1,max:100,unit:'片'})}${field('统一缝份','seamAllowance',cm(p.seamAllowance),{number:true,min:0,max:3,unit:'cm'})}</div><button type="submit" class="secondary wide small" ${locked() ? 'disabled' : ''}>应用裁片属性</button></section></form><section class="panel-section"><h2 class="section-title">裁片尺寸</h2><div class="metric-grid"><div><div class="metric-label">最大宽度</div><div class="metric-value mono">${cm(b.width)}<small>cm</small></div></div><div><div class="metric-label">最大长度</div><div class="metric-value mono">${cm(b.height)}<small>cm</small></div></div><div><div class="metric-label">净样周长</div><div class="metric-value mono">${cm(perimeter(p))}<small>cm</small></div></div><div><div class="metric-label">净样面积</div><div class="metric-value mono">${round(area(p) / 100)}<small>cm²</small></div></div></div></section><section class="panel-section"><h2 class="section-title">显示与辅助</h2><div class="stack"><label class="toggle"><input type="checkbox" name="seam" ${showSeam ? 'checked' : ''}> 显示缝份与裁剪线</label><label class="toggle"><input type="checkbox" name="baseline" ${showBaseline ? 'checked' : ''}> 叠加修改前参考版</label><label class="toggle"><input type="checkbox" name="snap" ${snap ? 'checked' : ''}> 吸附到 1 mm 网格</label></div></section><section class="panel-section"><h2 class="section-title">${node ? `控制点 P${nodeIndex + 1}` : '轮廓控制点'}</h2>${node ? `<form id="node-form"><div class="two-col">${field('X 坐标','x',cm(node.x),{number:true,min:-1000,max:1000,unit:'cm'})}${field('Y 坐标','y',cm(node.y),{number:true,min:-1000,max:1000,unit:'cm'})}</div>${node.cx !== undefined ? `<div class="two-col">${field('曲线控制 X','cx',cm(node.cx),{number:true,min:-1000,max:1000,unit:'cm'})}${field('曲线控制 Y','cy',cm(node.cy),{number:true,min:-1000,max:1000,unit:'cm'})}</div>` : ''}<button class="secondary wide small" ${locked() ? 'disabled' : ''}>应用坐标</button></form>` : '<p class="hint">切换「编辑点」，在画布选点。也可使用坐标输入精确调整。</p>'}</section><section class="panel-section"><h2 class="section-title">边长与定位刀口 <span class="muted small">${p.notches.length} 个</span></h2><div class="edge-list">${p.nodes.map((_, i) => `<button class="edge-row ${selectedEdge === i ? 'active' : ''}" data-edge="${i}"><span>P${i + 1} → P${(i + 1) % p.nodes.length + 1}</span><span class="mono">${cm(edgeLength(p, i))} cm</span></button>`).join('')}</div><button class="text-button" data-action="add-notch" ${locked() ? 'disabled' : ''}>${icon('plus')} 在选中边中点加刀口</button>${p.notches.length ? `<button class="text-button danger" data-action="remove-notch" ${locked() ? 'disabled' : ''}>移除最后一个刀口</button>` : ''}</section>`;
}
function measurementPanel() {
  const names = { chest:'胸围 / 裙版臀围', waist:'腰围', length:'衣长 / 裙长', shoulder:'肩宽', ease:'围度总松量' };
  return `<form id="measurements-form"><section class="panel-section"><h2 class="section-title">人体尺寸与版型参数 <span class="muted small">cm</span></h2>${Object.entries(names).map(([key,label]) => field(label,key,cm(project.measurements[key]),{number:true,min:ranges[key][0]/10,max:ranges[key][1]/10,unit:'cm'})).join('')}<button class="primary wide" ${locked() ? 'disabled' : ''}>联动调整纸样</button><p class="hint">尺寸驱动前后片，保留手动控制点偏移。这里使用演示公式，成衣合体度须经试样验证。</p></section><section class="panel-section"><h2 class="section-title">款式信息</h2>${field('款式名称','projectName',project.name)}${field('款号','styleNo',project.styleNo)}${field('号型','size',project.size)}<button class="secondary wide" ${locked() ? 'disabled' : ''}>应用尺寸与信息</button></section></form>`;
}
function reviewPanel(checks) {
  const errors = checks.filter(c => c.level === 'error').length, warnings = checks.filter(c => c.level === 'warning').length;
  const unresolved = project.review.comments.filter(c => !c.resolved).length;
  return `<section class="panel-section"><div class="review-summary">${errors ? `有 ${errors} 项需要修改` : '基础几何检查通过'}<small>${warnings} 项人工确认提醒 · ${unresolved} 条待解决意见</small></div><p class="hint">检查不能替代试衣。确认当前版本后，几何编辑将锁定；可退回修改并重新送审。</p><div class="stack" style="margin-top:14px">${project.review.status === 'draft' ? `<button class="primary wide" data-action="submit-review" ${errors ? 'disabled' : ''}>${icon('check')} 送审当前版本 V${project.revision}</button>` : project.review.status === 'review' ? `<button class="primary wide" data-action="approve" ${errors || unresolved ? 'disabled' : ''}>${icon('lock')} 确认通过此版本</button><button class="secondary wide" data-action="reopen">退回修改</button>` : `<span class="badge approved">${icon('check')} V${project.review.approvedRevision} 已确认 · 只读</span><button class="secondary wide" data-action="reopen">退回修改，保留参考版</button>`}<button class="secondary wide" data-action="review-report">${icon('export')} 导出审版报告</button></div></section><section class="panel-section"><h2 class="section-title">自动检查 <span class="muted small">${checks.length} 项</span></h2><div class="checks">${checks.map(c => `<div class="check ${c.level}" data-check="${c.id}"><span class="check-icon">${c.level === 'pass' ? '✓' : c.level === 'error' ? '×' : '!'}</span><div><strong>${esc(c.title)}</strong><p>${esc(c.detail)}</p></div></div>`).join('')}</div></section><section class="panel-section"><h2 class="section-title">审版意见</h2><form id="comment-form"><label class="field">关联裁片<select name="pieceId" aria-label="关联裁片">${project.pieces.map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label><label class="field">意见内容<textarea name="comment" aria-label="意见内容" maxlength="1000" rows="3" placeholder="例如：请核对前后侧缝长度" required ${project.review.status === 'approved' ? 'disabled' : ''}></textarea></label><button class="secondary wide small" ${project.review.status === 'approved' ? 'disabled' : ''}>${icon('comment')} 添加意见</button></form>${project.review.comments.length ? project.review.comments.map(c => `<div class="comment ${c.resolved ? 'resolved' : ''}"><div class="comment-head">${esc(project.pieces.find(p=>p.id===c.pieceId).name)} · ${c.resolved ? '已解决' : '待解决'} · V${c.revision || project.revision}</div><p>${esc(c.text)}</p>${project.review.status !== 'approved' ? `<button data-resolve="${esc(c.id)}">${c.resolved ? '重新打开' : '标记已解决'}</button>` : ''}</div>`).join('') : '<div class="empty small">还没有审版意见</div>'}</section>`;
}

function renderCanvas(preview = project) {
  const svg = $('#canvas');
  svg.setAttribute('viewBox', `${450 - 450 / zoom} ${390 - 390 / zoom} ${900 / zoom} ${780 / zoom}`);
  const rulers = Array.from({length:19}, (_,i) => `<path d="M${i*50} 0v${i%2?7:12}" stroke="#c5cdbd" stroke-width=".7"/><text x="${i*50+5}" y="13" font-size="8" fill="#a4ae9b">${i*5}</text>`).join('') + Array.from({length:16}, (_,i) => `<path d="M0 ${i*50}h${i%2?7:12}" stroke="#c5cdbd" stroke-width=".7"/><text x="5" y="${i*50+13}" font-size="8" fill="#a4ae9b">${i*5}</text>`).join('');
  svg.innerHTML = `<defs><pattern id="grid-small" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#dfe5d8" stroke-width=".45"/></pattern><pattern id="grid-large" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="url(#grid-small)"/><path d="M50 0H0V50" fill="none" stroke="#d2dbca" stroke-width=".65"/></pattern><marker id="grain-arrow" markerWidth="9" markerHeight="9" refX="4" refY="4" orient="auto-start-reverse"><path d="M0 1L4 4 0 7" fill="none" stroke="#708168" stroke-width=".8"/></marker></defs><rect x="-1000" y="-1000" width="4000" height="4000" fill="${grid ? 'url(#grid-large)' : '#f5f6f1'}"/><g>${rulers}</g>${preview.pieces.map((p,i)=>drawPiece(p,i,preview)).join('')}${measured.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#bd9253"/><text x="${p.x+8}" y="${p.y-8}" font-size="10" fill="#a78047">${i?'B':'A'}</text>`).join('')}${measured.length===2?`<path d="M${measured[0].x} ${measured[0].y}L${measured[1].x} ${measured[1].y}" stroke="#b89052" stroke-width="1.4" stroke-dasharray="5 3"/>`:''}`;
}
function drawPiece(p, i, preview) {
  const pos = stagePosition(i), b = bounds(p), active = p.id === selected, points = cuttingPoints(p);
  const g = p.grain, baseline = preview.review.baseline.find(base=>base.id===p.id);
  const nodes = active && tool === 'node' && mode === 'design' ? p.nodes.map((n,j)=>`${n.cx!==undefined?`<path d="M${p.nodes[j-1].x} ${p.nodes[j-1].y}L${n.cx} ${n.cy}L${n.x} ${n.y}" fill="none" stroke="#bda97c" stroke-width=".8" stroke-dasharray="3 3"/><circle class="curve-point handle" tabindex="0" role="button" aria-label="${esc(p.name)} 曲线控制 P${j+1}" data-node="${j}" data-control="true" data-owner="${p.id}" cx="${n.cx}" cy="${n.cy}" r="5" fill="#f9f6ec" stroke="#b59b66" stroke-width="1.3"/>`:''}<circle class="point handle" tabindex="0" role="button" aria-label="${esc(p.name)} 控制点 P${j+1}" data-node="${j}" data-owner="${p.id}" cx="${n.x}" cy="${n.y}" r="${nodeIndex===j?5.5:4}" fill="${nodeIndex===j?'#315b42':'#fafcf7'}" stroke="#4f7753" stroke-width="1.4"/><text x="${n.x+10}" y="${n.y-9}" font-size="8" fill="#8c9a7e">P${j+1}</text>`).join('') : '';
  const edgeTargets = p.nodes.map((_, edge) => `<path data-edge-hit="${edge}" data-owner="${p.id}" d="M${edgePoint(p,edge,0).x} ${edgePoint(p,edge,0).y}${p.nodes[(edge+1)%p.nodes.length].cx!==undefined?`Q${p.nodes[(edge+1)%p.nodes.length].cx} ${p.nodes[(edge+1)%p.nodes.length].cy} ${p.nodes[(edge+1)%p.nodes.length].x} ${p.nodes[(edge+1)%p.nodes.length].y}`:`L${p.nodes[(edge+1)%p.nodes.length].x} ${p.nodes[(edge+1)%p.nodes.length].y}`}" stroke="transparent" stroke-width="16" fill="none" style="cursor:${tool==='notch'?'crosshair':'pointer'}"/>`).join('');
  return `<g transform="translate(${pos.x} ${pos.y})" data-piece-group="${p.id}">${showBaseline&&baseline?`<path d="${pathData(baseline)}" fill="none" stroke="#c5a878" stroke-width="1.5" stroke-dasharray="6 4"/>`:''}${showSeam?`<polygon data-shape="${p.id}" class="piece-shape" points="${points.map(pt=>`${pt.x},${pt.y}`).join(' ')}" fill="${active?'#f1f5ec':'#f9f8ef'}" stroke="${active?'#617e5c':'#9ca68b'}" stroke-width="1.3"/>`:''}<path data-shape="${p.id}" class="piece-shape" d="${pathData(p)}" fill="${showSeam?'none':active?'#eef4e8':'#f8f7ed'}" stroke="${active?'#3e6746':'#8c9b7c'}" stroke-width="${active?1.5:1}" ${showSeam?'stroke-dasharray="6 3"':''}/><path d="M0 ${preview.template==='bodice'?preview.measurements.chest/6+65:preview.measurements.length*.35}H${b.width}" stroke="#bdcbb0" stroke-width=".7" stroke-dasharray="7 6"/><line x1="${g.x}" y1="${g.y1}" x2="${g.x}" y2="${g.y2}" stroke="#708168" stroke-width="1" marker-start="url(#grain-arrow)" marker-end="url(#grain-arrow)"/><text x="${g.x+12}" y="${(g.y1+g.y2)/2}" font-size="8" fill="#9aa38b" style="writing-mode:vertical-rl">经向</text><text x="${g.x}" y="${g.y1-65}" text-anchor="middle" font-size="16" fill="#536c49" font-weight="500">${esc(p.name)}</text><text x="${g.x}" y="${g.y1-45}" text-anchor="middle" font-size="9" fill="#98a18b">${esc(preview.size)} / ${esc(p.material)} / 裁 ${p.quantity} 片</text><text x="${g.x}" y="${g.y2+35}" text-anchor="middle" font-size="8" fill="#9ea68f" letter-spacing="1">${esc(preview.styleNo)} · 0${i+1}</text>${p.notches.map(n=>{const pt=edgePoint(p,n.edge,n.t);return `<path d="M${pt.x-4} ${pt.y-6}l4 6 4-6" fill="none" stroke="#7b8c61" stroke-width="1.7"/>`;}).join('')}<g>${edgeTargets}</g>${nodes}<g stroke="#a9b49d" fill="none" stroke-width=".6"><path d="M${b.minX} ${b.height+30}H${b.minX+b.width}M${b.minX} ${b.height+25}v10M${b.minX+b.width} ${b.height+25}v10"/></g><text x="${b.minX+b.width/2}" y="${b.height+46}" text-anchor="middle" font-size="9" fill="#8f9e81">${cm(b.width)} cm</text><text x="${b.minX+b.width/2}" y="-40" text-anchor="middle" font-size="9" fill="#8b9a7f" letter-spacing="2">${i?'BACK':'FRONT'} / ${esc(p.name)}</text></g>`;
}

function svgPoint(event) { const svg=$('#canvas'), p=svg.createSVGPoint(); p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(svg.getScreenCTM().inverse()); }
function pointerDown(event) {
  if (event.button !== 0) return;
  const target=event.target, n=target.closest('[data-node]');
  if (n && tool==='node' && mode==='design') {
    selected=n.dataset.owner;nodeIndex=Number(n.dataset.node);
    if (locked()) { render();return; }
    drag={ node:nodeIndex, control:!!n.dataset.control, preview:clone(project), before:clone(project), start:svgPoint(event), moved:false };
    $('#canvas').setPointerCapture(event.pointerId);event.preventDefault();renderCanvas();return;
  }
  if (tool==='ruler') { const p=svgPoint(event);if(measured.length===2)measured=[];measured.push({x:p.x,y:p.y});render();return; }
  const edge=target.closest('[data-edge-hit]');
  if (edge && tool==='notch' && mode==='design' && !locked()) {
    selected=edge.dataset.owner;selectedEdge=Number(edge.dataset.edgeHit);const p=svgPoint(event), pos=stagePosition(project.pieces.findIndex(p=>p.id===selected));let best=0,dist=Infinity;
    for(let i=0;i<=100;i++){const q=edgePoint(piece(),selectedEdge,i/100),d=Math.hypot(p.x-pos.x-q.x,p.y-pos.y-q.y);if(d<dist){dist=d;best=i/100;}}
    addNotch(best);return;
  }
  const shape=target.closest('[data-shape]');const owner=edge?.dataset.owner||shape?.dataset.shape;
  if(owner){selected=owner;nodeIndex=null;if(edge)selectedEdge=Number(edge.dataset.edgeHit);render();}
}
function pointerMove(event) {
  if (!drag) return;
  const p=svgPoint(event),pos=stagePosition(project.pieces.findIndex(part=>part.id===selected));
  const node=drag.preview.pieces.find(part=>part.id===selected).nodes[drag.node];
  const x=Math.max(-10000,Math.min(10000,p.x-pos.x)),y=Math.max(-10000,Math.min(10000,p.y-pos.y));
  node[drag.control?'cx':'x']=snap?Math.round(x):round(x,2);node[drag.control?'cy':'y']=snap?Math.round(y):round(y,2);
  drag.moved=true;renderCanvas(drag.preview);
}
function pointerUp(event) {
  if(!drag)return;const done=drag;drag=null;
  if($('#canvas').hasPointerCapture(event.pointerId))$('#canvas').releasePointerCapture(event.pointerId);
  if(done.moved){setProject(editProject(done.before,next=>{next.pieces=done.preview.pieces;}),{history:true});}else render();
}
function addNotch(t=.5) {
  if(piece().notches.length>=100){notify('每片最多 100 个刀口');return;}
  if(piece().notches.some(n=>n.edge===selectedEdge&&Math.abs(n.t-t)<.02)){notify('该位置已有刀口');return;}
  edit(next=>next.pieces.find(p=>p.id===selected).notches.push({edge:selectedEdge,t}));
}

function openDialog(id, content) { const d=$(id);d.innerHTML=content;d.showModal(); }
const dialogHeader=(id,title,description)=>`<div class="dialog-header"><div><div class="eyebrow">ETCAD · REA</div><h2 id="${id}">${title}</h2><p>${description}</p></div><button type="button" data-action="close-dialog" aria-label="关闭">${icon('close')}</button></div>`;
function newDialog() {
  openDialog('#new-dialog',`${dialogHeader('new-title','从一个基础版开始','输入尺寸，建立属于你的新纸样。')}<form id="new-form"><div class="dialog-body"><label class="field">选择基础版</label><div class="template-options"><label class="template-option"><input type="radio" name="template" value="bodice" checked> 无袖上衣基础版</label><label class="template-option"><input type="radio" name="template" value="skirt"> A 字裙基础版</label></div>${field('款式名称','name','我的新纸样',{disabled:false})}<div class="two-col">${field('款号','styleNo',`ET-${String(projects.length+1).padStart(3,'0')}`,{disabled:false})}${field('号型','size','160/84A',{disabled:false})}</div><div class="two-col">${[['chest','胸围 / 裙版臀围'],['waist','腰围'],['length','衣长 / 裙长'],['shoulder','肩宽'],['ease','围度总松量']].map(([key,label])=>field(label,key,cm(defaults[key]),{number:true,min:ranges[key][0]/10,max:ranges[key][1]/10,unit:'cm',disabled:false})).join('')}</div><p class="hint">基础版使用演示公式，可继续编辑。已有纸样保留在「我的版型库」。</p><div class="form-error" role="alert"></div></div><div class="dialog-footer"><button type="button" class="secondary" data-action="close-dialog">取消</button><button class="primary">${icon('plus')} 创建纸样</button></div></form>`);
}
function libraryDialog() {
  openDialog('#help-dialog',`${dialogHeader('help-title','我的版型库','保存在此浏览器中，可导出 JSON 文件备份或迁移。')}<div class="dialog-body">${projects.map(p=>`<div class="library-item"><div><strong>${esc(p.name)}</strong><small>${esc(p.styleNo)} · ${esc(p.size)} · V${p.revision}</small></div><button class="secondary small" data-open-project="${esc(p.id)}">${p.id===project.id?'当前项目':'打开'}</button></div>`).join('')}<button class="text-button" data-action="import">${icon('import')} 导入 JSON 纸样</button></div><div class="dialog-footer"><button class="primary" data-action="close-dialog">完成</button></div>`);
}
function exportDialog() {
  openDialog('#export-dialog',`${dialogHeader('export-title','导出纸样','为下一步审版、备份或打印准备好文件。')}<div class="dialog-body"><div class="export-option"><div><h3>可编辑纸样 · JSON</h3><p>包含裁片、尺寸、刀口和审版记录。<br>可重新导入本工作台继续编辑。</p></div><button class="secondary" data-action="export-json">${icon('export')} 导出</button></div><div class="export-option"><div><h3>1:1 矢量纸样 · SVG</h3><p>毫米尺寸，含裁剪线、缝合线、纱向。<br>曲线缝份为近似；打印后请实测校准线。</p></div><button class="primary" data-action="export-svg">${icon('export')} 导出</button></div><button class="text-button" data-action="import">${icon('import')} 导入已有 JSON 纸样</button><p class="hint">本版不读写 ET 专有的 .prj / .ets 文件，也不输出工业 DXF 或 PLT 文件。</p></div><div class="dialog-footer"><button class="secondary" data-action="close-dialog">关闭</button></div>`);
}
function helpDialog() {
  openDialog('#help-dialog',`${dialogHeader('help-title','完成一张纸样','新建 → 编辑 → 核对 → 送审 → 确认')}<div class="dialog-body help-content"><h3>01 新建与调整</h3><p>选择上衣或裙版，填写厘米尺寸。在「尺寸表」中修改参数，可联动调整前后片并保留手动点位偏移。</p><h3>02 编辑与测量</h3><p><kbd>V</kbd> 选择裁片 · <kbd>A</kbd> 拖动轮廓点或曲线控制点 · <kbd>M</kbd> 测量两点直线距离 · <kbd>N</kbd> 点击边线添加刀口。控制点也可在属性栏输入坐标。<kbd>Ctrl+Z</kbd> 撤销，<kbd>Ctrl+Shift+Z</kbd> 重做，<kbd>Ctrl+S</kbd> 保存。</p><h3>03 审版与备份</h3><p>「审版检查」列出几何错误与提醒，可按裁片记录意见。送审后版本只读，解决意见后确认通过；退回修改会保留参考版。使用 JSON 导出备份，SVG 导出用于 1:1 矢量查看。</p><p>这是依据公开资料制作的独立二维基础版工具；演示公式和近似缝份须经专业版师复核及试样。数据只在当前浏览器保存；没有多人协作或云备份。</p><p><a href="/docs/research/ETCAD-EVIDENCE.md" target="_blank" rel="noopener">查看 ETCAD 功能证据</a> · <a href="/docs/research/ETCAD-VERSIONS.md" target="_blank" rel="noopener">查看版本目录</a></p></div><div class="dialog-footer"><button class="primary" data-action="close-dialog">开始制版</button></div>`);
}
function download(content, filename, type) {
  const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('导出文件已生成');
}
const safeFile = () => project.styleNo.replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,60) || 'pattern';
function report() {
  const data={project:{name:project.name,styleNo:project.styleNo,size:project.size,revision:project.revision},status:project.review.status,generatedAt:new Date().toISOString(),checks:checkProject(project),comments:project.review.comments,pieces:project.pieces.map(p=>({name:p.name,material:p.material,quantity:p.quantity,netAreaMm2:round(area(p)),netPerimeterMm:round(perimeter(p)),seamAllowanceMm:p.seamAllowance,notches:p.notches.length})),limitations:['二维几何检查不代替试样','统一缝份，曲线偏移为采样近似','本地审版状态不等于多人身份认证']};
  download(JSON.stringify(data,null,2),`${safeFile()}-V${project.revision}-审版报告.json`,'application/json');
}

document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.piece){selected=button.dataset.piece;nodeIndex=null;render();return;}
  if(button.dataset.edge!==undefined){selectedEdge=Number(button.dataset.edge);render();return;}
  if(button.dataset.tool){tool=button.dataset.tool;measured=[];render();return;}
  if(button.dataset.tab){const next=button.dataset.tab;mode=next==='review'?'review':'design';tab=next==='review'?tab:next;if(mode==='review')tool='select';render();return;}
  if(button.dataset.resolve){if(project.review.status==='approved')return;const next=clone(project);const c=next.review.comments.find(c=>c.id===button.dataset.resolve);c.resolved=!c.resolved;setProject(next);return;}
  if(button.dataset.openProject){save(true);project=clone(projects.find(p=>p.id===button.dataset.openProject));selected='front';nodeIndex=null;undoStack=[];redoStack=[];measured=[];save(true);button.closest('dialog').close();render();return;}
  const actions={
    new:newDialog,library:libraryDialog,help:helpDialog,export:exportDialog,
    'close-dialog':()=>button.closest('dialog').close(),
    design:()=>{mode='design';render();},review:()=>{mode='review';tool='select';render();},
    evidence:()=>window.open('/docs/research/ETCAD-EVIDENCE.md','_blank','noopener'),
    undo:()=>restoreHistory('undo'),redo:()=>restoreHistory('redo'),grid:()=>{grid=!grid;render();},
    'zoom-in':()=>{zoom=Math.min(2.5,round(zoom+.25,2));render();},'zoom-out':()=>{zoom=Math.max(.5,round(zoom-.25,2));render();},fit:()=>{zoom=1;render();},
    'add-notch':()=>addNotch(),'remove-notch':()=>edit(next=>next.pieces.find(p=>p.id===selected).notches.pop()),
    'submit-review':()=>guard(()=>{setProject(submitReview(project));notify(`V${project.revision} 已送审，几何编辑已锁定`);}),
    approve:()=>guard(()=>{setProject(approveReview(project));notify(`V${project.revision} 审版通过`);}),
    reopen:()=>{setProject(reopenProject(project));undoStack=[];redoStack=[];notify('已退回修改，参考版已保留');},
    'review-report':report,'export-json':()=>download(JSON.stringify(project,null,2),`${safeFile()}-V${project.revision}.json`,'application/json'),
    'export-svg':()=>download(exportSVG(project),`${safeFile()}-V${project.revision}.svg`,'image/svg+xml'),
    import:()=>$('#import-file').click(),
  };
  actions[button.dataset.action]?.();
});

document.addEventListener('change',event=>{
  const toggles={seam:()=>{showSeam=event.target.checked;},baseline:()=>{showBaseline=event.target.checked;},snap:()=>{snap=event.target.checked;}};
  if(event.target.type==='checkbox'&&toggles[event.target.name]){toggles[event.target.name]();render();}
});
document.addEventListener('submit',event=>{
  const form=event.target;if(!['piece-form','node-form','measurements-form','new-form','comment-form'].includes(form.id))return;event.preventDefault();const data=new FormData(form);
  if(form.id==='piece-form')edit(next=>{const p=next.pieces.find(p=>p.id===selected);p.name=String(data.get('name')).trim();p.material=String(data.get('material')).trim();if(!p.name||!p.material)throw Error('名称与物料不能为空');p.quantity=Number(data.get('quantity'));p.seamAllowance=Number(data.get('seamAllowance'))*10;});
  if(form.id==='node-form')edit(next=>{const n=next.pieces.find(p=>p.id===selected).nodes[nodeIndex];for(const key of ['x','y','cx','cy'])if(data.has(key))n[key]=Number(data.get(key))*10;});
  if(form.id==='measurements-form')guard(()=>{
    const m=Object.fromEntries(Object.keys(defaults).map(k=>[k,Number(data.get(k))*10]));const next=changeMeasurements(project,m);next.name=String(data.get('projectName')).trim();next.styleNo=String(data.get('styleNo')).trim();next.size=String(data.get('size')).trim();if(!next.name||!next.styleNo||!next.size)throw Error('款式信息不能为空');setProject(next,{history:true});notify('尺寸已联动调整，手动偏移已保留');
  });
  if(form.id==='new-form'){
    try{if(projects.length>=30)throw Error('本地最多保留 30 个项目，请导出备份后在新浏览器工作区继续');const m=Object.fromEntries(Object.keys(defaults).map(k=>[k,Number(data.get(k))*10]));const name=String(data.get('name')).trim(),styleNo=String(data.get('styleNo')).trim(),size=String(data.get('size')).trim();if(!name||!styleNo||!size)throw Error('请填写款式信息');const next=createProject({name,styleNo,size,template:data.get('template'),measurements:m});save(true);projects.push(next);project=next;selected='front';nodeIndex=null;mode='design';tab='properties';tool='select';undoStack=[];redoStack=[];measured=[];zoom=1;save(true);$('#new-dialog').close();render();notify('新纸样已创建');}catch(e){form.querySelector('.form-error').textContent=e.message;}
  }
  if(form.id==='comment-form'){
    if(project.review.status==='approved')return;const text=String(data.get('comment')).trim();if(!text)return;
    if(project.review.comments.length>=500){notify('此项目的审版意见已达 500 条，请导出备份');return;}
    const next=clone(project);next.review.comments.push({id:uid(),pieceId:data.get('pieceId'),text,resolved:false,revision:project.revision});setProject(next);notify('审版意见已记录');
  }
});
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{if(file.size>2_000_000)throw Error('文件过大（上限 2 MB）');const incoming=parseProject(await file.text());save(true);incoming.id=uid();projects.push(incoming);project=incoming;selected='front';nodeIndex=null;mode='design';tool='select';undoStack=[];redoStack=[];measured=[];document.querySelectorAll('dialog[open]').forEach(d=>d.close());save(true);render();notify('纸样已导入，原项目已保留');}catch(e){notify(`导入失败：${e.message}`);}finally{event.target.value='';}
});
document.addEventListener('keydown',event=>{
  const handle=event.target.closest('circle[data-node]');
  if(handle && ['Enter',' '].includes(event.key) && !locked() && mode==='design'){event.preventDefault();selected=handle.dataset.owner;nodeIndex=Number(handle.dataset.node);render();$('#node-form input[name=x]')?.focus();return;}
  const input=event.target.closest('input,textarea,select');if(event.key==='Escape'&&drag){drag=null;render();return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){if(document.querySelector('dialog[open]'))return;event.preventDefault();save();return;}
  if(input||document.querySelector('dialog[open]'))return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();restoreHistory(event.shiftKey?'redo':'undo');return;}
  const keys={v:'select',a:'node',m:'ruler',n:'notch'};if(!event.ctrlKey&&!event.metaKey&&keys[event.key.toLowerCase()]){const chosen=keys[event.key.toLowerCase()];if((locked()||mode==='review')&&['node','notch'].includes(chosen))return;tool=chosen;measured=[];render();}
});
render();if(loadWarning)notify(loadWarning);
