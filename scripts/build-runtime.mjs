/**
 * 构建 Python 运行时扩展的 `.oix`（在扩展仓库内运行；CI 与本地共用）。
 *
 * 规则见 obox 仓库 `docs/extension-api/oix-platform-rules.md`：
 *   universal → `<name>-<ver>.oix`；win32 → `-win`；win32-x64 → `-win-x64`；win32-arm64 → `-win-arm64`
 *
 * 用法（Windows 上运行）：
 *   node scripts/build-runtime.mjs --platform win32-x64
 *   node scripts/build-runtime.mjs --platform win32-arm64
 *
 * 依赖：`npm install adm-zip --no-save`（CI 里由 workflow 负责安装）。
 */
import AdmZip from 'adm-zip'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = dirname(dirname(fileURLToPath(import.meta.url)))
const args = process.argv.slice(2)
const argOf = (name, fallback) => {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
}

const platform = argOf('platform', 'win32-x64')
const SUFFIX = {
  universal: '',
  win32: '-win',
  'win32-x64': '-win-x64',
  'win32-arm64': '-win-arm64'
}
if (!(platform in SUFFIX)) {
  console.error(`[pack] 未知平台：${platform}（规则见 docs/extension-api/oix-platform-rules.md）`)
  process.exit(1)
}
const archToken = platform.split('-')[1] ?? 'x64'
// python.org 命名与 Node 不同：x64 → amd64（arm64 同名）
const arch = archToken === 'x64' ? 'amd64' : archToken
const manifestSrc = JSON.parse(readFileSync(join(repo, 'manifest.json'), 'utf8'))
const pythonVersion = manifestSrc.version
const name = manifestSrc.name
const libs = (argOf('libs', 'numpy pandas matplotlib') || '').split(/\s+/).filter(Boolean)

const work = join(repo, '.build', `python-${platform}`)
const outFile = join(repo, 'release', `${name}-${pythonVersion}${SUFFIX[platform]}.oix`)
console.log(`[pack] ${name} ${pythonVersion} / ${platform} / libs ${libs.join(', ')}`)

rmSync(work, { recursive: true, force: true })
mkdirSync(work, { recursive: true })
mkdirSync(join(repo, 'release'), { recursive: true })

// 1) 下载对应架构的 embeddable 发行版
const zipUrl = `https://www.python.org/ftp/python/${pythonVersion}/python-${pythonVersion}-embed-${arch}.zip`
const zipPath = join(work, 'python-embed.zip')
console.log(`[pack] 下载 ${zipUrl}`)
execFileSync('powershell', ['-NoProfile', '-Command', `Invoke-WebRequest -Uri '${zipUrl}' -OutFile '${zipPath}'`], { stdio: 'inherit' })
execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${work}' -Force`], { stdio: 'inherit' })

// 2) 打开 site-packages（embeddable 默认不带）
const shortVersion = pythonVersion.split('.').slice(0, 2).join('')
writeFileSync(join(work, `python${shortVersion}._pth`), `python${shortVersion}.zip\r\n.\r\nLib\\site-packages\r\nimport site\r\n`)
mkdirSync(join(work, 'Lib', 'site-packages'), { recursive: true })

// 3) pip + 预装库
const py = join(work, 'python.exe')
const getPip = join(work, 'get-pip.py')
execFileSync('powershell', ['-NoProfile', '-Command', `Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '${getPip}'`], { stdio: 'inherit' })
execFileSync(py, [getPip, '--no-warn-script-location'], { stdio: 'inherit' })
execFileSync(py, ['-m', 'pip', 'install', '--no-warn-script-location', '--disable-pip-version-check', ...libs], { stdio: 'inherit' })
execFileSync(py, ['-c', `import ${libs.map((l) => l.replace(/-/g, '_')).join(', ')}; print('imports ok')`], { stdio: 'inherit' })

// 4) 组装扩展目录
const stage = join(repo, '.build', `stage-${platform}`)
rmSync(stage, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })
const manifest = {
  ...manifestSrc,
  platforms: [platform],
  // 清单里的 python 声明是**顶层** `arch` + `python`（见 oixCore → validatePythonDeclaration）
  arch,
  python: shortVersion
}
writeFileSync(join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2))
cpSync(join(repo, 'runtime.json'), join(stage, 'runtime.json'))
cpSync(join(repo, 'index.js'), join(stage, 'index.js'))
cpSync(work, join(stage, 'python'), { recursive: true })

// 5) 打包（adm-zip 保证条目用 `/`）
if (existsSync(outFile)) rmSync(outFile, { force: true })
const zip = new AdmZip()
zip.addLocalFolder(stage)
zip.writeZip(outFile)
console.log(`[pack] 产物：${outFile}`)
