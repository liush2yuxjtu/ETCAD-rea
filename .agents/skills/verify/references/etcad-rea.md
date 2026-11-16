# ETCAD-rea 真实表面验证

工作目录为仓库根目录；Node.js 20+，运行应用不需要安装 npm 依赖。UI 验证使用 Python 的 `playwright` 包及现有 Chromium。

1. 审查完整 `git diff` / 新文件，记录候选 SHA 或 `git diff` 哈希。
2. `npm test`：基础版几何、曲线测量、缝份偏移、手动偏移保留、侧缝错误、审版状态与输入边界。
3. `npm run check`：JS 语法检查。
4. `npm start`，等待 `ETCAD-rea ready at http://localhost:4173`。需要其它端口时设置 `PORT`。
5. `npm run verify:ui`。默认地址 `http://127.0.0.1:4173`；可通过 `VERIFY_URL` 改地址。系统 Chromium 默认 `/usr/bin/chromium`，可通过 `CHROMIUM_PATH` 改路径。
6. 测试必须真实点击/拖动：新建上衣 → 坐标与曲线编辑 → 撤销重做 → 尺寸驱动保留手动偏移 → 测量/刀口/物料 → 意见阻止确认 → 解决后确认 → reload 保持只读 → JSON/SVG 下载 → 退回修改产生侧缝错误阻止送审 → JSON 重新导入并 reload → 错误导入不改变项目 → 打开原项目 → 手机宽度新建裙版。
7. 检查 `docs/verification/runtime-report.json`、四张截图和 `exported-pattern.svg`。控制台错误或失败请求不能判 PASS。SVG 以 HTTP 从 `docs/verification/` 打开；此环境禁止 `file://`，不要关闭浏览器策略。
8. 原始命令及退出码保存在 `docs/verification/commands.log`；报告保存于 `docs/verification/VERIFICATION.md`。记录运行时源码内容哈希，供最终 commit 对照。无既有线上部署，不将本地测试写成线上测试。
9. 清理本轮测试浏览器上下文；结束本轮自启的开发服务器。Playwright 使用独立临时上下文，不写入真实用户资料。

一键完整验证：`npm run verify`。它先执行测试与语法检查，再在 4187 端口启动本轮拥有的服务器、运行 HTTP 边界和真实 UI 检查，最后停止服务器。`VERIFY_PORT` 可改端口。`source-manifest.json` 记录验证候选源码逐文件 SHA-256，`execution.json` 和 `commands.log` 记录原始命令及退出码；产物生成期间不得修改源码。

| Claim | Real surface | Required evidence |
| --- | --- | --- |
| 新建、编辑纸样 | Chromium DOM + SVG + 真实鼠标 | 界面变化、几何保存读回、截图 |
| 审版与持久化 | 意见/确认按钮 + reload | 未解决意见阻止确认、确认后锁定、reload 结果 |
| 文件交换 | 浏览器下载和文件导入控件 | JSON 内容读回、SVG 实际渲染、导入后 reload |
| 异常处理 | 同一界面 | 侧缝错误阻止送审、坏 JSON 不改变当前项目 |
| REA 安装与原生调查 | 注册配置启动的 stdio MCP 服务 | initialize/tools/list/tools/call、目标 hash、provider、Evidence 和清理回执；见 [原生调查配方](rea-native.md) |
| 原版 WASM 兼容实验 | 原 EXE 在浏览器中的真实窗口 | 菜单、打开、绘图和文件往返；当前 FAIL，见 [浏览器兼容配方](rea-wasm.md) |

复制来源：`liush2yuxjtu/dot-pi@924bf755028d6b0fc6096c3fcf4d9c97f87a7693` 的 `agent/skills/verify/`。原有 skill、references 和 evals 原样保留；本文件为本项目补充操作路径。文件存在不代表注册了原生 `/verify` 命令。
