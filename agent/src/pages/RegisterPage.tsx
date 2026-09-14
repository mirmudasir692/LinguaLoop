import React from 'react';
import { RegisterForm } from '../components/auth';
import { AuthLayout } from '../components/ui';

export const RegisterPage: React.FC = () => {
  return (
    <AuthLayout
      brandName="LinguaLoop Auth"
      title="Create Account"
      subtitle="Join to access your secure developer environment"
    >
      <RegisterForm />
    </AuthLayout>
  );
};

export default RegisterPage;
