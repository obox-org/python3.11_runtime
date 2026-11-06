# python3.11_runtime（Python 3.11 运行时扩展）

按 obox 主仓库 [`docs/extension-api/oix-platform-rules.md`](../../docs/extension-api/oix-platform-rules.md)
构建：**仓库里只有源码与 CI**，运行时二进制由 GitHub Actions 产出。

- `manifest.json` / `runtime.json` / `index.js`：扩展本体（`author=obox`，`runtime.json` 让

  「设置 → 开发运行时」识别为**内置运行时**）；
- `scripts/build-runtime.mjs`：下载对应架构 python.org embeddable → 装 pip + 预装库 →
  按平台命名打包 `.oix`；
- `.github/workflows/build-oix.yml`：矩阵 `win32-x64` / `win32-arm64`；push tag `v*` 发版，
  手动触发只出 artifact。

产物命名：`python3.11_runtime-3.11.9-win-x64.oix` / `python3.11_runtime-3.11.9-win-arm64.oix`。

## 安装（obox 2.3 起：落系统扩展目录）

运行时包是**用户手动安装**的 `.oix`（不随 obox 打包），但落点与系统扩展一致：

- 目录：`<安装目录>/extensions/python3.11_runtime`（目录名 = 清单 `name`，**不带作者后缀**）；
- obox 按 `runtime.json` 判定它是运行时包并改投系统扩展根；`author` 必须是 `obox`；
- 按机器安装到 `Program Files` 时该目录需要管理员权限（否则报 `need-admin`）——
  用「仅为我安装」装 obox，或以管理员身份运行 obox 后再装；
- 升级 obox 时安装器会先备份、装完再搬回带 `runtime.json` 的目录（备份在新安装器里、早于旧卸载器，
  因此**从任何旧版本升级都覆盖**）；
- 同一 Python 版本只允许一个内置运行时（`runtime-version-conflict`）；
  2.2.x 装在用户目录的 `python3.11_runtime.obox` 重装一次即自动迁移。

## 本地构建

```powershell
npm install adm-zip --no-save
node scripts/build-runtime.mjs --platform win32-x64
```