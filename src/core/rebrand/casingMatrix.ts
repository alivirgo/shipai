import {
  camelCase,
  capitalCase,
  constantCase,
  kebabCase,
  pascalCase,
  snakeCase
} from 'change-case';

export interface CasingPair {
  type: string;
  source: string;
  target: string;
}

export interface RebrandMatrix {
  sourceName: string;
  targetName: string;
  pairs: CasingPair[];
}

/**
 * Builds a comprehensive matrix of casing variations between original and new project name
 */
export function buildCasingMatrix(sourceName: string, targetName: string): RebrandMatrix {
  const cleanSource = sourceName.trim();
  const cleanTarget = targetName.trim();

  // Distinct casing pairs
  const pairMap = new Map<string, { type: string; source: string; target: string }>();

  function addPair(type: string, s: string, t: string) {
    if (s && t && s !== t && !pairMap.has(s)) {
      pairMap.set(s, { type, source: s, target: t });
    }
  }

  // 1. PascalCase (e.g. ChatPilot -> OmniDesk)
  addPair('PascalCase', pascalCase(cleanSource), pascalCase(cleanTarget));

  // 2. camelCase (e.g. chatPilot -> omniDesk)
  addPair('camelCase', camelCase(cleanSource), camelCase(cleanTarget));

  // 3. kebab-case (e.g. chat-pilot -> omni-desk)
  addPair('kebab-case', kebabCase(cleanSource), kebabCase(cleanTarget));

  // 4. snake_case (e.g. chat_pilot -> omni_desk)
  addPair('snake_case', snakeCase(cleanSource), snakeCase(cleanTarget));

  // 5. CONSTANT_CASE (e.g. CHAT_PILOT -> OMNI_DESK)
  addPair('CONSTANT_CASE', constantCase(cleanSource), constantCase(cleanTarget));

  // 6. Title Case / Capital Case (e.g. Chat Pilot -> Omni Desk)
  addPair('Title Case', capitalCase(cleanSource), capitalCase(cleanTarget));

  // 7. UPPERCASE plain (e.g. CHATPILOT -> OMNIDESK)
  const plainUpperSource = cleanSource.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const plainUpperTarget = cleanTarget.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  addPair('UPPERCASE', plainUpperSource, plainUpperTarget);

  // 8. lowercase plain (e.g. chatpilot -> omnidesk)
  const plainLowerSource = cleanSource.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const plainLowerTarget = cleanTarget.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  addPair('lowercase', plainLowerSource, plainLowerTarget);

  // Sort pairs by source string length descending to ensure longer matches replace first (e.g. Chat Pilot before Chat)
  const sortedPairs = Array.from(pairMap.values()).sort(
    (a, b) => b.source.length - a.source.length
  );

  return {
    sourceName: cleanSource,
    targetName: cleanTarget,
    pairs: sortedPairs
  };
}
