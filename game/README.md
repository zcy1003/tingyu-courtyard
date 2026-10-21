# 听雨小镇游戏工程

本目录是 v0.2.0 的 Vite 根目录。在仓库根目录运行 `npm.cmd run dev`，访问 `http://127.0.0.1:5173/`。

运行时代码位于 `src/`：

- `config.ts`：56×56 米街区、建筑列表、七处地点与路线；地图绘制共用这些坐标。
- `world.ts` / `environment.ts` / `builder.ts`：底座、河岸、桥、建筑、陈设、轮廓线与区域实例化。
- `materials.ts`：赛璐璐色阶、干净的夜色材质、湿石与陶器；`environment-geometry.ts`：瓦、石板、陶器与叶簇。
- `night-lighting.ts`：暖灯位置、灯晕、地面光晕，以及按距离选择的局部点光源。
- `wet-surfaces.ts`：独立的湿地/河道反射面、波纹、更新节流与画质设置；`rain.ts`：避开屋顶的雨丝。
- `rendering.ts`：线性空间内的接触阴影、细轮廓与四分之一分辨率柔辉，统一输出颜色变换。
- `character-model.ts` / `player.ts` / `camera.ts`：人物、Rapier 行走与镜头避障；`main.ts`：游戏生命周期和界面。
- `audio.ts`：程序合成雨声与滴水；`atmosphere.ts`：夜空；`waterfront.ts`：舟船。

模型、材质与声音在代码中生成，不依赖外部 GLB/贴图/音频下载。初版 `index.html`、`src/`、`vendor/` 和 Python 构建流程保持为独立基线。

本轮设计和验证见 [`../docs/delivery-v0.2.0.md`](../docs/delivery-v0.2.0.md)。
