# 听雨小镇 · 开发准备

日期：2026-10-20（Asia/Shanghai）。准备工作已完成，且已按用户后续指令完成首个可游玩版本。本目录保留编码前的设计依据，当前成果见 [交付报告](../delivery-v0.1.0.md)。

## 从这里阅读

| 文件 | 内容 |
| --- | --- |
| [design-brief.md](design-brief.md) | 首版体验、五张原型的用途、美术标准、控制与镜头 |
| [world-plan.md](world-plan.md) | 地图方向、尺度、A–G 区域、路线连通性与边界 |
| [asset-plan.md](asset-plan.md) | 建筑/植物/道具/角色清单、制作方式、尺寸及性能预算 |
| [technical-plan.md](technical-plan.md) | 工程结构、依赖、旧代码迁移、开发里程碑和验收 |
| [readiness-report.md](readiness-report.md) | 环境版本、实际验证结果和当前准备状态 |
| [references.json](references.json) | 原型图尺寸、用途、文件校验值 |
| [world-layout.json](world-layout.json) | 灰盒阶段的坐标与路径草案，尚未接入运行时 |

## 原型优先级

- 图 1：主画面、材质、光照、景观层次与第三人称构图。
- 图 2：区域分布、河流与两座桥的拓扑关系。
- 图 3：听雨小院的近景质量、门窗和可进入茶室。
- 图 4：环境组件的造型与材质统一。
- 图 5：角色造型、服装及背包左右方向的唯一建模依据。

原图保存在仓库 `yuanxingtu/`，未修改或重命名。参考图属于美术与设计输入，不作为生产游戏中的大图背景。

## 现在可以执行的命令

在仓库根目录的 PowerShell 中运行：

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run verify
npm.cmd run dev
```

首次安装本机已完成后，可以直接运行后两条命令。`dev` 在 `http://127.0.0.1:5173/` 打开游戏。`npm.cmd run preview` 在端口 4173 预览构建产物。

`npm.cmd` 用于兼容 PowerShell 的脚本执行策略。已有环境使用 Node.js 24.18.0 / npm 11.16.0；依赖由 `package-lock.json` 锁定。缓存写入仓库内 `.cache/`。

旧小院仍可用 `python scripts/serve.py` 在端口 8000 预览，或直接打开根目录的 `index.html`。

## 开始编码后的首个交付

先完成 A 小院—B 街巷—C 广场—D 石桥这一段可以真实行走的场景，验证人物尺度、台阶、碰撞、镜头与日间材质。随后完成东岸、木桥和返程路径，最后补足近景细节和性能优化。每一阶段都保留可运行版本。
