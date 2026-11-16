# AgentBay 原版 Windows 路线：本轮检查

**结论：BLOCKED。** 原版 ETCAD 的 Windows 新建、打开、编辑、测量/检查、保存和重开尚未执行。支持性检查通过不能代替这些步骤。检查日期为 2026-11-16（北京时间）；精确时间与执行记录见 [execution.json](execution.json)。

候选为 [source-manifest.json](source-manifest.json) 固定的 `tools/agentbay/` 文件内容。仓库中的独立中文网页运行时 9 个文件哈希均未变；原版 ETCAD 验收和独立网页的已有通过记录分别报告。

## 实际完成的检查

| 检查 | 观察与证据 |
| --- | --- |
| 官方原包身份 | 复用厂商 `ET_PSV.rar`，SHA-256 与前次实际下载一致；重新安全解包得到 407 文件 |
| 私有传输包 | 提取 242 个应用文件，逐个独立对照前次 RAR 解包哈希；两次新目录重新生成的 ZIP SHA-256 完全一致，均为 `9d89d57e229926985473089e21d8e6120cd4819c5b53673521c6249f22ef95a1`；见 [payload-provenance.json](payload-provenance.json) |
| 完整应用身份保护 | 固定原始文件清单摘要 `f5784b07f648b7605e96c979666e1d586d878910de91eede411e3599466a0d9e`，并核对逐文件大小和 SHA-256；拒绝改过的 EXE、目录穿越和过长 Windows 命令 |
| 官方 SDK | 安装 `wuying-agentbay-sdk==0.22.3`；再次下载官方 wheel 校验 SHA-256，已安装的 252 个 SDK Python 文件逐个与 wheel 相同；解析后的本机依赖见 [sdk-freeze-linux.txt](sdk-freeze-linux.txt) |
| MCP 真实连接 | 用实际 Python 子进程交换 JSON-RPC：initialize、tools/list 的 12 个工具、cloud_plan、缺少 Key 的 cloud_create、非法点击坐标、cloud_stop 和 EOF；见 [请求](mcp-requests.json) 与 [原始回复](mcp-responses.json) |
| 真实项目注册 | 从本地 `.codex/config.toml` 读取已注册启动器再启动，真实观察初始化和工具目录；原 REA 配置保留；见 [project-registration.json](project-registration.json)。没有声称当前聊天热加载了新 MCP |
| 账户/密钥边界 | 缺少 Key 时在调用创建云会话 API 之前拒绝；仅测试明确指定的临时示例 Key 文件与脱敏，不使用真实账户凭据；非终端的 Key 输入被拒绝 |
| PowerShell | 在 Linux 上使用官方便携 PowerShell 7.7.0 解析部署脚本，语法错误 0；真实执行时按预期拒绝 Linux，退出 1，见 [错误主机保护](powershell-host-guard.json)。这不是 Windows 安装测试 |
| 原项目回归 | `npm test`：8/8；`npm run check`：退出 0。9 个网页运行时文件哈希不变，复用既有 12 组真实 Chromium UI 记录；本轮未重新驱动这套网页 UI |
| /verify 来源 | 用户 dot-pi 复制的 9 个原始 skill 文件逐个 SHA-256 未变，新增项目 Windows 验证配方 |

## 运行命令

在仓库根目录执行的核心命令：

```bash
python3 tools/agentbay/prepare.py --archive /workspace/work/et-binaries/ET_PSV.rar --out /workspace/work/agentbay-runtime/official-payload
python3 tools/agentbay/prepare.py --archive /workspace/work/et-binaries/ET_PSV.rar --out /workspace/work/agentbay-runtime/reproduced-payload
/workspace/work/agentbay-runtime/venv/bin/python tools/agentbay/check.py --payload /workspace/work/agentbay-runtime/official-payload/et-learning-private.zip --out /workspace/work/agentbay-runtime/final-check-evidence
python3 -m py_compile tools/agentbay/prepare.py tools/agentbay/cloud.py tools/agentbay/check.py tools/agentbay/save_key.py
npm test
npm run check
git diff --check
```

上述准备/检查命令退出 0；PowerShell 的 Linux 主机拒绝测试按预期退出 1。支持性检查的返回码不改变原生验收的 BLOCKED 结论。

## 阻塞与下一次继续的位置

阿里云账户 API 发现请求返回 `UNAUTHORIZED / requires reauthentication`；当前环境没有 `AGENTBAY_API_KEY`，也没有明确指定的私密 Key 文件。公开官方文档查询成功。浏览器连接器的备用路径也返回不可连接，未修改任何登录页面。

下一步是用户登录 [AgentBay 控制台](https://agentbay.console.aliyun.com/)，在总览/API KEY 管理中准备一个可用 Key，通过 [隐藏输入脚本](../../../tools/agentbay/save_key.py) 或私密环境变量接入。随后按 [Windows 验证配方](../../../.agents/skills/verify/references/rea-agentbay-windows.md) 驱动真实会话，观察该镜像实际 MCP 工具目录、旧版组件和学习版的保存限制，再决定 PASS、FAIL 或 BLOCKED。

当前没有创建云 Windows 会话，没有本工具包产生的 AgentBay 云桌面计算费用，没有原版 Vercel 部署。所有本轮本地 MCP 子进程已在 EOF 后退出；私有部署包保留在 VM 仓库之外，用于下一次继续。供应商二进制、纸样和带凭据链接未提交 GitHub。
