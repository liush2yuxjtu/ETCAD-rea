# ETCAD 版本与更新目录

整理日期：2026-11-16（Asia/Shanghai）
产品对象：深圳市布易科技有限公司的 ET 服装 CAD（ETSYSTEM）
用途：识别可供后续验证的新建纸样、编辑和检查流程版本，供 ETCAD-rea 项目选型。

目前可核实的版本体系应按 **PRJ 线下版、ETS 线下版、ETCAD 线上版** 理解。公开资料还出现许多年款/渠道名称，它们不能直接对应官方产品代际。已读取的厂商关联手册列出 **14 条线上更新记录**，标题从 `210513` 到 `250617`；这里完整收录该目录列出的 14 条，不将它称为全部历史二进制构建清单。[官方手册目录](https://www.yuque.com/tqmbsl/izd1g6)

## 官方产品代际

| 名称 | 官方可证实的时间/地位 | 主要区别 | 依据 |
| --- | --- | --- | --- |
| ETCAD PRJ 线下版 | 厂商称从 2003 年服役，2022 年停止升级 | 本地文件体系，传统 PRJ 代际；现存版本/渠道号不能仅凭文件名判定 | [为什么需要升级 ETS，2022-12-13](https://www.etsystem.cn/News/detail.html?id=1159) |
| ET 官方学习版 ET_PSV | 官网提供公开 RAR 包；本轮已下载、解包并静态分析 | 含 `ETCOM_PSV.exe`、`ETMark_PSV.exe`、DLL 和示例 PRJ。打板 EXE 声明文件版本 `2009.1.1.0`，不能据此认定包发布于 2009 年 | [官方下载页](https://www.etsystem.cn/News/detail.html?id=1039)；[原生取证记录](native/REA-ETCAD-ANALYSIS.md) |
| ET2021 线下版本 | 官方 210629 更新明确使用“ET2021”名称 | 线下用户可通过正规服务商升级，以获得缝制模板功能 | [210629 更新](https://www.yuque.com/tqmbsl/izd1g6/lwpght) |
| ETS 线下版 | 厂商说明于 2022 年正式推出 | 有锁离线、本地存储；数字密钥文件保护；参数化/部件化/框架化版型库；可自愿使用数据服务平台交换文件 | [ETS 版说明，2022-07-25](https://www.etsystem.cn/News/detail.html?id=1150) |
| ETCAD 线上版 | 官方手册及 2021–2025 更新记录可证实 | 无锁联网；属于需安装的 CAD 客户端，与 ET 数据服务平台配套，不应误认为纯浏览器 CAD | [官方操作流程](https://www.yuque.com/tqmbsl/izd1g6/ie0vid)；[安装说明](https://www.yuque.com/tqmbsl/izd1g6/hog1vi)；[线上/线下区别](https://www.etsystem.cn/News/detail.html?id=1150) |
| 线上版生产模式 | 220919 更新增加的操作模式，不是单独产品代际 | 接近线下操作，支持选择本地文件进入排料，减少“移交”的操作概念 | [220919 更新](https://www.yuque.com/tqmbsl/izd1g6/bn50cg) |

“ET2021”与 PRJ/ETS/线上版并非互斥的同一级分类：前者是官方用过的年份名称，后者描述产品代际或部署方式。不要将这些行简单相加为独立 SKU 总数。

厂商 2022 年文章称 ETS 可兼容既有 PRJ，并将 ETS 文件结构用于线上与线下产品交换；此为厂商声明，未在本次执行跨版本文件兼容测试。[2022 年产品升级说明](https://www.etsystem.cn/News/detail.html?id=1143)

## 官方线上版更新记录

以下标签全部来自官方关联语雀手册的链接与正文，已逐条读取。日期由标题中的 YYMMDD 解释，**不是安装包签名、完整构建号或独立核验的首次发布日期**。例如标题 `240611` 的页面元数据显示在 2025 年建立，不能把页面上传日期当成该标签代表的版本日期。

| 更新标签 | 日期含义 | 与纸样工作相关的变化摘要 | 来源 |
| --- | --- | --- | --- |
| 210513 | 2021-05-13（标题标签） | 开放裁片信息检测、参照层、参数化改版；尺寸表增加纸样与成衣差值；新智能点强吸附。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/hignzk) |
| 210629 | 2021-06-29（标题标签） | 支持打版直接输出 PLT；款名与项目名联动；增加缝制模板；明确提及线下 ET2021。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/lwpght) |
| 210909 | 2021-09-09（标题标签） | 优化缝制模板、裁片属性、曲线组调整；F1 可跳转对应教学视频。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/inu6oa) |
| 211221 | 2021-12-21（标题标签） | 测量倍率值可联动尺寸表；综合检测明确不同号型与净边/缝边的面积异常规则；改进刀口联动。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/vphyl6) |
| 220413 | 2022-04-13（标题标签） | 另存为与项目设置合并；裁片信息表增加净/毛周长；改进物料检测和缩水保护。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/qu9asi) |
| 220427 | 2022-04-27（标题标签） | 增加空项目 ID 与异常刀口检测；提供重新登录；改进排料保护。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/mwzq20) |
| 220428 | 2022-04-28（标题标签） | 修复裁切刀口 bug；通知使用切割 PLT 和裁床文件的用户手动更新。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/wmu5ht) |
| 220919 | 2022-09-19（标题标签） | 增加生产模式、层间拷贝及曲线精度设置；可从本地文件进入排料；增加裁片锁定。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/bn50cg) |
| 221221 | 2022-12-21（标题标签） | 旋转吸附、纱向文字、衣褶刀口和放码量显示优化；增加系统尺寸表及 PLT 追加。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/axvg2wfk6gl8xgh4) |
| 240424 | 2024-04-24（标题标签） | 优化 DXF 打开、衣褶刀口、角度测量、裁片属性库和拼合检查；增加附加放码点拷贝。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/faeqksamq4wtolhk) |
| 240611 | 2024-06-11（标题标签） | 增加缝边宽度增量模式、跨线距离刀口、尺寸表排序和非参数部位；支持查看当前 ETS 属性。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/mw0lnxbewghkgbto) |
| 241210 | 2024-12-10（标题标签） | 增加文件合并层、粘贴打开、角处理检测；优化双文档拷贝及移动点层间距离显示。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/yg2df3v71pl95g9l) |
| 250425 | 2025-04-25（标题标签） | 优化纱向调整、参考文档测量、裁片信息一览表；支持全码毛面积与更多裁片信息输出。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/aezc4ui83ngqnrmc) |
| 250617 | 2025-06-17（标题标签） | 新增乙方修改款名另存为、版权转移；改进文字同步修改；接入 ET 云排。 | [官方更新说明](https://www.yuque.com/tqmbsl/izd1g6/sx0utlpvmwf5v7tb) |

这 14 条记录的最新**标题标签**是 `250617`。它不证明 2025-06-17 是产品的最新构建，也不证明此后没有更新。已读取目录没有列出 2023 年的单独更新页；不能据此断言该年没有发布。机器可读索引保存于 [releases.json](releases.json)。

## 历史年款与渠道名称

以下 10 个年份系列是在本次材料中找到的名称。除 ET2021 有直接官方文字外，其余行主要来自第三方目录，**只证明该名称被使用，不证明它是厂商正式版本名、原始发布日期、正版安装包或安全下载**。第三方条目的“更新时间”也不是软件发行日期。

| 年份系列 | 发现的名称/别名 | 证据等级与说明 |
| --- | --- | --- |
| ET2008 | 旗帜版、稳定版、旗帜版企业版 | 第三方目录及列表；同年多个标签不可合并成一个已核验构建。[合集](http://www.58cad.com/soft.asp?id=193) · [目录第4页](http://www.58cad.com/search.asp?keyword=et&page=4) |
| ET2009 | 领航版 | 第三方目录名称；教学中的“二代”称呼不足以唯一识别构建。[合集](http://www.58cad.com/soft.asp?id=193) · [ET2009 教学目录](https://www.shanbenjiaoyu.com/forum-25-1.html) |
| ET2012 | 企业版、新版 | 仅第三方目录名称。[合集](http://www.58cad.com/soft.asp?id=193) · [目录第2页](http://www.58cad.com/search.asp?keyword=et&page=2) |
| ET2015 | 引擎版 | 仅第三方合集名称。[合集](http://www.58cad.com/soft.asp?id=193) |
| ET2017 | 引擎版、万能版、制定版/定制版 | 第三方条目命名不一致，不能等同为相同二进制。[合集](http://www.58cad.com/soft.asp?id=193) · [目录第2页](http://www.58cad.com/search.asp?keyword=et&page=2) |
| ET2018 | 自动滚轮普通版、增强版 | 同一合集的文字与图片标题不同，保留两种名称，不推断其官方关系。[合集](http://www.58cad.com/soft.asp?id=193) |
| ET2020 | 高级定制版、订制版 | 第三方教程/目录使用的名称，尚无原始安装包/签名。[第三方目录](http://www.58cad.com/search.asp?keyword=et) |
| ET2021 | ET2021 线下版本 | 官方明确提及；未取得具体补丁号或安装包。[官方 210629 更新](https://www.yuque.com/tqmbsl/izd1g6/lwpght) |
| ET2022 | 万能高级定制版 | 第三方列表名称，不应直接等同于官方 ETS 线下版。[目录第2页](http://www.58cad.com/search.asp?keyword=et&page=2) |
| ET2023 | 高级定制增强引擎版 | 第三方列表名称；页面更新时间在 2024 年，并非 2023 年发行的证明。[第三方目录](http://www.58cad.com/search.asp?keyword=et) |

第三方目录共显示 30 条相关项目，包含大量教程，并非 30 个软件版本。本次读取了其 4 页列表及历史版本合集，排除了课程、其它品牌软件、仅有年份的页面导航和同名网络设备。搜索中出现的“ET2024”“ET2026”等商城/聚合标题没有达到确认正式版本的标准；没有因此编造 ET2024、ET2025、ET2026 连续发布序列。2002 年研发起点和 2003 年 PRJ 服务起点也不被当成名为 ET2002 或 ET2003 的正式发行版。

## 相关产品与模块

这些名称有官方来源，但**不是服装 CAD 的连续版本号**。

| 名称 | 关系 | 来源 |
| --- | --- | --- |
| ETBAG | 箱包 CAD 产品线 | [厂商产品沿革](https://www.etsystem.cn/News/detail.html?id=1143) |
| ETFSM | 家具 CAD 产品线 | [厂商产品沿革](https://www.etsystem.cn/News/detail.html?id=1143) |
| ET 缝制工艺系统 | 可提供缝制模板功能的相关系统；线上、线下 CAD 也可获得该能力 | [210629 更新](https://www.yuque.com/tqmbsl/izd1g6/lwpght) |
| ET 睿排 / 超级自动排 | 排料引擎/功能；不等同于新纸样编辑器的版本 | [官方教程分类](https://www.etsystem.cn/News/detail.html?id=1164)；[厂商云排介绍](https://www.etsystem.cn/News/detail.html?id=1215) |
| ET 云排 | 云端自动排料服务，官方 2025-07-08 文章说明兼容线上/线下多版本 | [官方云排介绍](https://www.etsystem.cn/News/detail.html?id=1215) |

## 文件类型与版本识别

| 文件类型 | 官方文档中对应的用途 | 判断限制 |
| --- | --- | --- |
| `.prj` | 传统打板纸样文件 | 后续版本可读取旧格式；扩展名不能唯一识别软件年份 |
| `.ets` | 线上版打板文件、ETS 代际纸样文件 | 线上与线下均可能使用，须进一步查看 About/文件属性 |
| `.pla` → `.plw` | 线上版文档描述的排料文件类型变化 | 排料文件不等于打板纸样 |
| `.plc` | 只读排料文件；只保留检查/打印类操作 | 不等同于纸样文件的审版确认或企业审批 |

依据：[官方操作流程 §2.3.3、§4.4](https://www.yuque.com/tqmbsl/izd1g6/ie0vid)；[只读排料文件说明](https://www.etsystem.cn/News/detail.html?id=1042)。

## 选择后续分析目标

建议以**可合法取得的当前 ETS 或线上版具体构建**作为后续实机对象，同时保存一个有明确来源的 PRJ 文件样例用于兼容观察。选择应落实到帮助/About 中的完整版本号、模块名（打板/推板/排料）、可执行文件路径、数字签名和 SHA-256，而不是仅写“ET2020”或“万能版”。

官方安装文档要求登录 ET 数据服务平台，在“技术支持”里下载线上版本安装包；线下升级通过正规服务商办理。[官方安装文档](https://www.yuque.com/tqmbsl/izd1g6/hog1vi) · [官方购买入口](https://www.etsystem.cn/Links/buySofts.html)

本目录保存来源和名称，不保存安装程序、注册码或第三方修改版下载内容。当前资料足以设计相似的中文二维工作流，尚不足以对 ETCAD 的内部数据结构、曲线算法或某个版本的实际兼容性作结论。

## 覆盖边界

可确认：PRJ/ETS/线上产品关系、官方使用的 ET2021 名称、手册目录中的 14 条更新、10 个年份系列的出处、相关模块及主要文件扩展名。

尚未建立：厂商所有历史补丁/构建的完整注册表、各年款标签对应的原始二进制、Windows 签名/哈希、全部客户定制版及 2026 年最新构建。没有公开总表时，“找到所有版本”只能落实为上述可追溯的已发现目录，不能冒充全量发行史。

补充取证已保存官方学习版压缩包与其中打板程序的 SHA-256，见 [download-provenance.json](native/download-provenance.json)。这只补齐该具体样本的身份，不代表其余历史年款已经取得或验证。

## 来源入口

- [ET 官网](https://www.etsystem.cn/)：厂商身份、产品和服务入口。
- [官方教学资料汇总](https://www.etsystem.cn/News/detail.html?id=1164)：指向布易科技语雀手册与 B 站合集。
- [官方关联手册总目录](https://www.yuque.com/tqmbsl/izd1g6)：本次 14 条更新的目录。
- [官方 2022 年代际升级说明](https://www.etsystem.cn/News/detail.html?id=1143)。
- [官方 ETS 离线/线上区别](https://www.etsystem.cn/News/detail.html?id=1150)。
- [官方 PRJ 停止升级说明](https://www.etsystem.cn/News/detail.html?id=1159)。
- [第三方历史合集](http://www.58cad.com/soft.asp?id=193)和[四页搜索列表](http://www.58cad.com/search.asp?keyword=et)：仅用于历史名称线索，不作为下载推荐。
