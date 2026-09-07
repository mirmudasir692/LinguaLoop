import React, { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Full name is required';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Failed to create account. Please try again.');
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="auth-card">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardSubtitle>Join to access your secure developer workspace</CardSubtitle>
      </CardHeader>

      <CardContent>
        <ErrorMessage message={apiError} onDismiss={() => setApiError(null)} />

        <form onSubmit={handleSubmit} noValidate className="auth-form" aria-label="Sign up form">
          <Input
            id="register-name"
            type="text"
            label="Full Name"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              if (apiError) setApiError(null);
            }}
            error={errors.name}
            disabled={isSubmitting}
            autoComplete="name"
            leftIcon={
              <svg className="input-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
            required
          />

          <Input
            id="register-email"
            type="email"
            label="Email Address"
            placeholder="jane@example.com"
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
            id="register-password"
            type="password"
            label="Password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              if (apiError) setApiError(null);
            }}
            error={errors.password}
            disabled={isSubmitting}
            showPasswordToggle
            autoComplete="new-password"
            helperText="Must be at least 6 characters"
            leftIcon={
              <svg className="input-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
            required
          />

          <Input
            id="register-confirm-password"
            type="password"
            label="Confirm Password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword)
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              if (apiError) setApiError(null);
            }}
            error={errors.confirmPassword}
            disabled={isSubmitting}
            showPasswordToggle
            autoComplete="new-password"
            leftIcon={
              <svg className="input-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
            required
          />


          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
            loadingText="Creating Account..."
          >
            Create Account
          </Button>
        </form>
      </CardContent>

      <CardFooter>
        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

