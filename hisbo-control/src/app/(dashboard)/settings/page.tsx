'use client';

import React, { useState, useEffect } from 'react';
import {
  SettingsIcon,
  ShieldIcon,
  DatabaseIcon,
  LockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  RefreshIcon,
} from '@/components/icons';

interface PlatformSettingsMap {
  maintenance_mode?: {
    key: string;
    value: { enabled: boolean; message: string };
    description?: string;
    updated_at?: string;
  };
  allow_signups?: {
    key: string;
    value: { enabled: boolean };
    description?: string;
    updated_at?: string;
  };
  announcement_bar?: {
    key: string;
    value: { enabled: boolean; message: string; link: string };
    description?: string;
    updated_at?: string;
  };
  support_contact?: {
    key: string;
    value: { email: string; phone: string };
    description?: string;
    updated_at?: string;
  };
}

export default function SettingsPage() {
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [requireMfa, setRequireMfa] = useState(true);
  const [ipAllowlist, setIpAllowlist] = useState(false);

  // Platform settings state
  const [isConfigured, setIsConfigured] = useState(false);
  const [settingsSource, setSettingsSource] = useState<'production' | 'local_defaults'>('local_defaults');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Editable settings values
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Hisbo is currently undergoing scheduled platform maintenance.');
  const [allowSignups, setAllowSignups] = useState(true);
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementLink, setAnnouncementLink] = useState('');
  const [supportEmail, setSupportEmail] = useState('support@hisbo.in');
  const [supportPhone, setSupportPhone] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();

      if (res.ok && data.settings) {
        setIsConfigured(Boolean(data.configured));
        setSettingsSource(data.source || 'local_defaults');

        const s: PlatformSettingsMap = data.settings;
        if (s.maintenance_mode) {
          setMaintenanceEnabled(Boolean(s.maintenance_mode.value?.enabled));
          setMaintenanceMessage(s.maintenance_mode.value?.message || '');
        }
        if (s.allow_signups) {
          setAllowSignups(Boolean(s.allow_signups.value?.enabled));
        }
        if (s.announcement_bar) {
          setAnnouncementEnabled(Boolean(s.announcement_bar.value?.enabled));
          setAnnouncementMessage(s.announcement_bar.value?.message || '');
          setAnnouncementLink(s.announcement_bar.value?.link || '');
        }
        if (s.support_contact) {
          setSupportEmail(s.support_contact.value?.email || 'support@hisbo.in');
          setSupportPhone(s.support_contact.value?.phone || '');
        }
      }
    } catch {
      showToast('Error loading platform settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitialSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (ignore) return;

        if (res.ok && data.settings) {
          setIsConfigured(Boolean(data.configured));
          setSettingsSource(data.source || 'local_defaults');

          const s: PlatformSettingsMap = data.settings;
          if (s.maintenance_mode) {
            setMaintenanceEnabled(Boolean(s.maintenance_mode.value?.enabled));
            setMaintenanceMessage(s.maintenance_mode.value?.message || '');
          }
          if (s.allow_signups) {
            setAllowSignups(Boolean(s.allow_signups.value?.enabled));
          }
          if (s.announcement_bar) {
            setAnnouncementEnabled(Boolean(s.announcement_bar.value?.enabled));
            setAnnouncementMessage(s.announcement_bar.value?.message || '');
            setAnnouncementLink(s.announcement_bar.value?.link || '');
          }
          if (s.support_contact) {
            setSupportEmail(s.support_contact.value?.email || 'support@hisbo.in');
            setSupportPhone(s.support_contact.value?.phone || '');
          }
        }
      } catch {
        if (!ignore) {
          showToast('Error loading platform settings.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updates = [
        {
          key: 'maintenance_mode',
          value: { enabled: maintenanceEnabled, message: maintenanceMessage },
        },
        {
          key: 'allow_signups',
          value: { enabled: allowSignups },
        },
        {
          key: 'announcement_bar',
          value: { enabled: announcementEnabled, message: announcementMessage, link: announcementLink },
        },
        {
          key: 'support_contact',
          value: { email: supportEmail, phone: supportPhone },
        },
      ];

      for (const item of updates) {
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Failed to update ${item.key}`);
        }
      }

      showToast('Platform settings saved successfully.');
      void fetchSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      showToast(`Error: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Console & Platform Settings
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Manage production application configuration, maintenance mode, and console security controls.
          </p>
        </div>

        <button
          onClick={() => void fetchSettings()}
          className="btn btn-secondary btn-sm"
          style={{ gap: '0.4rem' }}
          disabled={isLoading}
        >
          <RefreshIcon size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'var(--bg-card)',
            border: '1px solid var(--accent)',
            padding: '0.75rem 1.25rem',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-main)',
            fontSize: '0.875rem',
            zIndex: 100,
          }}
        >
          <CheckCircleIcon size={18} style={{ color: 'var(--accent)' }} />
          <span>{toast}</span>
        </div>
      )}

      {/* Configuration Status Banner */}
      {!isConfigured && (
        <div
          className="admin-card"
          style={{
            borderLeft: '4px solid #f59e0b',
            background: 'rgba(245, 158, 11, 0.05)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <AlertTriangleIcon size={22} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Production Settings Storage Not Configured
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Platform settings are currently using local defaults. To persist settings changes directly to the Spendwise production database (<code>public.platform_settings</code> on <code>omnhxlqykmtzxdagppcl</code>):
            </p>
            <ol style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
              <li>
                Execute <code>migrations/004_production_content_setup.sql</code> in the Supabase SQL Editor to create <code>public.platform_settings</code> and the operator role.
              </li>
              <li>
                Set <code>PROD_OPERATOR_DATABASE_URL</code> in your local <code>hisbo-control/.env.local</code>.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Production Protection Mode Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.875rem 1.25rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 10,
          fontSize: '0.8125rem',
          color: '#34d399',
        }}
      >
        <LockIcon size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Strict Isolation Architecture:</strong> Platform settings use <code>public.platform_settings</code> with a strict key-value schema. The operator role has zero access to customer financial ledgers (<code>public.user_data</code>).
        </div>
      </div>

      {/* Production Platform Settings Form */}
      <form onSubmit={handleSavePlatformSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SettingsIcon size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Production Platform Settings
              </h3>
            </div>
            <span className={`badge ${settingsSource === 'production' ? 'badge-success' : 'badge-neutral'}`}>
              Source: {settingsSource === 'production' ? 'Live Spendwise DB' : 'Local Defaults'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Maintenance Mode */}
            <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Platform Maintenance Mode
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    When enabled, customer access to web application endpoints displays a maintenance banner.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={maintenanceEnabled}
                  onChange={(e) => setMaintenanceEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
              </div>
              {maintenanceEnabled && (
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Maintenance Notice Message
                  </label>
                  <input
                    type="text"
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    className="input-field"
                    placeholder="Enter message shown to visitors..."
                  />
                </div>
              )}
            </div>

            {/* Allow Signups */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Customer Registration (Signups)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Allow new customers to register accounts on Hisbo.
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowSignups}
                onChange={(e) => setAllowSignups(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>

            {/* Announcement Bar */}
            <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Global Announcement Bar
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Display a promotional or informational banner across all public pages.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={announcementEnabled}
                  onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
              </div>
              {announcementEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Banner Text
                    </label>
                    <input
                      type="text"
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      placeholder="e.g. 🎉 Spendwise 2.0 is now live!"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Target Link (Optional)
                    </label>
                    <input
                      type="text"
                      value={announcementLink}
                      onChange={(e) => setAnnouncementLink(e.target.value)}
                      placeholder="https://www.hisbo.in/features"
                      className="input-field"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Support Contact Info */}
            <div style={{ padding: '0.75rem 0' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Official Platform Support Metadata
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Support Hotline / Phone
                  </label>
                  <input
                    type="text"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSaving}
            >
              {isSaving ? 'Saving Platform Settings...' : 'Save Platform Settings'}
            </button>
          </div>
        </div>

        {/* Security Policies Card */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <ShieldIcon size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Console Security & Session Hardening
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Admin Inactivity Session Timeout
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="input-field"
                style={{ maxWidth: 300 }}
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes (Recommended)</option>
                <option value="60">1 Hour</option>
                <option value="120">2 Hours</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Forces automatic sign-out and session revocation when administrator is idle.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                  Enforce Multi-Factor Authentication (MFA)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Require TOTP authentication token for all administrator accounts on hisbo-staging.
                </div>
              </div>
              <input
                type="checkbox"
                checked={requireMfa}
                onChange={(e) => setRequireMfa(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                  Restrict Console Access by IP Allowlist
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Reject login handshakes outside designated corporate CIDR blocks.
                </div>
              </div>
              <input
                type="checkbox"
                checked={ipAllowlist}
                onChange={(e) => setIpAllowlist(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* Integration Status Card */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <DatabaseIcon size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Connected Services & Telemetry Providers
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: 8, background: 'var(--bg-secondary)' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                  Admin Authentication & Roles (Staging Supabase)
                </div>
                <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>https://klvbtoxyeixxjydnanlz.supabase.co</code>
              </div>
              <span className="badge badge-success">Active Auth</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: 8, background: 'var(--bg-secondary)' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                  Production Content Operator (Spendwise DB)
                </div>
                <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>omnhxlqykmtzxdagppcl (Role: hisbo_platform_operator)</code>
              </div>
              <span className={`badge ${isConfigured ? 'badge-success' : 'badge-warning'}`}>
                {isConfigured ? 'Connected' : 'Pending URL'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: 8, background: 'var(--bg-secondary)' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                  Google Analytics 4 Data Ingestion
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Measurement ID G-LCMEK1R5HY configured on client</div>
              </div>
              <span className="badge badge-neutral">Client Stream</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
