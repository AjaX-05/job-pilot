import React from 'react';
import AuthPage from '../components/auth/AuthPage';
import LoginForm from '../components/auth/LoginForm';

const LoginPage: React.FC = () => {
  return (
    <AuthPage title="Sign in to your account">
      <LoginForm />
    </AuthPage>
  );
};

export default LoginPage;