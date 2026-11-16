# REA MCP 对官方 ETCAD 学习版的原生调查

调查日期：2026-11-16（Asia/Shanghai）。本轮已实际下载官方 ETCAD 学习版，在 VM 安装 REA、Ghidra 和完整 JDK，并通过 **MCP stdio JSON-RPC** 调用了 REA 工具。下文区分下载事实、静态观察、推断与尚未运行的 Windows 操作。

## 下载的具体样本

官网 [ET 软件学习版及教学视频下载](https://www.etsystem.cn/News/detail.html?id=1039) 直接提供学习版包。使用其同主机 HTTPS 地址下载：[ET_PSV.rar](https://download.etsystem.cn/ET_PSV.rar)。

| 项目 | 观察 |
| --- | --- |
| 压缩包 SHA-256 | `28b001a8edf9e21385bc833ed448390c02547195a7facea6e3fff6a4f856a77e` |
| 解包 | 407 个文件，含打板、排料程序、DLL、教学/配置材料和示例 PRJ |
| 主要分析对象 | `ET_PSV/ET_学习版/ETCOM_PSV.exe`，5,025,792 字节，PE32 / x86 |
| 打板 EXE SHA-256 | `a2c0df89a37d064b3c00b975a7e0cca68c3b2ad17a5e920d9fddc0ac3daa0aba` |
| 排料程序 | `ETMark_PSV.exe`，2,105,344 字节，已下载和解包，本报告未对它进行深度分析 |
| 文件版本资源 | 打板 EXE 声明 `2009.1.1.0`，包含 `ETCOM (090101)`、`BUYI`、`ETSYSTEM` 等文本 |

文件版本、PE 时间戳与官方下载页日期并不一致，不能把这个包简单认定为“2009 年原始发行包”或“最新 ETCAD”。本轮取得的是官网当前可下载的学习版具体字节样本。[下载记录](download-provenance.json) 保存了身份信息。

压缩包由 libarchive 解包，拒绝绝对路径、越界路径和非普通文件链接；补充解码脚本只读取文件，没有启动 ETCAD、安装其驱动或修改样本字节。原始包、407 个文件和完整分析输出保留在 VM 工作目录，没有将软件包重新分发到 GitHub。

## 已安装和实际连接的工具

| 组件 | 实际版本和证据 |
| --- | --- |
| REA | 官方 npm 包 `rea-agents@6.9.0`，工作目录 `/workspace/work/rea-runtime` |
| Ghidra | `12.1.4`；官方 NSA 发布 ZIP 的 SHA-256 校验通过 |
| 完整 JDK | Eclipse Temurin `21.0.13+9`；官方下载元数据中的 SHA-256 校验通过 |
| MCP 服务 | 初始化返回 `rea` / `6.9.0`；协商协议 `2025-03-26`；服务端身份 `alignment.state = aligned` |
| MCP 工具目录 | 实际 `tools/list` 返回 255 个工具；并非从 README 猜出的数量 |

[安装版本和校验值](installed-versions.json) · [MCP 服务身份](mcp-server-identity.json)

系统原有 Java 21 只有运行时，REA 的 provider 检查明确要求完整 JDK，因此另行安装了匹配版本的 JDK。未安装不需要的 Hopper、IDA 或其它分析引擎。

使用 REA 自己的 `mcp add --agent codex --no-global` 在本项目的 `.codex/config.toml` 注册服务，加入 Ghidra/JDK 路径。该文件包含 VM 专用绝对路径，留在 VM 并被 Git 忽略。没有改写用户全局 Codex 配置，也没有关闭沙箱或工具审批。

当前聊天不会热加载新增的工具目录，因此本轮使用 VM 内的 stdio MCP 客户端读取同一注册配置，发送真实 `initialize`、`tools/list`、`tools/call` 请求。**不是用 CLI 输出冒充 MCP 调用**；初始化、请求、响应和 stderr 日志都已保存。

## 遵循的 REA 路径

依据 [REA skill](https://github.com/morluto/rea/blob/f14e9a1d282a7155c32f260730f5881d2c3e6c83/.agents/skills/reverse-engineer-anything/SKILL.md)、[连接恢复](https://github.com/morluto/rea/blob/f14e9a1d282a7155c32f260730f5881d2c3e6c83/.agents/skills/reverse-engineer-anything/references/connection-and-recovery.md) 和 [Ghidra 安装与 seeds](https://github.com/morluto/rea/blob/f14e9a1d282a7155c32f260730f5881d2c3e6c83/docs/getting-started/installation.md#ghidra-import-language-and-analysis-seeds)：

1. 检查连接与 provider；读取当前 MCP 工具 schema。
2. `binary_session` 核实正在运行的服务和 Ghidra 可用性。
3. `open_binary` 绑定上述 EXE、SHA-256 和 `ghidra` provider。
4. `inspect_pe_resources` 保存资源位置、类型、语言和 payload 哈希。
5. Ghidra 默认自动分析完成后，通过 `list_strings` 和 `trace_feature` 找具体功能标记，再从 xref 跟到函数。
6. `procedure_pseudo_code` 对已观测函数反编译；菜单入口缺少函数定义时，按文档使用显式 function seeds 做独立分析配置。
7. 保存完整 Evidence bundle，关闭分析目标；最终清理状态记录在后续调用索引中。

第一轮 `list_procedures` 的完整回复超过 10 MiB 传输预算，但分析本身已经完成。按 REA 返回的 continuation 读取同一 retained Evidence，没有提高限制或重复跑整个分析来获取同一个结果。

## 从真实二进制看到的功能

### 资源和命令入口

REA `inspect_pe_resources` 对该 EXE 返回 529 个资源项。Evidence ID：

`ev_e537a92dd0cfa81ad9e6dd6e1ce9bb3a299381b553211ab05a1ca1b0c7be12ab`

它给出资源 payload 的文件位置和哈希，但菜单 payload 本身是 opaque。本轮另外按 Windows MENU 的 UTF-16 结构解码这些已定位字节，得到下面的名称/命令号。因此“菜单标签解码”明确属于**补充本地解码**，没有冒称 REA 自己解码了菜单文字。[菜单记录](menu-bindings.json)

| 菜单入口 | 命令 ID | 能证明什么 |
| --- | --- | --- |
| 文件 → 新建文档 | `0xe100` | 样本包含新建文档入口 |
| 智能工具条 → 曲线编辑 | `0x801a` | 存在独立曲线编辑命令 |
| 打版图标工具 → 提取裁片 | `0x8054` | 线框/元素到裁片存在显式操作边界 |
| 打版图标工具 → 缝边刷新 | `0x804e` | 缝边刷新是独立命令 |
| 打版图标工具 → 缝边宽度 | `0x803c` | 存在缝份宽度编辑入口 |
| 打版图标工具 → 裁片属性 | `0x81e2` | 裁片属性单独编辑 |
| 设置 → 尺寸表 | `0x81bb` | 存在尺寸表入口 |
| 检查与测量 → 拼合检查 | `0x81da` | 存在用于核对拼合关系的检查命令 |
| 检查与测量 → 线上两点拼合检查 | `0x8282` | 存在两点拼合检查命令 |
| 检查与测量 → 安全检测 | `0x84ea` | 存在安全检测入口；标签本身不说明全部检测规则 |

这些是包内资源事实，不证明相应按钮已在真实 Windows 会话中被操作，也不证明学习版没有功能限制。

### 切线/样条相关操作的代码链

默认 Ghidra 字符串列表中找到 `HA_PD_Tangent_Spline_Edition` 的 ASCII 和 UTF-16 两份标记。`trace_feature` 将 UTF-16 标记 `0x7a567c` 的引用定位到 `FUN_00611030`。随后通过 MCP 成功反编译该函数。

代码设置了一个对象的虚函数表、把该标记写入 `CString` 成员、清零状态字段，并写入 `0x169` 标识。它支持“曲线编辑具有独立操作对象/状态”的判断，**不能单凭构造函数就断言已经恢复全部样条求解或鼠标交互算法**。

- [曲线 feature trace](020-curve-feature-trace.json)
- 反编译 Evidence：`ev_3a9954535ca0bc4a852cab6c1ae3cea8793c4b576e5182267bf84f7cc2a2a5ef`

### 封闭裁片查找的相关代码链

`HA_PD_Find_Closed_Pattern` 的 UTF-16 标记位于 `0x7a53cc`，xref 位于 `FUN_0060e490`。MCP 反编译显示该函数设置另一份虚函数表、记录 closed-pattern 标记、分配一个 `0x138` 字节辅助对象并写入 `0x163` 标识。

这支持“封闭裁片查找/提取是独立操作对象”的判断，与包内“提取裁片”菜单对应的功能类别一致。没有仅凭名称就把拓扑搜索、环判断或缝份计算细节认定为已恢复。

- [裁片提取 feature trace](021-extract-feature-trace.json)
- 反编译 Evidence：`ev_55cecb954ba7281ac4819a43c75b808e3d0387164b9be1c74e1099ec7afade1a`

### 检查对话框的代码链

`HA_Integ_Check_Dlg.cpp` 的引用定位到 `FUN_0042f350`。反编译显示它调用 `CDialog::OnInitDialog` 和本地化辅助函数，然后依据对象状态启用/禁用若干控件（如 `0x6c1`、`0x6c2`）。

它证明存在带状态控制的检查对话框初始化逻辑；**这段函数不是几何检查谓词本身**，不能据此声称已验证哪些坏纸样一定报错，也不能推出企业“审批通过”的状态机。

- [检查 feature trace](022-check-feature-trace.json)
- 反编译 Evidence：`ev_df4e0d24ad8d51ed433e6d15e00fd1f30149aa93136d1ddbd70a16d8f25a7627`

上述已发布文件包含必要的短摘录和元数据；完整反编译与 retained inventory 保留在本地 bundle。[短摘录](default-decompilation-excerpts.json) · [原始输出哈希索引](default-evidence-index.json)

### 从菜单候选入口继续追踪

默认分析没有把若干菜单处理地址识别为函数；直接查询得到的失败已保留。按 REA 的 seeds 指引，本轮从补充解码得到的 MFC 风格消息映射中挑出 11 个候选地址，建立第二个独立分析配置。[候选映射](command-handler-candidates.json) · [seeds](etcom-seeds.tsv)

这些函数名以 `ETCAD_candidate_` 开头，是调用者提供的标签，**不是 Ghidra 自动发现的原始名称**。REA 返回 11 个函数创建成功、0 个失败；seed 文件 SHA-256 为 `15fa76f0fa5491fd9c8303d2bbe417eae0764f4d9e985b46df866ce1d308c5e6`。两轮分析使用相同 EXE 字节，但配置 digest 不同，索引分别保存。

曲线命令的映射记录在 `0x74bae0`。REA `read_bytes` 实际读取到 `11010000000000001a8000001a8000000c00000070764800`，与补充解码的 `WM_COMMAND / 0x801a / 0x487670` 记录一致。[原始字节 Evidence](012-curve-command-map-bytes.json)

| 菜单命令 | 静态候选入口及实际解码调用 | 新观察到的边界 |
| --- | --- | --- |
| 曲线编辑 `0x801a` | `0x487670` → `FUN_006aff40` → `FUN_006af3b0` | 分配 `0x1c8` 字节操作对象；构造函数写入 `HA_PD_Spline_Edition` 与 `0x3d` 标识，同时写入传入对象的 `+0x58` 字段 |
| 提取裁片 `0x8054` | `0x488090` → `FUN_005d50a0` → `FUN_005d3370` | 分配 `0xd0` 字节对象；标记 `HA_PD_Hand_Make_Loop`，模式 `0x6a` |
| 缝边刷新 `0x804e` | `0x487da0` → `FUN_0066da70` | 处理函数调用独立控制函数；本轮未继续恢复其偏移和连接算法 |
| 安全检测 `0x84ea` | `0x48a240` → `FUN_00635ca0` → `FUN_00633c00` | 分配 `0x104` 字节对象；标记 `HA_PD_Integ_Check`，模式 `0x13c` |
| 拼合检查 `0x81da` | `0x488280` → `FUN_006828d0` | 与综合检测为不同入口；本轮未证明检测容差和几何规则 |
| 尺寸表 `0x81bb` | `0x4882c0` → `FUN_006c0ad0` | 创建对话框并调用 `CDialog::DoModal` |
| 新建文档 `0xe100` | `0x6fdeca` 被 Ghidra 解析为 `MFC42U.DLL::CWinApp::OnFileNew` thunk | 新建入口委托 MFC 文档机制，尚未追到模板和纸样初始化算法 |

这里的调用链来自实际反编译；菜单与入口的关联来自静态消息映射解释，并未经过点击追踪。最初用 seed 名查询新建函数失败后，本轮按地址解析得到 MFC 导入 thunk，没有把失败重复请求当成成功。

这也进一步限定了前面的字符串结果：`Tangent_Spline_Edition` 是相关操作，主“曲线编辑”候选链实际到达 `Spline_Edition`；`Find_Closed_Pattern` 是封闭查找相关对象，主“提取裁片”候选链实际到达 `Hand_Make_Loop`。不能把同一功能类别下的对象名称混作同一入口。

关键反编译 Evidence：

- 曲线构造函数：`ev_7ffef89a90724d91e333d5d61c24b226fd3d6b7df20c5f9b1733e003a5cc6b30`
- 提取裁片构造函数：`ev_f8317495c24ec8c1687537e73c8d35a2767eb25bc6752476eda7c53e63284c3a`
- 综合检测构造函数：`ev_1189f05b7bccd55c1fac17641cb976426ff7411c81a245689a03166f03ffb731`
- 尺寸表控制函数：`ev_f2a2bca3477adb9d0a4ba3ccfa9fe088e7be3ddca063ea1580cf02cfec24dc36`

[第二轮 Evidence 索引](seeded-evidence-index.json) · [有限代码摘录](seeded-decompilation-excerpts.json) · [新建文档 thunk 解析](017-new-document-resolution.json)

### 综合检测有哪些可见项目

在 REA 定位的中文对话框资源 `RT_DIALOG / 505 / 2052` 中，补充 UTF-16 解码观察到“综合检测”“要素检测”“刀口检测”“裁片检测”“重点检测”，以及“缝边连接检测结果”“缝边刷新检测结果”“裁片面积检测结果”“裁片序号检测结果”“缝边宽度检测结果”和“重新检测计算”。[资源身份与标签](check-dialog-labels.json)

这些标签支持“审查纸样几何与数据”的用途；它们没有给出实际判定公式、容差或错误样本结果。也没有证明存在企业审批角色或与本项目相同的确认流程。

## 新建、编辑、检查与本项目的关系

| 环节 | 原生样本支持的观察 | ETCAD-rea 的独立实现 |
| --- | --- | --- |
| 新建 | 新建文档入口委托 MFC；PRJ 文档类型资源、包内示例 PRJ | 上衣/裙版模板、款号/号型、JSON 保存 |
| 编辑 | 曲线、手动成环操作对象；独立缝边刷新入口；模态尺寸表 | SVG 点/曲线编辑、尺寸驱动保留偏移、刀口、统一缝份与参考版 |
| 检查 | 综合检测对象、拼合检查入口、检查对话框初始化及检测项目标签 | 独立轮廓/侧缝检查与中文意见 |
| 审批 | 本轮未证明原生 ET 有与本项目相同的“意见→解决→确认 revision”流程 | 本地审版锁定是本项目设计，不能冒称复制了 ET 企业审批 |

没有将本样本的专有反编译代码复制到应用。现有几何公式与审版状态机继续按独立实现及其局限描述；不把新取得的静态证据倒推为第一轮曾经做过逆向。

## 真实运行仍未观察的部分

本 VM 是 Linux，本轮没有运行 Windows ETCAD，也没有 Windows/Wine UI 会话证据。没有对创建 PRJ、修改原生点、执行原生检测和重新打开文件做实机往返验证；`.prj` 的完整序列化与几何算法也没有恢复。当前可交付的层次是**真实二进制静态调查 + MCP 连接/分析证据**。

用户实际生产版本、最新 ETS/线上客户端、多版本兼容性和专业制版结果仍是后续不同问题；本学习版不代替它们。

## 验证与清理

真实调用经过 MCP 初始化、目录发现和 `tools/call`，目标 hash、provider 和分析配置均由 REA 回复绑定。[协议证据节选](mcp-protocol-proof.json) 保留了初始化、新建函数解析和消息映射字节读取的原始请求/回复；代码只发布必要摘录。

最终 `close_binary` 成功，`reset_investigation` 将 16 条 Evidence 保存为本地 bundle 后清空 ledger；再次查询得到 `open = false`、`cleanup_pending = false`、Evidence/unknown 均为 0。随后 stdio 客户端正常退出。[清理回执](cleanup-receipts.json) · [验证范围](VERIFICATION.md)

## 原始材料在 VM 的位置

- 官方压缩包与解包：`/workspace/work/et-binaries/`
- 安装与 provider：`/workspace/work/rea-runtime/`
- 默认分析 MCP 请求/回复及导出 bundle：`/workspace/work/rea-runtime/mcp-evidence/`
- 显式 seeds 分析：`/workspace/work/rea-runtime/mcp-seeded-evidence/`
- 项目级 MCP 注册：仓库本地 `.codex/config.toml`

后续应复用这些样本和 Evidence，不必重新下载同一个文件或把字符串命中当成运行时行为。
