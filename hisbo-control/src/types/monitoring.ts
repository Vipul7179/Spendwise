// ====================================================================
// Hisbo Control — Platform Monitoring Types
// ====================================================================

export type ServiceStatus = 'operational' | 'healthy' | 'degraded' | 'outage' | 'maintenance';

export interface ServiceHealth {
  id?: string;
  name: string;
  category?: 'database' | 'auth' | 'storage' | 'hosting' | 'edge';
  status: ServiceStatus;
  latencyMs: number;
  uptimePercent?: number;
  uptime24h?: number;
  lastChecked: string;
  details?: string;
}

export interface SystemErrorLog {
  id: string;
  timestamp: string;
  source?: 'api' | 'auth' | 'database' | 'client-runtime';
  route?: string;
  endpoint?: string;
  statusCode?: number;
  message: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  resolved: boolean;
}

export interface PlatformHealthSummary {
  overallStatus: ServiceStatus;
  uptimePercentage?: number;
  uptime90Days?: number;
  avgResponseTimeMs?: number;
  errorRatePercent?: number;
  checkedAt?: string;
  services: ServiceHealth[];
  recentErrors: SystemErrorLog[];
  activeDeployments?: {
    customerApp?: {
      url: string;
      branch: string;
      commitHash: string;
      deployedAt: string;
      status: 'ready' | 'building' | 'error';
    };
    adminApp?: {
      url: string;
      branch: string;
      commitHash: string;
      deployedAt: string;
      status: 'ready' | 'building' | 'error';
    };
  };
}

