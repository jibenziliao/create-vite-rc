import arg from 'arg'
import inquirer from 'inquirer'
import path from 'path'
import createSpaApp from './main'

const fs = require('fs')
const argv = require('minimist')(process.argv.slice(2), { string: ['_'] })
const cwd = process.cwd()

// 解析输入参数
const parseArgsIntoOptions = rawArgs => {
  const args = arg(
    {
      '--git': Boolean,
      '--yes': Boolean,
      '--install': Boolean,
      '--help': Boolean,
      '--overwrite': Boolean,
      '-g': '--git',
      '-y': '--yes',
      '-i': '--install',
      '-h': '--help',
      '-o': '--overwrite',
      '--skip': '--yes'
    },
    {
      argv: rawArgs.slice(2)
    }
  )
  return {
    skipPrompts: args['--yes'] || false,
    initGit: args['--git'] || false,
    packageName: args._[0],
    runInstall: args['--install'] || false
  }
}

const isEmpty = path => fs.readdirSync(path).length === 0

const isValidPackageName = projectName => /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(projectName)

const toValidPackageName = projectName => {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-')
}

// 根据提示自定义选项
const promptForOptions = async options => {
  const defaultTemplate = 'JavaScript'
  let targetDir = argv._[0]
  const defaultProjectName = !targetDir ? 'vite-react-app' : targetDir

  if (options.skipPrompts) {
    return {
      ...options,
      template: options.template || defaultTemplate
    }
  }

  const questions = []

  if (!targetDir) {
    questions.push({
      type: targetDir ? null : 'input',
      name: 'projectName',
      message: '请输入项目名称:',
      default: defaultProjectName
    })
  }

  questions.push({
    type: 'confirm',
    name: 'overwrite',
    message: () => (targetDir === '.' ? '当前目录' : `目录 "${targetDir}"`) + ` 不为空。清空目录下的文件并继续？`,
    when: answers => {
      targetDir = answers.projectName
      return fs.existsSync(answers.projectName) && !isEmpty(answers.projectName)
    },
    default: false
  })

  // questions.push({
  //   type:'confirm',
  //   name: 'overwriteChecker',
  //   message: '确认清空目录下的文件',
  //   when: answers => {
  //     if (answers.overwrite === false) {
  //       throw new Error(red('✖') + ' 操作取消')
  //       console.log('操作取消')
  //       return false
  //     }
  //     return false
  //   }
  // })

  questions.push({
    type: 'input',
    name: 'packageName',
    message: '包名:',
    default: () => toValidPackageName(targetDir),
    validate: dir => isValidPackageName(dir) || 'package.json 名称不合法',
    when: () => isValidPackageName(targetDir)
  })

  if (!options.initGit) {
    questions.push({
      type: 'confirm',
      name: 'git',
      message: '是否初始化git仓库',
      default: true
    })
  }

  if (!options.runInstall) {
    questions.push({
      type: 'confirm',
      name: 'install',
      message: '是否安装依赖',
      default: false
    })
  }

  const answers = await inquirer.prompt(questions)

  return {
    ...options,
    packageName: options.packageName || answers.packageName,
    overwrite: answers.overwrite,
    git: options.initGit || answers.git,
    install: options.runInstall || answers.install,
    targetDir
  }
}

export async function cli(args) {
  let options = parseArgsIntoOptions(args)
  options = await promptForOptions(options)
  createSpaApp(options)
}
