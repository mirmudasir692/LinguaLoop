import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import { SettingsModal } from '../components/settings/SettingsModal';

export const ChatPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
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
          </div>

          <div className="account-nav-right">
            {user && (
              <div className="account-user-chip">
                <div className="account-mini-avatar">{getInitials(user.name)}</div>
                <span className="account-user-name">{user.name}</span>
              </div>
            )}

            {/* Settings Icon Button */}
            <button
              type="button"
              className="btn btn-outline btn-sm settings-icon-btn"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open Settings"
              title="Settings & Profile"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>Settings</span>
            </button>

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

      {/* Main Body */}
      <main className="account-main-wrapper">
        <section className="chat-page-hero">
          <h1 className="chat-big-header">The Chat</h1>
          <p className="chat-hero-subtext">
            Welcome to LinguaLoop. This is your primary workspace canvas.
          </p>

          <div className="chat-placeholder-card">
            <svg className="chat-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Chat Interface Canvas</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Your workspace is ready. You can modify this chat page directly.
            </p>
          </div>
        </section>
      </main>

      {/* Settings Dialog Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default ChatPage;
