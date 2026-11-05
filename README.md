# python3.11_runtime（Python 3.11 运行时扩展）

按 obox 主仓库 [`docs/extension-api/oix-platform-rules.md`](../../docs/extension-api/oix-platform-rules.md)
构建：**仓库里只有源码与 CI**，运行时二进制由 GitHub Actions 产出。

- `manifest.json` / `runtime.json` / `index.js`：扩展本体（`author=obox`，`runtime.json` 让

  「设置 → 开发运行时」识别为**内置运行时**）；
- `scripts/build-runtime.mjs`：下载对应架构 python.org embeddable → 装 pip + 预装库 →
  按平台命名打包 `.oix`；
- `.github/workflows/build-oix.yml`：矩阵 `win32-x64` / `win32-arm64`；push tag `v*` 发版，
  手动触发只出 artifact。

产物命名：`python3.11-3.11.9-win-x64.oix` / `python3.11-3.11.9-win-arm64.oix`。

## 本地构建

```powershell
npm install adm-zip --no-save
node scripts/build-runtime.mjs --platform win32-x64
```