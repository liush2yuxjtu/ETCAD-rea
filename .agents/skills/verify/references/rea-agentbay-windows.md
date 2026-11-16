# REA + AgentBay 原版 Windows 验证

工作目录：仓库根目录。此配方增加原生 Windows 表面；复制自 dot-pi 的 9 个原始 verifier 文件保持不变。

当前已验证的是 Linux 本地 SDK 安装、私有原包身份、stdio MCP 协议、缺少 Key 时拒绝创建和输入/篡改拒绝。云端安装与真实桌面往返尚未执行，不能把以下待执行步骤描述为已通过。

| Claim | Real surface | Required evidence |
| --- | --- | --- |
| 桥接器可连接 | 本地 stdio JSON-RPC | initialize、12 工具目录、plan、缺少 Key 的 isError、退出码 |
| 原版部署成功 | AgentBay 真 Windows + 官方包 | 真实 OS/镜像、上传哈希、242 文件哈希、原 EXE 哈希、启动结果与截图 |
| 原版新建/编辑/复核/保存 | Windows 原版窗口 + 鼠标键盘 | 每步实际交互与截图、修改后的尺寸/轮廓、新保存文件 |
| 保存可读回 | 关闭后由原版重开新文件 | 本轮唯一标记、修改仍在、下载文件哈希；不是原样例复制 |
| REA 实际调查 | 独立 REA MCP | 同一 EXE hash、原始工具回复、Evidence、关闭和清理；复用 rea-native.md 中相同字节证据 |

1. 读 `docs/deployment/AGENTBAY-WINDOWS.md`、本次 diff、SDK 固定版本和私有包路径。运行 `tools/agentbay/check.py --payload <zip> --out <private-evidence>`。这只验证本地桥接；原生结论仍 BLOCKED。
2. 检查 `AGENTBAY_API_KEY` 或 `--key-file` 明确指定的私密文件是否已接入，不打印或检索其他凭据。终端可用 `save_key.py` 隐藏输入；没有 Key 则保留 BLOCKED。阿里云应用 OAuth 与 AgentBay Key 不可互相假定。
3. 由 MCP 客户端启动 `cloud.py --serve --payload <zip> --run-dir <private-directory>`，验证 initialize 和实际 tools/list。代码注册文件不等于当前聊天已加载 MCP。
4. 有授权的账户连接后调用 `cloud_create`，只创建一个项目会话，记录 request ID/session ID/实际镜像，核对计费及 5 分钟 idle / 30 分钟 max runtime。调用 `cloud_deploy` 后截图观察，`LAUNCH_REQUESTED` 不是 GUI 成功。
5. 使用本轮截图上的实际坐标和可见菜单驱动：新建闭合轮廓 → 打开随包 PRJ → 编辑点/曲线 → 实际测量或检查 → 另存 → 关闭 → 重开 → 确认改动仍在。使用至少一个取消操作检查，确保原项目不变。记录学习版限制，不能绕过许可或把禁用保存改成通过。
6. 通过截图和 `collect_project` 保留原始 PNG、修改前后文件、哈希、操作和服务 request ID；记录 OS、位数、依赖、镜像 ID 与 EXE hash。`windows_latest` 是可变别名，不能凭别名宣称严格复现同一镜像。
7. 回写私有 `acceptance.json`：只有全部条件真的驱动并读回，才写一个完整 PASS；失败为 FAIL，无法连接为 BLOCKED。脚本不自动勾选通过。文档与源码只保存脱敏摘要，不提交 Key、签名链接、供应商 EXE/DLL/PRJ。
8. 先导出证据再 `cloud_stop`；正常 EOF 也会尝试删除。保留 cleanup 回执并在控制台读回会话状态。删除失败就记录 session ID 和错误，继续释放本轮拥有的会话；不清理其他会话。不要声称已删除持久化 Context，除非独立核实。

本机已有独立中文网页的运行时源码未变，可按相同内容哈希复用原真实 UI 记录；本配方不把独立网页的通过替代原 EXE 的验收。
