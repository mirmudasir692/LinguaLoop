import React, { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardSubtitle,
  CardTitle,
  ErrorMessage,
  Input,
} from '../ui';
import { getErrorMessage } from '../../services/authService';

interface LocationState {
  from?: {
    pathname: string;
  };
}

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      if (onSuccess) {
        onSuccess();
      } else {
        const targetPath = locationState?.from?.pathname || '/dashboard';
        navigate(targetPath, { replace: true });
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Unable to sign in. Please verify your email and password.');
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('test@example.com');
    setPassword('password123');
    setErrors({});
    setApiError(null);
  };

  return (
    <Card className="auth-card">
      <CardHeader>
        <div className="card-header-top">
          <div>
            <CardTitle>Welcome Back</CardTitle>
            <CardSubtitle>Sign in to access your secure console</CardSubtitle>
          </div>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="demo-pill-btn"
            title="Pre-fill test credentials"
          >
            <span className="demo-dot" />
            <span>Demo Autofill</span>
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <ErrorMessage message={apiError} onDismiss={() => setApiError(null)} />

        <form onSubmit={handleSubmit} noValidate className="auth-form" aria-label="Sign in form">
          <Input
            id="login-email"
            type="email"
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              if (apiError) setApiError(null);
            }}
            error={errors.email}
            disabled={isSubmitting}
            autoComplete="email"
            leftIcon={
              <svg className="input-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            }
            required
          />

          <Input
            id="login-password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              if (apiError) setApiError(null);
            }}
            error={errors.password}
            disabled={isSubmitting}
            showPasswordToggle
            autoComplete="current-password"
            leftIcon={
              <svg className="input-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
            required
          />

          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
            loadingText="Signing In..."
            size="lg"
          >
            Sign In to Account
          </Button>
        </form>
      </CardContent>

      <CardFooter>
        <p className="auth-footer-text">
          New to LinguaLoop?{' '}
          <Link to="/register" className="auth-link">
            Create an account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};


