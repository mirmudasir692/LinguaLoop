import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  brandName?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  brandName = 'LinguaLoop',
}) => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="auth-layout-container">
      {/* Dynamic Background Grids & Orbs */}
      <div className="auth-bg-grid" aria-hidden="true" />
      <div className="auth-ambient-orb orb-1" aria-hidden="true" />
      <div className="auth-ambient-orb orb-2" aria-hidden="true" />

      <div className="auth-layout-wrapper">
        {/* Brand Header */}
        <header className="auth-layout-header">
          <div className="auth-brand-logo-container">
            <div className="auth-brand-symbol">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="auth-brand-info">
              <span className="auth-brand-name">{brandName}</span>
              <span className="auth-brand-tag">ENTERPRISE AUTH</span>
            </div>
          </div>
        </header>

        {/* Tab Switcher */}
        <nav className="auth-tab-nav" aria-label="Authentication mode">
          <Link
            to="/login"
            className={`auth-tab-pill ${isLogin ? 'active' : ''}`}
            aria-selected={isLogin}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className={`auth-tab-pill ${!isLogin ? 'active' : ''}`}
            aria-selected={!isLogin}
          >
            Create Account
          </Link>
        </nav>

        {/* Form Container Card */}
        <main className="auth-layout-content">
          {children}
        </main>

        {/* Feature Badges Footer */}
        <footer className="auth-layout-footer">
          <div className="auth-features-row">
            <div className="auth-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor" className="feature-icon">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              <span>JWT Encrypted</span>
            </div>
            <div className="feature-dot" />
            <div className="auth-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor" className="feature-icon">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>bcrypt Hashed</span>
            </div>
            <div className="feature-dot" />
            <div className="auth-feature-item">
              <svg viewBox="0 0 20 20" fill="currentColor" className="feature-icon">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              <span>RFC 7519 Compliant</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

