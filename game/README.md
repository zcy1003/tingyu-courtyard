# 听雨小镇游戏工程

本目录是听雨小镇 v0.1.0 的 Vite 根目录，包含可运行的第三人称漫游游戏。

在仓库根目录运行 `npm run dev`；访问 `http://127.0.0.1:5173/`。

准备工作入口：[`../docs/preproduction/README.md`](../docs/preproduction/README.md)。

运行时代码位于 `src/`：`main.ts` 负责游戏生命周期与界面，`world.ts` / `environment.ts` 构建环境，`builder.ts` 做区域实例化，`character.ts` / `player.ts` / `camera.ts` 负责角色、移动与镜头，`physics.ts` 包装 Rapier，`materials.ts` 生成材质与植被遮罩，`audio.ts` 合成环境声。

2026-10-21 画面更新还包含 `character-model.ts` 的人物曲面与配件、`environment-geometry.ts` 的石板/陶器/叶簇几何、`atmosphere.ts` 的天空与远山、`waterfront.ts` 的舟船，以及 `rendering.ts` 的深度接触阴影。水面平面倒影与三档质量策略位于 `world.ts`。变更与实机证据见 [`../docs/art-refinement-2026-10-21.md`](../docs/art-refinement-2026-10-21.md)。

当前模型、材质与声音在代码中生成，不需要外部 GLB/贴图/音频下载。未来文件资产可以放在 `public/assets/`。原项目根目录的 `index.html`、`src/`、`vendor/` 和 Python 构建流程是旧版小院基线。
