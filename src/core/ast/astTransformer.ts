import ts from 'typescript';
import { CasingPair, RebrandMatrix } from '../rebrand/casingMatrix.js';

export interface AstTransformResult {
  transformedCode: string;
  hasChanges: boolean;
  replacementsCount: number;
}

/**
 * Performs AST-level semantic transformation on TypeScript and JavaScript files
 */
export function transformCodeWithAst(
  sourceCode: string,
  filePath: string,
  matrix: RebrandMatrix
): AstTransformResult {
  const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  const scriptKind = filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : filePath.endsWith('.jsx')
    ? ts.ScriptKind.JSX
    : filePath.endsWith('.ts')
    ? ts.ScriptKind.TS
    : ts.ScriptKind.JS;

  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  let replacementsCount = 0;

  // Build replacement lookup map
  const replaceMap = new Map<string, string>();
  for (const pair of matrix.pairs) {
    replaceMap.set(pair.source, pair.target);
  }

  function getReplacementFor(text: string): string | null {
    // Exact match
    if (replaceMap.has(text)) {
      return replaceMap.get(text)!;
    }
    // Substring replace
    let modified = text;
    for (const pair of matrix.pairs) {
      if (modified.includes(pair.source)) {
        modified = modified.split(pair.source).join(pair.target);
      }
    }
    return modified !== text ? modified : null;
  }

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    return (rootNode) => {
      function visitor(node: ts.Node): ts.Node {
        // 1. Identifiers (variables, functions, classes, types)
        if (ts.isIdentifier(node)) {
          const replacement = getReplacementFor(node.text);
          if (replacement && replacement !== node.text) {
            replacementsCount++;
            return ts.factory.createIdentifier(replacement);
          }
        }

        // 2. JSX Tag Names (e.g. <BrainFlowNav /> -> <OmniDeskNav />)
        if (ts.isJsxOpeningElement(node)) {
          const tagName = node.tagName.getText(sourceFile);
          const replacement = getReplacementFor(tagName);
          if (replacement && replacement !== tagName) {
            replacementsCount++;
            return ts.factory.updateJsxOpeningElement(
              node,
              ts.factory.createIdentifier(replacement),
              node.typeArguments,
              node.attributes
            );
          }
        }
        if (ts.isJsxClosingElement(node)) {
          const tagName = node.tagName.getText(sourceFile);
          const replacement = getReplacementFor(tagName);
          if (replacement && replacement !== tagName) {
            replacementsCount++;
            return ts.factory.updateJsxClosingElement(
              node,
              ts.factory.createIdentifier(replacement)
            );
          }
        }
        if (ts.isJsxSelfClosingElement(node)) {
          const tagName = node.tagName.getText(sourceFile);
          const replacement = getReplacementFor(tagName);
          if (replacement && replacement !== tagName) {
            replacementsCount++;
            return ts.factory.updateJsxSelfClosingElement(
              node,
              ts.factory.createIdentifier(replacement),
              node.typeArguments,
              node.attributes
            );
          }
        }

        // 3. String Literals (e.g. URLs, names, titles)
        if (ts.isStringLiteral(node)) {
          const text = node.text;
          const replacement = getReplacementFor(text);
          if (replacement && replacement !== text) {
            replacementsCount++;
            return ts.factory.createStringLiteral(replacement);
          }
        }

        return ts.visitEachChild(node, visitor, context);
      }

      return ts.visitNode(rootNode, visitor) as ts.SourceFile;
    };
  };

  const transformationResult = ts.transform(sourceFile, [transformer]);
  const transformedSourceFile = transformationResult.transformed[0];

  if (replacementsCount === 0) {
    return { transformedCode: sourceCode, hasChanges: false, replacementsCount: 0 };
  }

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const transformedCode = printer.printFile(transformedSourceFile);

  return {
    transformedCode,
    hasChanges: true,
    replacementsCount
  };
}
