import chalk from 'chalk'
import fs from 'fs'
import { ncp } from 'ncp'
import { promisify } from 'util'
import path from 'path'
import execa from 'execa'
import Listr from 'listr'
import { projectInstall } from 'pkg-install'

const access = promisify(fs.access)
const cwd = process.cwd()

const copy = promisify(ncp)

const pkgFromUserAgent = userAgent => {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1]
  }
}

const copyTemplateToTarget = async options => {
  const write = (file, content) => {
    const targetPath = renameFiles[file] ? path.join(options.root, renameFiles[file]) : path.join(options.root, file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      copy(path.join(options.templateDir, file), targetPath)
    }
  }

  const files = fs.readdirSync(options.templateDir)
  for (const file of files.filter(f => f !== 'package.json')) {
    write(file)
  }

  const pkg = require(path.join(options.templateDir, `package.json`))

  pkg.name = options.packageName || options.targetDir

  write('package.json', JSON.stringify(pkg, null, 2))
}

const initGit = async options => {
  const result = await execa('git', ['init'], {
    cwd: options.targetDir
  })
  if (result.failed) {
    return Promise.reject(new Error('git初始化失败'))
  }
  return
}

const emptyDir = dir => {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const file of fs.readdirSync(dir)) {
    const abs = path.resolve(dir, file)
    // baseline is Node 12 so can't use rmSync :(
    if (fs.lstatSync(abs).isDirectory()) {
      emptyDir(abs)
      fs.rmdirSync(abs)
    } else {
      fs.unlinkSync(abs)
    }
  }
}

const renameFiles = {
  _gitignore: '.gitignore',
  _env: '.env',
  _eslintignore: '.eslintignore',
  _eslintrc_js: '.eslintrc.js',
  _prettierrc: '.prettierrc'
}

export default async function createSpaApp(options) {
  options = {
    ...options,
    targetDir: options.targetDir || process.cwd(),
    root: path.join(cwd, options.targetDir || process.cwd())
  }
  const templateDir = path.resolve(new URL(import.meta.url).pathname, '../../template')
  options.templateDir = templateDir

  const root = path.join(cwd, options.targetDir)

  if (options.overwrite) {
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root)
  }

  try {
    // 检查文件是否存在于当前目录中
    await access(templateDir, fs.constants.F_OK)
  } catch (error) {
    console.error('%s Invalid template name', chalk.red.bold('ERROR'))
    process.exit(1)
  }

  const tasks = new Listr([
    {
      title: '拷贝项目文件',
      task: () => copyTemplateToTarget(options)
    },
    {
      title: '初始化git',
      task: () => initGit(options),
      enabled: () => options.git
    },
    {
      title: '安装项目依赖',
      task: () => projectInstall({ prefer: 'yarn', cwd: options.targetDir }),
      skip: () => !options.install ? '加上 --install 参数，自动安装项目依赖' : false
    }
  ])

  await tasks.run()
  console.log('$s 项目已经准备好', chalk.green.bold('完成！'))

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  console.log(`\nDone. Now run:\n`)
  if (options.root !== cwd) {
    console.log(`  cd ${path.relative(cwd, options.root)}`)
  }
  switch (pkgManager) {
    case 'yarn':
      !options.install && console.log('  yarn')
      console.log('  yarn dev')
      break
    default:
      !options.install && console.log(`  ${pkgManager} install`)
      console.log(`  ${pkgManager} run dev`)
      break
  }
  return true
}
