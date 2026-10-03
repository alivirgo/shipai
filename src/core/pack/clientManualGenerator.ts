import fs from 'fs-extra';
import path from 'path';
import { capitalCase } from 'change-case';

export interface ManualResult {
  manualsCreated: string[];
}

/**
 * Generates bespoke end-user manuals and admin operations guides for the client
 */
export async function generateClientManuals(
  rootDir: string,
  projectName: string,
  clientName: string
): Promise<ManualResult> {
  const manualsCreated: string[] = [];

  // 1. USER_MANUAL.md (For non-technical client employees)
  const userManual = `# ${capitalCase(projectName)} — End-User Operational Manual

> **Prepared For**: ${clientName}  
> **Platform**: ${capitalCase(projectName)} Enterprise AI Platform  
> **Audience**: General Staff, Operators, and Business Users

---

## 1. Introduction
Welcome to **${capitalCase(projectName)}**, an AI-powered enterprise solution customized specifically for **${clientName}**. This platform is designed to streamline your daily workflows, assist with intelligent data retrieval, and accelerate productivity while keeping your company's data secure and confidential.

---

## 2. Getting Started
1. **Accessing the Portal**: Open your web browser and navigate to your organization's deployment URL (or \`http://localhost:3000\` if running locally).
2. **Navigating the Interface**: The dashboard consists of:
   - **AI Interaction Workspace**: Where you input queries and review streaming responses.
   - **History & Context Sidebar**: Review past sessions and load saved workflows.
   - **System Status Bar**: Displays network latency and active service health.

---

## 3. Best Practices for Best Results
- **Be Specific**: Provide relevant context in your inquiries rather than single-word prompts.
- **Data Privacy**: All data submitted through this platform is processed according to ${clientName}'s internal compliance standards.
- **Reviewing Responses**: While the AI system is fine-tuned for high accuracy, critical data points should always be cross-referenced with official internal documentation.

---

## 4. Troubleshooting & Support
- If the system indicates "Service Temporarily Throttled", the platform has reached its hourly query safety threshold to prevent runaway charges. Please wait a few minutes before resubmitting.
- For technical assistance, contact your internal IT administrator at **${clientName}**.
`;

  // 2. ADMIN_OPERATIONS_GUIDE.md (For client IT & DevOps)
  const adminGuide = `# ${capitalCase(projectName)} — Administrator & DevOps Operations Guide

> **Organization**: ${clientName}  
> **Classification**: Internal IT & Operations Guide  
> **Version**: 1.0.0

---

## 1. System Administration Overview
This guide provides IT administrators and DevOps engineers at **${clientName}** with instructions for configuring credentials, monitoring resource consumption, rotating API secrets, and troubleshooting production incidents.

---

## 2. API Key Management & Key Rotation
The application communicates with enterprise LLM inference providers via server-side environment variables defined in \`.env\` (or your hosting platform secret manager).

### Rotating Credentials:
1. Generate a new secret key from your provider dashboard (e.g. OpenAI, Anthropic, or Azure).
2. Update the environment variable in your production vault or hosting dashboard:
   \`\`\`bash
   OPENAI_API_KEY=sk-new-production-key...
   \`\`\`
3. Trigger a rolling restart of the container:
   \`\`\`bash
   docker compose restart app
   \`\`\`

---

## 3. AI Budget & Cost Guardrail Policies
To prevent unauthorized billing spikes or denial-of-wallet loops, the application enforces safety guardrails via \`src/middleware/aiGuardrails.ts\`:

- **Token Bucket Rate Limiting**: Defaults to 60 requests per minute per IP address.
- **Daily Budget Ceiling**: Configured via \`DAILY_AI_BUDGET_USD\`. When reached, the system gracefully responds with \`503 Service Temporarily Throttled\` until the UTC day resets.

To adjust the budget limit:
\`\`\`bash
DAILY_AI_BUDGET_USD=150.00
\`\`\`

---

## 4. Monitoring & Telemetry
- **Health Probe Endpoint**: \`GET /api/health\` returns HTTP 200 when container and database connectivity are healthy.
- **Real-time Logs**:
  \`\`\`bash
  docker compose logs -f --tail=100 app
  \`\`\`
- **Container Memory / CPU Usage**:
  \`\`\`bash
  docker stats
  \`\`\`
`;

  const userPath = path.join(rootDir, 'USER_MANUAL.md');
  const adminPath = path.join(rootDir, 'ADMIN_OPERATIONS_GUIDE.md');

  await fs.writeFile(userPath, userManual, 'utf-8');
  await fs.writeFile(adminPath, adminGuide, 'utf-8');

  manualsCreated.push('USER_MANUAL.md', 'ADMIN_OPERATIONS_GUIDE.md');

  return { manualsCreated };
}
