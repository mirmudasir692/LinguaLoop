import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, CardContent, CardFooter, CardHeader, CardSubtitle, CardTitle } from '../ui';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

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
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user._id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!user) {
    return null;
  }

  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatDate = (dateValue: string | Date | undefined) => {
    if (!dateValue) return 'N/A';
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
      }).format(new Date(dateValue));
    } catch {
      return String(dateValue);
    }
  };

  return (
    <Card className="account-card">
      <CardHeader className="account-card-header">
        <div className="profile-identity-banner" style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
          <div className="profile-large-avatar" aria-hidden="true">
            {getInitials(user.name)}
          </div>
          <div className="profile-identity-meta">
            <div className="profile-name-row">
              <CardTitle>{user.name}</CardTitle>
              <span className="profile-status-badge">
                <span className="status-indicator-dot" />
                Active
              </span>
            </div>
            <CardSubtitle>{user.email}</CardSubtitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="account-card-body">
        <div className="account-details-grid">
          <div className="account-detail-item">
            <span className="account-detail-label">Full Name</span>
            <span className="account-detail-value">{user.name}</span>
          </div>

          <div className="account-detail-item">
            <span className="account-detail-label">Email Address</span>
            <div className="account-email-row">
              <span className="account-detail-value">{user.email}</span>
              <span className="verified-badge">Verified</span>
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
            <span className="account-detail-label">Member Since</span>
            <span className="account-detail-value">{formatDate(user.createdAt)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter style={{ padding: '16px 28px', display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="danger"
          size="sm"
          onClick={handleLogout}
          isLoading={isLoggingOut}
          loadingText="Signing out..."
        >
          Sign Out
        </Button>
      </CardFooter>
    </Card>
  );
};


