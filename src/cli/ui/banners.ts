import boxen from 'boxen';
import pc from 'picocolors';

export function printBanner(): void {
  const title = `
   ____ _     _             _    ___ 
  / ___| |__ (_)_ __       / \\  |_ _|
  \\___ \\| '_ \\| | '_ \\     / _ \\  | | 
   ___) | | | | | |_) |   / ___ \\ | | 
  |____/|_| |_|_| .__/   /_/   \\_\\___|
                |_|                   
`;

  const content = `${pc.cyan(title)}
  ${pc.bold(pc.white('ShipAI'))} ${pc.dim('v1.0.0')} — ${pc.italic('Ship-ready & Bespoke Client Solutions')}
  ${pc.dim('Turn raw AI agent prototypes into polished, production-ready enterprise deliveries.')}
`;

  console.log(
    boxen(content, {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      margin: 1,
      borderColor: 'cyan',
      borderStyle: 'round'
    })
  );
}

export function printSummaryBox(title: string, lines: string[], borderColor = 'green'): void {
  const content = `${pc.bold(title)}\n\n${lines.join('\n')}`;
  console.log(
    boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderColor: borderColor as any,
      borderStyle: 'round'
    })
  );
}
