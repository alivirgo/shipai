export function getOneClickDeployBadges(repoUrl = 'https://github.com/client-org/project'): string {
  return `### ⚡ 1-Click Cloud Deployment

Deploy this solution instantly to your enterprise cloud account with pre-configured settings:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=${encodeURIComponent(repoUrl)})
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=${encodeURIComponent(repoUrl)})
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=${encodeURIComponent(repoUrl)})
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/${repoUrl.replace('https://github.com/', '')})
`;
}
