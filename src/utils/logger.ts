import pc from 'picocolors';

export const logger = {
  info: (msg: string) => console.log(pc.cyan('ℹ ') + pc.white(msg)),
  success: (msg: string) => console.log(pc.green('✔ ') + pc.bold(msg)),
  warn: (msg: string) => console.log(pc.yellow('⚠ ') + pc.yellow(msg)),
  error: (msg: string) => console.error(pc.red('✖ ') + pc.bold(pc.red(msg))),
  step: (step: number, total: number, msg: string) => 
    console.log(pc.magenta(`[${step}/${total}] `) + pc.bold(pc.white(msg))),
  dim: (msg: string) => console.log(pc.dim(msg)),
  highlight: (label: string, value: string) => 
    console.log(pc.dim('  • ') + pc.cyan(label) + ': ' + pc.bold(pc.white(value)))
};
