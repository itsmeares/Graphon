import fs from 'fs'
import path from 'path'

const filesToPatch = [
  'node_modules/@electron/rebuild/lib/clang-fetcher.js',
  'node_modules/app-builder-lib/node_modules/@electron/rebuild/lib/clang-fetcher.js'
]

filesToPatch.forEach((filePath) => {
  const fullPath = path.resolve(filePath)
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8')
    if (content.includes("import tar from 'tar';")) {
      content = content.replace("import tar from 'tar';", "import * as tar from 'tar';")
      fs.writeFileSync(fullPath, content)
      console.log(`Successfully patched ${filePath}`)
    } else if (content.includes("import * as tar from 'tar';")) {
      console.log(`${filePath} is already patched.`)
    } else {
      console.log(`Could not find target import in ${filePath}`)
    }
  } else {
    // console.log(`${filePath} does not exist.`);
  }
})
