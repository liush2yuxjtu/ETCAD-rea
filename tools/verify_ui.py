"""Real Chromium interactions for the local app. Requires Python Playwright + Chromium.
Launch `npm start` first. No fixture API or injected app calls drive this test.
"""
import json
import os
import shutil
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/verification'
OUT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('VERIFY_URL', 'http://127.0.0.1:4173')
observations = []


def record(step, detail):
    observations.append({'step': step, 'observation': detail})
    print(f'PASS {step}: {detail}')


def snapshot(page):
    return page.evaluate("JSON.parse(localStorage.getItem('etcad-rea.projects.v1'))")


def current(page):
    data = snapshot(page)
    return next(p for p in data['projects'] if p['id'] == data['activeId'])


def button(page, name):
    return page.get_by_role('button', name=name, exact=True)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, locale='zh-CN', accept_downloads=True)
    page = context.new_page()
    errors, requests = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    page.on('requestfailed', lambda req: requests.append({'url': req.url, 'error': req.failure}))
    page.on('response', lambda res: requests.append({'url': res.url, 'status': res.status}) if res.status >= 400 else None)
    page.goto(BASE, wait_until='networkidle')
    expect(page).to_have_title('ETCAD-rea · 纸样工作台')
    expect(page.locator('[data-piece-group]')).to_have_count(2)
    page.screenshot(path=str(OUT / '01-workbench.png'), full_page=True)
    record('launch', 'Chinese UI and two rendered pattern pieces; initial screenshot captured')

    button(page, '新建纸样').click()
    dialog = page.locator('#new-dialog')
    dialog.get_by_label('款式名称', exact=True).fill('青禾 · 无袖上衣')
    dialog.get_by_label('款号', exact=True).fill('QH-016')
    dialog.get_by_label('胸围 / 裙版臀围', exact=True).fill('90')
    dialog.get_by_role('button', name='创建纸样', exact=True).click()
    expect(page.locator('.project-title')).to_have_text('青禾 · 无袖上衣')
    assert current(page)['measurements']['chest'] == 900
    record('create', 'New named bodice saved independently of the original project; cm converted to mm')

    button(page, '编辑点').click()
    handle = page.locator('circle.point[data-node="1"][data-owner="front"]')
    handle.focus()
    handle.press('Enter')
    x_input = page.locator('#node-form input[name="x"]')
    expect(x_input).to_be_focused()
    x_input.fill('8')
    button(page, '应用坐标').click()
    before = current(page)['pieces'][0]['nodes'][1]['x']
    assert before == 80
    handle = page.locator('circle.point[data-node="1"][data-owner="front"]')
    box = handle.bounding_box()
    page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    page.mouse.down()
    page.mouse.move(box['x'] + box['width'] / 2 + 13, box['y'] + box['height'] / 2, steps=6)
    page.mouse.up()
    moved = current(page)['pieces'][0]['nodes'][1]['x']
    assert moved > before
    button(page, '撤销').click()
    assert current(page)['pieces'][0]['nodes'][1]['x'] == before
    button(page, '重做').click()
    assert current(page)['pieces'][0]['nodes'][1]['x'] == moved
    control = page.locator('circle.curve-point[data-node="1"][data-owner="front"]')
    cb = control.bounding_box()
    old_cy = current(page)['pieces'][0]['nodes'][1]['cy']
    page.mouse.move(cb['x'] + cb['width']/2, cb['y'] + cb['height']/2)
    page.mouse.down()
    page.mouse.move(cb['x'] + cb['width']/2, cb['y'] + cb['height']/2 + 7, steps=5)
    page.mouse.up()
    assert current(page)['pieces'][0]['nodes'][1]['cy'] > old_cy
    record('edit', 'Numeric coordinate edit, real pointer point/curve drags, undo and redo persisted')

    button(page, '尺寸表').click()
    prior = current(page)
    page.locator('#measurements-form input[name="chest"]').fill('94')
    button(page, '联动调整纸样').click()
    after = current(page)
    expected = prior['pieces'][0]['nodes'][1]['x'] + (940 - 900) / 12
    assert abs(after['pieces'][0]['nodes'][1]['x'] - expected) < .001
    assert after['pieces'][1]['nodes'][3]['x'] == 255
    record('parameters', 'Chest drives both pieces and preserves the manual neckline offset')

    button(page, '测量').click()
    canvas = page.locator('#canvas').bounding_box()
    page.mouse.click(canvas['x'] + 70, canvas['y'] + 90)
    page.mouse.click(canvas['x'] + 170, canvas['y'] + 90)
    expect(page.locator('#measure-readout')).to_be_visible()
    expect(page.locator('#measure-readout')).to_contain_text('两点距离')
    record('measure', 'Two real canvas clicks produce a visible straight-line measurement')

    button(page, '裁片属性').click()
    button(page, '选择').click()
    button(page, '在选中边中点加刀口').click()
    page.locator('[data-piece="back"]').click()
    button(page, '在选中边中点加刀口').click()
    assert all(len(p['notches']) == 1 for p in current(page)['pieces'])
    page.get_by_label('物料名称', exact=True).fill('棉麻平纹')
    button(page, '应用裁片属性').click()
    assert current(page)['pieces'][1]['material'] == '棉麻平纹'
    record('properties', 'Front/back notches and Chinese material name persisted')

    button(page, '审版检查').click()
    expect(page.locator('[data-check="side-seams"]')).to_have_class('check pass')
    page.get_by_label('意见内容', exact=True).fill('请确认后片物料与侧缝对位。')
    button(page, '添加意见').click()
    page.locator('[data-action="submit-review"]').click()
    expect(button(page, '确认通过此版本')).to_be_disabled()
    button(page, '标记已解决').click()
    button(page, '确认通过此版本').click()
    approved = current(page)
    assert approved['review']['approvedRevision'] == approved['revision']
    with page.expect_download() as downloaded:
        button(page, '导出审版报告').click()
    review_file = ROOT / 'work/review-report.json'
    downloaded.value.save_as(str(review_file))
    review_data = json.loads(review_file.read_text())
    assert review_data['status'] == 'approved'
    assert review_data['project']['revision'] == approved['revision']
    page.screenshot(path=str(OUT / '02-review.png'), full_page=True)
    page.reload(wait_until='networkidle')
    button(page, '裁片属性').click()
    expect(page.get_by_label('裁片名称', exact=True)).to_be_disabled()
    expect(button(page, '编辑点')).to_be_disabled()
    assert current(page)['review']['status'] == 'approved'
    record('review-and-reload', 'Unresolved comment blocks approval; resolved version becomes read-only and remains so after reload')

    button(page, '导出').click()
    with page.expect_download() as downloaded:
        page.locator('[data-action="export-json"]').click()
    exported = ROOT / 'work/roundtrip.json'
    exported.parent.mkdir(exist_ok=True)
    downloaded.value.save_as(str(exported))
    assert json.loads(exported.read_text())['review']['status'] == 'approved'
    with page.expect_download() as downloaded:
        page.locator('[data-action="export-svg"]').click()
    svg_file = ROOT / 'work/pattern.svg'
    downloaded.value.save_as(str(svg_file))
    text = svg_file.read_text()
    assert 'mm" height="' in text and '校准线 100 mm' in text
    page.locator('#export-dialog .dialog-footer [data-action="close-dialog"]').click()
    shutil.copyfile(svg_file, OUT / 'exported-pattern.svg')
    (OUT / 'export-preview.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>导出纸样渲染校验</title><body style="margin:20px;background:#f4f5f0;font-family:sans-serif"><h1 style="font-size:16px">导出 SVG 纸样 · 浏览器渲染</h1><img src="exported-pattern.svg" alt="已下载的毫米尺寸纸样" style="display:block;width:1100px;height:850px;object-fit:contain;background:white"></body></html>')
    svg_page = context.new_page()
    svg_page.goto(BASE + '/docs/verification/export-preview.html', wait_until='networkidle')
    assert svg_page.locator('img').evaluate('(img) => img.complete && img.naturalWidth > 0')
    svg_page.screenshot(path=str(OUT / '03-export-svg.png'), full_page=True)
    svg_page.close()
    record('export', 'JSON download read back; millimetre SVG opened and rendered by Chromium')

    button(page, '审版检查').click()
    button(page, '退回修改，保留参考版').click()
    button(page, '裁片属性').click()
    page.locator('[data-piece="front"]').click()
    button(page, '编辑点').click()
    page.locator('circle.point[data-node="4"][data-owner="front"]').click()
    page.locator('#node-form input[name="y"]').fill('63')
    button(page, '应用坐标').click()
    page.locator('[data-action="review"]').click()
    expect(page.locator('[data-check="side-seams"]')).to_have_class('check error')
    expect(page.locator('[data-action="submit-review"]')).to_be_disabled()
    record('nearby-edge', 'A deliberately mismatched side seam fails checks and disables submission')

    page.locator('#import-file').set_input_files(str(exported))
    expect(page.locator('.badge.approved')).to_be_visible()
    restored = current(page)
    assert restored['pieces'] == approved['pieces']
    page.reload(wait_until='networkidle')
    assert current(page)['pieces'] == approved['pieces']
    assert len(snapshot(page)['projects']) == 3
    before_bad = current(page)['id']
    page.locator('#import-file').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{"schemaVersion":1}'})
    expect(page.locator('#toast')).to_contain_text('导入失败')
    assert current(page)['id'] == before_bad
    record('import-and-reload', 'JSON round-trip retains exact geometry and review state; malformed import leaves the current project intact')

    button(page, '我的版型库').click()
    expect(page.locator('.library-item')).to_have_count(3)
    page.locator('[data-open-project]').first.click()
    expect(page.locator('.project-title')).to_have_text('日常 · 无袖上衣')
    record('library', 'Original and new projects remain independently available')

    page.set_viewport_size({'width':390,'height':844})
    page.reload(wait_until='networkidle')
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    button(page, '新建纸样').click()
    page.locator('input[value="skirt"]').check()
    page.locator('#new-dialog input[name="name"]').fill('通勤 A 字裙')
    button(page, '创建纸样').click()
    assert current(page)['template'] == 'skirt'
    expect(page.locator('[data-piece-group]')).to_have_count(2)
    page.screenshot(path=str(OUT / '04-mobile.png'), full_page=True)
    button(page, '我的版型库').click()
    expect(page.locator('.library-item')).to_have_count(4)
    page.locator('#help-dialog .dialog-footer button').click()
    record('mobile', '390 px viewport has no horizontal page overflow; skirt creation works')

    assert errors == [], errors
    assert requests == [], requests
    report = {'verdict':'PASS','url':BASE,'timestampUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'browser':browser.version,'method':'Python Playwright + real Chromium mouse/keyboard input','steps':observations,'consoleErrors':errors,'failedRequests':requests,'cleanup':'Isolated browser context closed; app server managed separately'}
    (OUT / 'runtime-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    browser.close()
    print('PASS real-surface verification')
