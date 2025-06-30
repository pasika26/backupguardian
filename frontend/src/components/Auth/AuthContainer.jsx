import { useState } from 'react';
import Login from './Login';
import Register from './Register';

const AuthContainer = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleAuth = () => {
    setIsLogin(!isLogin);
  };

  return (
    <>
      {isLogin ? (
        <Login onToggleAuth={toggleAuth} onLogin={onLogin} />
      ) : (
        <Register onToggleAuth={toggleAuth} onLogin={onLogin} />
      )}
    </>
  );
};

export default AuthContainer;
