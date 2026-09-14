import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, CardContent, CardHeader, CardTitle, CardSubtitle } from '../components/ui';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const copyAccountId = async () => {
    try {
      await navigator.clipboard.writeText(user._id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Fallback
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

  const triggerToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  return (
    <div className="account-page-layout">
      {/* Top Navigation Bar */}
      <header className="account-top-navbar">
        <div className="account-nav-container">
          <div className="account-nav-left">
            <div className="account-brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="account-brand-title">LinguaLoop</span>

            <nav className="account-nav-links">
              <Link to="/chat" className="account-nav-item">
                Chat
              </Link>
              <Link to="/settings" className="account-nav-item active">
                Settings
              </Link>
            </nav>
          </div>

          <div className="account-nav-right">
            <div className="account-user-chip">
              <div className="account-mini-avatar">{getInitials(user.name)}</div>
              <span className="account-user-name">{user.name}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              loadingText="Signing out..."
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="account-main-wrapper">
        <div className="account-page-header">
          <div>
            <h1 className="account-main-title">Account Settings</h1>
            <p className="account-main-desc">
              Manage your profile details, security preferences, and active sessions.
            </p>
          </div>
        </div>

        {/* Action Feedback Toast */}
        {actionSuccess && (
          <div className="account-toast-banner" role="status">
            <svg viewBox="0 0 20 20" fill="currentColor" className="toast-icon">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="account-subnav-tabs" aria-label="Settings sections">
          <button
            type="button"
            className={`account-subnav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="tab-icon"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profile & Account</span>
          </button>
          <button
            type="button"
            className={`account-subnav-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="tab-icon"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Security & Login</span>
          </button>
          <button
            type="button"
            className={`account-subnav-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="tab-icon"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Preferences</span>
          </button>
        </nav>

        {/* Tab 1: Profile & Account */}
        {activeTab === 'profile' && (
          <div className="account-sections-list">
            {/* Profile Overview Card */}
            <Card className="account-card">
              <CardHeader className="account-card-header">
                <div>
                  <CardTitle>Public Profile</CardTitle>
                  <CardSubtitle>
                    This information is associated with your LinguaLoop account.
                  </CardSubtitle>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
                  Edit Profile
                </Button>
              </CardHeader>

              <CardContent className="account-card-body">
                <div className="profile-identity-banner">
                  <div className="profile-large-avatar" aria-hidden="true">
                    {getInitials(user.name)}
                  </div>
                  <div className="profile-identity-meta">
                    <div className="profile-name-row">
                      <h2 className="profile-user-fullname">{user.name}</h2>
                      <span className="profile-status-badge">
                        <span className="status-indicator-dot" />
                        Active Member
                      </span>
                    </div>
                    <p className="profile-user-email">{user.email}</p>
                    <p className="profile-joined-text">
                      Member since {formatMemberSince(user.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="account-details-grid">
                  <div className="account-detail-item">
                    <span className="account-detail-label">Full Name</span>
                    <span className="account-detail-value">{user.name}</span>
                  </div>

                  <div className="account-detail-item">
                    <span className="account-detail-label">Email Address</span>
                    <div className="account-email-row">
                      <span className="account-detail-value">{user.email}</span>
                      <span className="verified-badge">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="verified-icon">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Verified
                      </span>
                    </div>
                  </div>

                  <div className="account-detail-item">
                    <span className="account-detail-label">Account ID</span>
                    <div className="account-id-row">
                      <span className="account-id-text mono">{user._id}</span>
                      <button
                        type="button"
                        onClick={copyAccountId}
                        className="account-copy-button"
                        aria-label="Copy Account ID"
                      >
                        {copiedId ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="account-detail-item">
                    <span className="account-detail-label">Account Status</span>
                    <span className="account-detail-value status-active">Good Standing</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Preferences Card */}
            <Card className="account-card">
              <CardHeader className="account-card-header">
                <div>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardSubtitle>Manage how we communicate account updates with you.</CardSubtitle>
                </div>
              </CardHeader>
              <CardContent className="account-card-body">
                <div className="account-settings-row">
                  <div>
                    <p className="setting-title">Security & Login Alerts</p>
                    <p className="setting-desc">
                      Receive instant email notifications for new logins and password updates.
                    </p>
                  </div>
                  <span className="setting-status-pill">Enabled</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Security & Login */}
        {activeTab === 'security' && (
          <div className="account-sections-list">
            <Card className="account-card">
              <CardHeader className="account-card-header">
                <div>
                  <CardTitle>Password & Authentication</CardTitle>
                  <CardSubtitle>Keep your account secure with a strong password.</CardSubtitle>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setShowPasswordModal(true)}>
                  Change Password
                </Button>
              </CardHeader>
              <CardContent className="account-card-body">
                <div className="security-item-row">
                  <div>
                    <p className="setting-title">Password</p>
                    <p className="setting-desc">Set to a unique, secure password.</p>
                  </div>
                  <span className="password-masked-text">••••••••••••</span>
                </div>

                <div className="security-item-row">
                  <div>
                    <p className="setting-title">Two-Factor Authentication (2FA)</p>
                    <p className="setting-desc">
                      Add an extra layer of security using an authenticator app.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      triggerToast('Two-Factor Authentication setup will be enabled shortly.')
                    }
                  >
                    Setup 2FA
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions Card */}
            <Card className="account-card">
              <CardHeader className="account-card-header">
                <div>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardSubtitle>Devices currently authenticated to your account.</CardSubtitle>
                </div>
              </CardHeader>
              <CardContent className="account-card-body">
                <div className="session-device-item">
                  <div className="session-device-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <div className="session-device-meta">
                    <div className="session-device-title-row">
                      <p className="session-device-title">Current Web Browser Session</p>
                      <span className="session-active-pill">
                        <span className="session-dot" />
                        Active Now
                      </span>
                    </div>
                    <p className="session-device-info">
                      Authenticated via secure token • Token expires automatically
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="account-card danger-zone-card">
              <CardHeader className="account-card-header">
                <div>
                  <CardTitle className="danger-zone-title">Session & Sign Out</CardTitle>
                  <CardSubtitle>Sign out of your account on this device.</CardSubtitle>
                </div>
              </CardHeader>
              <CardContent className="account-card-body">
                <div className="danger-zone-content">
                  <p className="danger-zone-desc">
                    Signing out will invalidate your active session token. You will need to log back
                    in to access your workspace.
                  </p>
                  <Button
                    variant="danger"
                    onClick={handleLogout}
                    isLoading={isLoggingOut}
                    loadingText="Signing out..."
                  >
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 3: Preferences */}
        {activeTab === 'preferences' && (
          <div className="account-sections-list">
            <Card className="account-card">
              <CardHeader className="account-card-header">
                <div>
                  <CardTitle>Interface & Theme</CardTitle>
                  <CardSubtitle>Customize your dashboard viewing preferences.</CardSubtitle>
                </div>
              </CardHeader>
              <CardContent className="account-card-body">
                <div className="account-settings-row">
                  <div>
                    <p className="setting-title">Theme Appearance</p>
                    <p className="setting-desc">
                      Currently set to Dark SaaS Theme (optimized for low-light environments).
                    </p>
                  </div>
                  <span className="setting-status-pill">Dark Mode (Default)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Edit Profile Modal (Dummy Interactive UI) */}
      {showEditModal && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Profile</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  defaultValue={user.name}
                  className="input-field"
                  id="edit-modal-name"
                />
              </div>
              <div className="input-group" style={{ marginTop: '14px' }}>
                <label className="input-label">Email Address (Read-only)</label>
                <input type="email" value={user.email} disabled className="input-field" />
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowEditModal(false);
                  triggerToast('Profile updated successfully.');
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal (Dummy Interactive UI) */}
      {showPasswordModal && (
        <div className="modal-backdrop" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Change Password</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowPasswordModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">Current Password</label>
                <input type="password" placeholder="••••••••" className="input-field" />
              </div>
              <div className="input-group" style={{ marginTop: '14px' }}>
                <label className="input-label">New Password</label>
                <input type="password" placeholder="Minimum 6 characters" className="input-field" />
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowPasswordModal(false);
                  triggerToast('Password updated successfully.');
                }}
              >
                Update Password
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
