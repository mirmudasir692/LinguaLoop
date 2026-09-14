import React from 'react';
import { LoginForm } from '../components/auth';
import { AuthLayout } from '../components/ui';

export const LoginPage: React.FC = () => {
  return (
    <AuthLayout
      brandName="LinguaLoop Auth"
      title="Account Access"
      subtitle="Sign in to access your secure developer environment"
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default LoginPage;
