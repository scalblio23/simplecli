import inquirer from 'inquirer'
import chalk from 'chalk'
import { loadConfig, saveConfig } from './config.js'
import { sendMessage } from './agent.js'

const COLOR_CHOICES = [
  'cyan', 'magenta', 'green', 'yellow', 'blue', 'red', 'white', 'gray',
  'cyanBright', 'greenBright', 'yellowBright', 'blueBright', 'magentaBright', 'redBright'
]

function c(name, text) {
  try { return chalk[name](text) } catch { return text }
}

function makePainter(config) {
  const { colors: cl, style: st } = config
  const bold = t => st.boldHeaders ? chalk.bold(t) : t
  return {
    primary: t => c(cl.primary, t),
    accent:  t => c(cl.accent, t),
    user:    t => c(cl.user, t),
    agent:   t => c(cl.agent, t),
    error:   t => c(cl.error, t),
    header:  t => bold(c(cl.primary, t)),
    dim:     t => chalk.dim(t),
  }
}

function printHeader(p, config) {
  const bar = p.primary('─'.repeat(52))
  const srv = config.url ? chalk.dim(config.url) : chalk.dim('no server — run /url')
  console.log(bar)
  console.log(p.header('  ⚡ HERMES') + '  ' + srv)
  console.log(bar)
  console.log(chalk.dim('  /colors  /style  /url  /help  /quit\n'))
}

async function colorPicker(message, current) {
  const { value } = await inquirer.prompt([{
    type: 'list',
    name: 'value',
    message,
    prefix: '',
    choices: COLOR_CHOICES.map(v => ({ name: chalk[v](v), value: v })),
    default: current
  }])
  return value
}

async function configColors(config) {
  console.log()
  config.colors.primary = await colorPicker('Primary color (borders & chrome)', config.colors.primary)
  config.colors.accent  = await colorPicker('Accent color (info messages)',     config.colors.accent)
  config.colors.user    = await colorPicker('Your message color',               config.colors.user)
  config.colors.agent   = await colorPicker('Agent response color',             config.colors.agent)
  config.colors.error   = await colorPicker('Error color',                      config.colors.error)
  saveConfig(config)
}

async function configStyle(config) {
  console.log()
  const answers = await inquirer.prompt([
    { type: 'confirm', name: 'boldHeaders',   message: 'Bold headers?',      prefix: '', default: config.style.boldHeaders },
    { type: 'confirm', name: 'dimTimestamps', message: 'Dim timestamps?',    prefix: '', default: config.style.dimTimestamps },
    { type: 'input',   name: 'agentName',     message: 'Agent display name', prefix: '', default: config.style.agentName },
    { type: 'input',   name: 'userName',      message: 'Your display name',  prefix: '', default: config.style.userName },
  ])
  Object.assign(config.style, answers)
  saveConfig(config)
}

async function configURL(config) {
  console.log()
  const { url } = await inquirer.prompt([{
    type: 'input',
    name: 'url',
    message: 'Railway server URL (e.g. https://hermes.up.railway.app)',
    prefix: '',
    default: config.url,
    validate: v => !v || v.startsWith('http') ? true : 'Must start with http:// or https://'
  }])
  config.url = url.trim()
  saveConfig(config)
}

async function main() {
  let config = loadConfig()
  let p = makePainter(config)

  process.stdout.write('\x1Bc')
  printHeader(p, config)

  while (true) {
    let msg
    try {
      const ans = await inquirer.prompt([{
        type: 'input',
        name: 'msg',
        message: p.user('›'),
        prefix: ''
      }])
      msg = ans.msg.trim()
    } catch {
      console.log('\n' + p.accent('Goodbye.'))
      process.exit(0)
    }

    if (!msg) continue

    switch (msg) {
      case '/quit':
      case '/exit':
        console.log('\n' + p.accent('Goodbye.\n'))
        process.exit(0)

      case '/help':
        console.log(chalk.dim('\n  /colors   customize UI colors'))
        console.log(chalk.dim('  /style    customize text style & display names'))
        console.log(chalk.dim('  /url      set Railway server URL'))
        console.log(chalk.dim('  /clear    clear screen'))
        console.log(chalk.dim('  /quit     exit\n'))
        break

      case '/clear':
        process.stdout.write('\x1Bc')
        p = makePainter(config)
        printHeader(p, config)
        break

      case '/colors':
        await configColors(config)
        p = makePainter(config)
        console.log('\n' + p.accent('  Colors saved.\n'))
        break

      case '/style':
        await configStyle(config)
        p = makePainter(config)
        console.log('\n' + p.accent('  Style saved.\n'))
        break

      case '/url':
        await configURL(config)
        p = makePainter(config)
        console.log('\n' + p.accent(`  Server: ${config.url || '(cleared)'}\n`))
        break

      default:
        if (!config.url) {
          console.log('\n' + p.error('  No server configured — run /url first.\n'))
          break
        }
        try {
          const reply = await sendMessage(config.url, msg)
          const ts = config.style.dimTimestamps
            ? '  ' + chalk.dim(new Date().toLocaleTimeString())
            : ''
          console.log('\n' + p.agent(`  ${config.style.agentName}: `) + reply + ts + '\n')
        } catch (err) {
          console.log('\n' + p.error(`  Error: ${err.message}\n`))
        }
    }
  }
}

main().catch(err => {
  console.error(chalk.red('\nFatal:'), err.message)
  process.exit(1)
})
