import fs from 'fs-extra';
import path from 'path';

export interface K8sResult {
  manifests: string[];
}

/**
 * Generates enterprise Kubernetes production deployment manifests
 */
export async function generateK8sManifests(
  rootDir: string,
  projectName: string,
  appPort: number
): Promise<K8sResult> {
  const k8sDir = path.join(rootDir, 'k8s');
  await fs.ensureDir(k8sDir);

  const cleanName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // 1. Deployment
  const deploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${cleanName}-deployment
  labels:
    app: ${cleanName}
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ${cleanName}
  template:
    metadata:
      labels:
        app: ${cleanName}
    spec:
      containers:
        - name: ${cleanName}
          image: ${cleanName}:production
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: ${appPort}
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1536Mi"
          livenessProbe:
            httpGet:
              path: /api/health
              port: ${appPort}
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /api/health
              port: ${appPort}
            initialDelaySeconds: 5
            periodSeconds: 10
          envFrom:
            - configMapRef:
                name: ${cleanName}-config
            - secretRef:
                name: ${cleanName}-secrets
`;

  // 2. Service
  const serviceYaml = `apiVersion: v1
kind: Service
metadata:
  name: ${cleanName}-service
spec:
  type: ClusterIP
  selector:
    app: ${cleanName}
  ports:
    - protocol: TCP
      port: 80
      targetPort: ${appPort}
`;

  // 3. Ingress
  const ingressYaml = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${cleanName}-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - ${cleanName}.clientdomain.com
      secretName: ${cleanName}-tls
  rules:
    - host: ${cleanName}.clientdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${cleanName}-service
                port:
                  number: 80
`;

  await fs.writeFile(path.join(k8sDir, 'deployment.yaml'), deploymentYaml, 'utf-8');
  await fs.writeFile(path.join(k8sDir, 'service.yaml'), serviceYaml, 'utf-8');
  await fs.writeFile(path.join(k8sDir, 'ingress.yaml'), ingressYaml, 'utf-8');

  return {
    manifests: ['k8s/deployment.yaml', 'k8s/service.yaml', 'k8s/ingress.yaml']
  };
}
