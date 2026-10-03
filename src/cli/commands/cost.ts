import path from 'path';
import ora from 'ora';
import pc from 'picocolors';
import { calculateAiProjectCost, generateCostReport } from '../../core/finance/costCalculator.js';

export async function runCostCommand(targetDir?: string): Promise<void> {
  const rootDir = path.resolve(targetDir || process.cwd());
  const spinner = ora('Analyzing project LLM call sites and modeling financial token OpEx...').start();

  try {
    const footprint = await calculateAiProjectCost(rootDir);
    const reportPath = await generateCostReport(rootDir);
    spinner.succeed('Financial OpEx cost analysis complete.');

    console.log('');
    console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
    console.log(pc.bold('  💰 AI INFRASTRUCTURE OPEX & TOKEN FINANCIAL MODEL'));
    console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
    console.log(`  • Detected AI Call Sites:    ${pc.bold(pc.yellow(footprint.totalLlmCallSites.toString()))}`);
    console.log(`  • Active Providers:          ${pc.bold(pc.green(footprint.detectedProviders.join(', ')))}`);
    console.log(`  • Avg Input Tokens / Query:  ${pc.bold(footprint.estimatedInputTokens.toString())}`);
    console.log(`  • Avg Output Tokens / Query: ${pc.bold(footprint.estimatedOutputTokens.toString())}`);
    console.log('');

    console.log(pc.bold('  Model Cost Projections (Monthly Active Usage):'));
    console.log(pc.dim('  ' + '─'.repeat(72)));
    console.log(
      `  ${'Model'.padEnd(20)} ${'Provider'.padEnd(12)} ${'Per Query'.padEnd(12)} ${'10k/mo'.padEnd(12)} ${'100k/mo'.padEnd(12)}`
    );
    console.log(pc.dim('  ' + '─'.repeat(72)));

    for (const m of footprint.comparisons) {
      console.log(
        `  ${pc.bold(m.modelName.padEnd(20))} ${m.provider.padEnd(12)} ${`$${m.perQueryCostUsd.toFixed(5)}`.padEnd(12)} ${m.tiers['10k'].monthlyCostFormatted.padEnd(12)} ${pc.green(m.tiers['100k'].monthlyCostFormatted.padEnd(12))}`
      );
    }
    console.log(pc.dim('  ' + '─'.repeat(72)));
    console.log('');
    console.log(`  📄 Detailed report emitted to: ${pc.bold(pc.cyan(path.relative(process.cwd(), reportPath)))}`);
    console.log(`  💡 Recommendation: ${pc.bold(footprint.recommendedModel)}\n`);
  } catch (err: any) {
    spinner.fail(`Cost modeling error: ${err.message}`);
  }
}
