import React from 'react';
import AuthPage from '../components/auth/AuthPage';
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';

const ForgotPasswordPage: React.FC = () => {
  return (
    <AuthPage title="Reset your password">
      <ForgotPasswordForm />
    </AuthPage>
  );
};

export default ForgotPasswordPage;