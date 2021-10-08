import chalk from 'chalk'
import fs from 'fs'
import { ncp } from 'ncp'
import { promisify } from 'util'
import path from 'path'
import execa from 'execa'
import Listr from 'listr'
import { projectInstall } from 'pkg-install'

const access = promisify(fs.access)

const copy = promisify(ncp)

const copyTemplateToTarget = async options => {
  const write = (file, content) => {
    const targetPath = renameFiles[file] ? path.join(root, renameFiles[file]) : path.join(root, file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      copy(path.join(templateDir, file), targetPath)
    }
  }

  const files = fs.readdirSync(templateDir)
  for (const file of files.filter(f => f !== 'package.json')) {
    write(file)
  }

  const pkg = require(path.join(templateDir, `package.json`))

  pkg.name = options.packageName || options.targetDir

  write('package.json', JSON.stringify(pkg, null, 2))

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  console.log(`\nDone. Now run:\n`)
  if (root !== cwd) {
    console.log(`  cd ${path.relative(cwd, root)}`)
  }
  switch (pkgManager) {
    case 'yarn':
      console.log('  yarn')
      console.log('  yarn dev')
      break
    default:
      console.log(`  ${pkgManager} install`)
      console.log(`  ${pkgManager} run dev`)
      break
  }
  // return copy(options.templateDir, options.targetDir, {
  //   clobber: false
  // })
}

const initGit = async options => {
  const result = await execa('git', ['init'], {
    cwd: options.targetDir
  })
  if (result.failed) {
    return Promise.reject(new Error('Failed to initialize git'))
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
  _gitignore: '.gitignore'
}

export default async function createSpaApp(options) {
  options = {
    ...options,
    targetDir: options.targetDir || process.cwd()
  }
  const templateDir = path.resolve(new URL(import.meta.url).pathname, '../../template', options.template)
  options.templateDir = templateDir

  const root = path.join(cwd, targetDir)

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
      title: 'Copy project files',
      task: () => copyTemplateToTarget(options)
    },
    {
      title: 'Initialize git',
      task: () => initGit(options),
      enabled: () => options.git
    },
    {
      title: 'Install dependencies',
      task: () => projectInstall({ prefer: 'yarn', cwd: options.targetDir }),
      skip: () => {
        !options.install ? 'Pass --install to automatically install dependencies' : undefined
      }
    }
  ])

  await tasks.run()
  console.log('$s Project ready', chalk.green.bold('DONE'))
  return true
}
