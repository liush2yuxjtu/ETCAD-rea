# 原版 ET-CAD 的浏览器兼容实验

工作目录：仓库根。验证对象是原版学习版 EXE；不能用本项目独立网页的 PASS 或单张原版启动截图替代原版交互验收。

已实际使用的 VM 恢复点：

- 样本：`/workspace/work/et-binaries/learning-edition/ET_PSV/ET_学习版/ETCOM_PSV.exe`，SHA-256 `a2c0df89a37d064b3c00b975a7e0cca68c3b2ad17a5e920d9fddc0ac3daa0aba`。
- 官方 Web runtime：`/workspace/work/et-wasm/runtime/`；候选包括官方 `26R1.0` ST/MT，以及当前源码构建。SDK 安装在 `/workspace/work/emsdk/`，无全局 shell 配置修改。
- 原始试验日志/截图：`/workspace/work/et-wasm/`；公开的必要证据在 `docs/research/native/wasm/`。
- 单线程控制及首次失败脚本：`python3 /workspace/work/et-wasm/probe_browser.py`。
- 原版 GUI 的最终截图入口：`python3 /workspace/work/et-wasm/capture_original_gui.py`。它读取本地 4392 端口的 MT runtime，使用独立 Chromium 上下文；每行接收 `{"op":"snapshot","tag":"evidence"}`、真实 `click` / `key` 操作，以及 `{"op":"exit"}`。
- HTTP 服务需要给 HTML/资源返回 COOP `same-origin`、COEP `require-corp`；`wasm` 类型正确，MT 页面 `crossOriginIsolated = true`。

操作顺序：

1. 先核对目标、runtime/文件系统版本、EXE 和字体/运行库哈希；只在新候选确实改变时复测。
2. 启动本轮拥有的本地静态服务器，使用独立、无真实用户资料的 Chromium 上下文。记录资源加载、控制台和 canvas 像素。
3. 等待真实工作台；字体正常后保存 canvas 截图。原版是原 EXE 运行画面，不是重画的界面。
4. 真实点击打开工具，再观察结果。历史候选在 1280×1024 浏览器中点击屏幕坐标 `(170,82)` 后黑屏；新候选必须根据当前截图/画布位置定位，不能盲用旧坐标。
5. 通过打开后，才继续验证示例 PRJ、创建/编辑、检测、保存与重开。任何学习版原有功能限制须如实记录，不改写 EXE 绕过。
6. 原版流程未完成就保持 FAIL/未验证，不用“无 JS 异常”“引擎正常运行”代替成功。画布黑屏属于实际失败。
7. 只读取小型诊断字段。像素缓冲区只记录类型和长度，不枚举每个索引；保留失败输出而不重复传输巨大结果。
8. 保存日志及精确候选。关闭本轮浏览器并停止自启服务器；REA 新开的 ledger 导出后 reset，再退出。保留 VM 安装与原始样本作为恢复点。

当前验收：**FAIL**。原版未发布到 Vercel；后续若要部署，必须先对明确候选完成核心功能验收，再验证实际部署 URL 的资源、鼠标操作和文件往返。直接部署本仓库独立中文工作台属于另一目标，不能冒称原版 WASM 成功。
