# REA MCP 原生调查验证配方

此表面验证“VM 已安装 REA，并通过 MCP 分析指定原生字节样本”。它不能替代 Windows ETCAD UI 往返。文档变更且运行时字节未变时，可复用已有精确候选的运行记录；不要为了文档更新重复导入分析。

本轮工作路径：仓库 `/workspace/work/ETCAD-rea`，REA 安装 `/workspace/work/rea-runtime`，样本 `/workspace/work/et-binaries/learning-edition/ET_PSV/ET_学习版/ETCOM_PSV.exe`。已实际使用 REA 6.9.0、Ghidra 12.1.4、完整 Temurin JDK 21.0.13+9；项目 `.codex/config.toml` 是 REA `mcp add --agent codex --no-global` 创建的本地注册，被 Git 忽略。

1. 先查看已有 `docs/research/native/` 索引和 VM bundle，记录本轮声明；只有需要新分析时才启动新会话。检查 EXE SHA-256 必须等于 `a2c0df89a37d064b3c00b975a7e0cca68c3b2ad17a5e920d9fddc0ac3daa0aba`，否则按不同样本记录。
2. 本轮实际 stdio 客户端为 `/workspace/work/rea-runtime/mcp_driver.py`。它读取项目注册，发送真实 JSON-RPC，保存 request/response 后才输出小摘要。使用独立证据目录启动：

   ```bash
   ETCAD_MCP_EVIDENCE_DIR=/workspace/work/rea-runtime/mcp-new-evidence \
     python3 /workspace/work/rea-runtime/mcp_driver.py
   ```

3. 观察初始化服务名/版本、实际 `tools/list` 和 `MCP READY`。工具 schema 以这个服务的目录为准。客户端每行接收 `{"name":"binary_session","arguments":{"detail":"summary"},"tag":"ready"}` 一类命令，然后转换为 `tools/call`。
4. `binary_session` 核实 provider 与身份；`open_binary` 的 path 使用上述真实绝对路径，`provider_id = ghidra`。记录目标 hash 与 profile digest，等待默认分析完成。成功运行可能约需 5 分钟；沿同一 handle 等待，不因客户端一次 yield 就重启分析。
5. 从已观测资源/字符串/xref 定位具体函数，再使用 `procedure_pseudo_code`。不识别地址或回复过大时保留失败，遵循对应的 seed/retained-Evidence 指引。seeded fresh import 需在启动前设置 `REA_GHIDRA_SEED_FILE=/workspace/work/rea-runtime/etcom-seeds.tsv`，并记录文件 hash；`ETCAD_candidate_` 名字是调用者标签。
6. 至少检查一个邻近异常路径。当前已有的证据包括无函数定义、新建 thunk 名查询失败与 oversized continuation；不必为重复制造失败而重新运行。
7. 结束前 `close_binary`，然后 `reset_investigation` 带新的绝对 `save_path` 保存 bundle。再次 `binary_session` 必须显示 `open = false`、`cleanup_pending = false`、ledger 清空。最后给客户端 `{"op":"exit"}`，观察 `MCP CLOSED` 与退出码 0。
8. 保存原始 JSON-RPC、stderr、bundle 在 VM；仓库保存必要短摘录、原始文件哈希索引、限制和清理回执。重新计算源 EXE hash，确保未变；不能把静态反编译当成原生鼠标操作、完整几何算法或真实 PRJ 往返。

本轮证据：[原生报告](../../../../docs/research/native/REA-ETCAD-ANALYSIS.md)、[协议节选](../../../../docs/research/native/mcp-protocol-proof.json)、[清理回执](../../../../docs/research/native/cleanup-receipts.json)。完整原始记录在 `/workspace/work/rea-runtime/mcp-evidence/` 与 `/workspace/work/rea-runtime/mcp-seeded-evidence/`。
