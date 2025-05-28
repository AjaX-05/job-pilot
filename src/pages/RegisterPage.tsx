import React from 'react';
import AuthPage from '../components/auth/AuthPage';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <AuthPage title="Create a new account">
      <RegisterForm />
    </AuthPage>
  );
};

export default RegisterPage;