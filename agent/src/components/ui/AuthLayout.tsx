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
            <span className="auth-brand-name">{brandName}</span>
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
      </div>
    </div>
  );
};
