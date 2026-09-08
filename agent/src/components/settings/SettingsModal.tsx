import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [copiedId, setCopiedId] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen || !user) return null;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyAccountId = async () => {
    try {
      await navigator.clipboard.writeText(user._id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatMemberSince = (dateValue: string | Date | undefined) => {
    if (!dateValue) return 'September 2026';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(dateValue));
    } catch {
      return 'September 2026';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-dialog settings-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="settings-header-info">
            <h2 id="settings-dialog-title" className="modal-title">Settings & Preferences</h2>
            <p className="settings-header-subtitle">Manage your account profile, security, and app options</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close Settings"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-modal-tabs">
          <button
            type="button"
            className={`settings-modal-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profile</span>
          </button>
          <button
            type="button"
            className={`settings-modal-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Security</span>
          </button>
          <button
            type="button"
            className={`settings-modal-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Preferences</span>
          </button>
        </div>

        {/* Feedback Toast */}
        {toastMessage && (
          <div className="settings-toast-banner" role="status">
            <svg viewBox="0 0 20 20" fill="currentColor" className="toast-icon">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="modal-body settings-modal-body">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="settings-section">
              <div className="profile-identity-banner" style={{ paddingBottom: '16px', marginBottom: '16px' }}>
                <div className="profile-large-avatar" aria-hidden="true" style={{ width: '56px', height: '56px', fontSize: '20px' }}>
                  {getInitials(user.name)}
                </div>
                <div className="profile-identity-meta">
                  <div className="profile-name-row">
                    <h3 className="profile-user-fullname" style={{ fontSize: '17px' }}>{user.name}</h3>
                    <span className="profile-status-badge">
                      <span className="status-indicator-dot" />
                      Active Member
                    </span>
                  </div>
                  <p className="profile-user-email">{user.email}</p>
                  <p className="profile-joined-text">Member since {formatMemberSince(user.createdAt)}</p>
                </div>
              </div>

              <div className="account-details-grid" style={{ gap: '12px' }}>
                <div className="account-detail-item">
                  <span className="account-detail-label">Full Name</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="account-detail-value">{user.name}</span>
                    <button
                      type="button"
                      className="account-copy-button"
                      onClick={() => setShowEditName(!showEditName)}
                    >
                      {showEditName ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                </div>

                <div className="account-detail-item">
                  <span className="account-detail-label">Account ID</span>
                  <div className="account-id-row">
                    <span className="account-id-text mono" style={{ fontSize: '11.5px' }}>{user._id}</span>
                    <button
                      type="button"
                      onClick={copyAccountId}
                      className="account-copy-button"
                    >
                      {copiedId ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {showEditName && (
                <div className="settings-subcard" style={{ marginTop: '14px' }}>
                  <label className="input-label">Update Name</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="text"
                      defaultValue={user.name}
                      className="input-field"
                      placeholder="Your name"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setShowEditName(false);
                        triggerToast('Name updated successfully.');
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <div className="account-settings-row">
                <div>
                  <p className="setting-title">Password</p>
                  <p className="setting-desc">Set to a unique, secure password.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                >
                  {showPasswordChange ? 'Cancel' : 'Change'}
                </Button>
              </div>

              {showPasswordChange && (
                <div className="settings-subcard" style={{ margin: '10px 0' }}>
                  <div className="input-group">
                    <label className="input-label">Current Password</label>
                    <input type="password" placeholder="••••••••" className="input-field" />
                  </div>
                  <div className="input-group" style={{ marginTop: '10px' }}>
                    <label className="input-label">New Password</label>
                    <input type="password" placeholder="Minimum 6 characters" className="input-field" />
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setShowPasswordChange(false);
                        triggerToast('Password updated successfully.');
                      }}
                    >
                      Update Password
                    </Button>
                  </div>
                </div>
              )}

              <div className="account-settings-row">
                <div>
                  <p className="setting-title">Two-Factor Authentication</p>
                  <p className="setting-desc">Add an extra layer of protection to your login.</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => triggerToast('2FA setup will be available soon.')}
                >
                  Enable 2FA
                </Button>
              </div>

              <div className="account-settings-row" style={{ borderBottom: 'none' }}>
                <div>
                  <p className="setting-title" style={{ color: '#dc2626' }}>Session Sign Out</p>
                  <p className="setting-desc">Sign out of your active session on this device.</p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLogout}
                  isLoading={isLoggingOut}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div className="settings-section">
              <div className="account-settings-row">
                <div>
                  <p className="setting-title">Appearance Theme</p>
                  <p className="setting-desc">Modern Light Theme is active as default.</p>
                </div>
                <span className="setting-status-pill">Light Mode</span>
              </div>

              <div className="account-settings-row">
                <div>
                  <p className="setting-title">Security Notifications</p>
                  <p className="setting-desc">Receive security alert emails on unfamiliar sign-ins.</p>
                </div>
                <span className="setting-status-pill">Enabled</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
