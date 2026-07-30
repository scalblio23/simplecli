import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const CONFIG_DIR = join(homedir(), '.hermes-cli')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

const DEFAULTS = {
  url: '',
  colors: {
    primary: 'cyan',
    accent:  'magenta',
    user:    'green',
    agent:   'yellow',
    error:   'red'
  },
  style: {
    boldHeaders:   true,
    dimTimestamps: true,
    agentName:     'Hermes',
    userName:      'You'
  }
}

export function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return JSON.parse(JSON.stringify(DEFAULTS))
  try {
    const saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
    return {
      ...DEFAULTS,
      ...saved,
      colors: { ...DEFAULTS.colors, ...saved.colors },
      style:  { ...DEFAULTS.style,  ...saved.style  }
    }
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS))
  }
}

export function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}
