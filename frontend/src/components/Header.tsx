import React from 'react';
import Search from './Search';
import FileUploader from './FileUploader';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onUploadSuccess?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUploadSuccess }) => {
  const { logout } = useAuth();

  return (
    <header className="header">
      <Search />

      <div className="header-wrapper">
        <FileUploader onUploadSuccess={onUploadSuccess} />

        <button
          type="button"
          onClick={logout}
          className="sign-out-button"
          title="Sign out"
        >
          <img
            src="/assets/icons/logout.svg"
            alt="logout"
            className="w-6 h-6"
          />
        </button>
      </div>
    </header>
  );
};

export default Header;
