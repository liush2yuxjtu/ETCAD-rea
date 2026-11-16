# 官方学习版与 REA MCP 调查验证

日期：2026-11-16。本轮声明的范围是：**官方学习版已下载，REA 已在 VM 安装，通过真实 MCP 调用完成特定 EXE 的静态调查，并保存证据。** 此范围结论为 **PASS**。

验证对象为 `ETCOM_PSV.exe`，SHA-256 `a2c0df89a37d064b3c00b975a7e0cca68c3b2ad17a5e920d9fddc0ac3daa0aba`；REA `6.9.0`、Ghidra `12.1.4`。遵循项目 [verify skill](../../../.agents/skills/verify/SKILL.md) 的真实调用边界要求与 REA 原生调查路径。未将原生 Windows UI 操作或生产级几何兼容性列入通过声明。

| 检查 | 实际观察与证据 |
| --- | --- |
| 官方样本 | 从厂商文章链接取得 `ET_PSV.rar`，解出 407 个文件；包和主 EXE 哈希见 [下载身份](download-provenance.json) |
| Provider | Ghidra scoped doctor `healthy = true`；系统原 JRE 不满足要求，安装完整 JDK 后通过。未将其它未安装 provider/全局客户端注册视为必需条件 |
| 真实 MCP 边界 | VM stdio 客户端读取项目注册，实际发送 `initialize` → `tools/list` → `tools/call`；服务 `rea/6.9.0`，255 个工具，身份 aligned；见 [协议节选](mcp-protocol-proof.json) 和 [服务身份](mcp-server-identity.json) |
| 目标绑定 | `open_binary` 的 subject、provider、配置 digest 绑定具体 EXE；[默认索引](default-evidence-index.json) 与 [seeded 索引](seeded-evidence-index.json) 分别保留 |
| 功能追踪 | 资源/字符串 → xref → 已识别函数 → 实际反编译；随后对消息映射候选进行显式 seeds 分析；[报告](REA-ETCAD-ANALYSIS.md) 逐项列出观察、候选关联与限制 |
| 相邻异常路径 | 默认分析无法识别的处理函数查询保留为失败，依 REA 指引进行独立 seeded import；新建 seed 名查询失败后按地址识别为 MFC thunk；完整列表响应过大时沿 retained Evidence continuation 读取，没有重复分析同一请求 |
| 来源字节 | 分析结束后重新计算 EXE SHA-256，与分析前一致；seed 文件 SHA-256 与 REA profile 相符 |
| 生命周期 | `close_binary` 成功；`reset_investigation(save_path)` 保存 16 条记录；最终 `open = false`、`cleanup_pending = false`、Evidence/unknown 均为 0；客户端正常退出。见 [回执](cleanup-receipts.json) |

完整 bundle、原始 JSON-RPC 日志和软件包留在 VM；仓库只包含身份元数据、有限摘录和原始文件哈希索引。公开的菜单/对话框文字是依据 REA 所定位 payload 进行补充结构解码，未标成 REA 自带菜单解析或运行时录像。

此次应用运行时没有改变：与 [首轮 source manifest](../../verification/source-manifest.json) 对照的 9 个文件哈希均一致。原应用的 8 个测试及 12 组浏览器场景属于首轮记录，本轮没有重复执行，也没有冒称新做了应用 UI 验证。文档更新的应用运行时验证为 **SKIP**；Word/PDF 已重新生成并进行结构与实际渲染检查，见 [文档检查记录](document-checks.json)。已将本轮实际使用的 [MCP 操作配方](../../../.agents/skills/verify/references/rea-native.md) 补入项目 verifier；原 dot-pi 的 9 个 skill 文件哈希不变。

本轮仍未运行 ETCAD Windows 界面，也未完成原生 PRJ 创建、编辑、检测、保存和重开往返。这些行为没有获得 PASS；详细几何算法和多版本兼容性保持未解决。该限制不改变上述真实下载、安装和 MCP 静态调用事实。
