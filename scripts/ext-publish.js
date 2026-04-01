#!/usr/bin/env node
/**
 * Extension publish script
 * - Bumps manifest version (patch by default, or pass major/minor)
 * - Runs security checks on extension files
 * - Builds extension.zip ready for Chrome Web Store upload
 *
 * Usage:
 *   npm run ext:publish          # bump patch (1.0.1 → 1.0.2)
 *   npm run ext:publish -- minor # bump minor (1.0.1 → 1.1.0)
 *   npm run ext:publish -- major # bump major (1.0.1 → 2.0.0)
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const EXT_DIR = path.join(__dirname, '..', 'extension')
const MANIFEST_PATH = path.join(EXT_DIR, 'manifest.json')
const ZIP_PATH = path.join(__dirname, '..', 'extension.zip')

// ── Colors ──────────────────────────────────────────────
const red = (s) => `\x1b[31m${s}\x1b[0m`
const green = (s) => `\x1b[32m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`
const bold = (s) => `\x1b[1m${s}\x1b[0m`

// ── 1. Bump version ────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
const oldVersion = manifest.version
const parts = oldVersion.split('.').map(Number)

const bump = process.argv[2] || 'patch'
if (bump === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0 }
else if (bump === 'minor') { parts[1]++; parts[2] = 0 }
else { parts[2]++ }

const newVersion = parts.join('.')
manifest.version = newVersion
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
console.log(bold(`\nVersion: ${oldVersion} → ${green(newVersion)}\n`))

// ── 2. Security checks ─────────────────────────────────
console.log(bold('Security scan...\n'))
let issues = 0

const extFiles = []
function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkDir(full)
    else extFiles.push(full)
  }
}
walkDir(EXT_DIR)

const jsFiles = extFiles.filter(f => f.endsWith('.js') || f.endsWith('.html'))

for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf-8')
  const lines = content.split('\n')
  const rel = path.relative(EXT_DIR, file)

  // Check for eval / new Function (code injection risk)
  lines.forEach((line, i) => {
    if (/\beval\s*\(/.test(line) || /new\s+Function\s*\(/.test(line)) {
      console.log(red(`  FAIL: ${rel}:${i + 1} — eval/new Function (code injection risk)`))
      issues++
    }
  })

  // Check for inline event handlers in HTML
  if (file.endsWith('.html')) {
    lines.forEach((line, i) => {
      if (/\bon\w+\s*=\s*["']/.test(line)) {
        console.log(red(`  FAIL: ${rel}:${i + 1} — inline event handler (CSP violation)`))
        issues++
      }
    })
  }

  // Check for hardcoded secrets patterns
  lines.forEach((line, i) => {
    if (/(?:api_key|secret_key|password|token)\s*[:=]\s*['"][^'"]{8,}/i.test(line) &&
        !/supabase|SUPABASE/.test(line) && !/anon/.test(line)) {
      console.log(yellow(`  WARN: ${rel}:${i + 1} — possible hardcoded secret`))
      issues++
    }
  })

  // Check for http:// (should use https://) — ignore XML namespaces like w3.org
  lines.forEach((line, i) => {
    if (/http:\/\/(?!localhost|www\.w3\.org)/.test(line)) {
      console.log(yellow(`  WARN: ${rel}:${i + 1} — insecure http:// URL`))
      issues++
    }
  })

  // Check for innerHTML with dynamic content
  lines.forEach((line, i) => {
    if (/\.innerHTML\s*=/.test(line) && !/\.innerHTML\s*=\s*['"`]/.test(line)) {
      console.log(yellow(`  WARN: ${rel}:${i + 1} — innerHTML with dynamic content (XSS risk)`))
    }
  })

  // Check for document.write
  lines.forEach((line, i) => {
    if (/document\.write\s*\(/.test(line)) {
      console.log(red(`  FAIL: ${rel}:${i + 1} — document.write (security risk)`))
      issues++
    }
  })

  // Check for localhost references (should not be in production)
  lines.forEach((line, i) => {
    if (/localhost/.test(line) && !/\/\/.*comment/.test(line)) {
      console.log(red(`  FAIL: ${rel}:${i + 1} — localhost reference in production code`))
      issues++
    }
  })
}

// Check permissions are minimal
const dangerousPerms = ['<all_urls>', 'webRequest', 'webRequestBlocking', 'cookies', 'history', 'bookmarks']
for (const perm of [...(manifest.permissions || []), ...(manifest.host_permissions || [])]) {
  if (dangerousPerms.includes(perm)) {
    console.log(yellow(`  WARN: manifest.json — broad permission "${perm}"`))
    issues++
  }
}

if (issues === 0) {
  console.log(green('  All checks passed!\n'))
} else {
  console.log(yellow(`\n  ${issues} issue(s) found — review before uploading\n`))
}

// ── 3. Patch notes ──────────────────────────────────────
console.log(bold('Patch notes (changes since last extension update):\n'))

// Find commits that touched extension/ since the last version tag or last ext:publish commit
let patchNotes = ''
try {
  // Try to find last commit that bumped the extension version (i.e. previous ext:publish run)
  const lastBumpCommit = execSync(
    `git log --all --grep="extension" --format="%H" -1 -- extension/manifest.json`,
    { encoding: 'utf-8' }
  ).trim()

  const sinceArg = lastBumpCommit ? `${lastBumpCommit}..HEAD` : '-20'
  const log = execSync(
    `git log ${sinceArg} --pretty=format:"• %s" -- extension/`,
    { encoding: 'utf-8' }
  ).trim()

  patchNotes = log || '(no extension commits found)'
} catch {
  // Fallback: just show recent extension commits
  try {
    patchNotes = execSync(
      `git log -20 --pretty=format:"• %s" -- extension/`,
      { encoding: 'utf-8' }
    ).trim() || '(no extension commits found)'
  } catch {
    patchNotes = '(could not read git log)'
  }
}

console.log(`  ${patchNotes.split('\n').join('\n  ')}\n`)

// Copy-pasteable summary for the Web Store "what's new" field
const cyan = (s) => `\x1b[36m${s}\x1b[0m`
console.log(cyan('  ── Copy for "What\'s new" on Chrome Web Store ──'))
console.log(cyan(`  v${newVersion}`))
console.log(cyan(`  ${patchNotes.replace(/• /g, '- ').split('\n').join('\n  ')}`))
console.log()

// ── 4. Build zip ────────────────────────────────────────
console.log(bold('Building zip...\n'))

// Remove old zip
if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH)

// Use PowerShell on Windows, zip on Unix
const isWin = process.platform === 'win32'
if (isWin) {
  execSync(`powershell -Command "Compress-Archive -Path '${EXT_DIR}/*' -DestinationPath '${ZIP_PATH}' -Force"`)
} else {
  execSync(`cd "${EXT_DIR}" && zip -r "${ZIP_PATH}" . -x "*.svg"`)
}

const zipSize = (fs.statSync(ZIP_PATH).size / 1024).toFixed(1)
console.log(green(`  extension.zip (${zipSize} KB)\n`))

// ── Done ────────────────────────────────────────────────
console.log(bold('Ready to upload!'))
console.log(`  1. Go to https://chrome.google.com/webstore/devconsole`)
console.log(`  2. Click Orianna → Package → Upload new package`)
console.log(`  3. Upload ${bold('extension.zip')} from project root`)
console.log(`  4. Paste the patch notes into "What's new" (optional)`)
console.log(`  5. Submit for review\n`)
