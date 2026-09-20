import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { withPhotoCacheBuster, PHOTO_UPDATED_EVENT, EmployeePhotoUpdateDetail } from '../../utils/photoSync.ts';

interface UserAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showBorder?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  size = 'md',
  className = '',
  showBorder = true,
}) => {
  const { user } = useAuth();
  const [photoError, setPhotoError] = useState(false);
  const [photoVersion, setPhotoVersion] = useState<number>(Date.now());

  useEffect(() => {
    const handlePhotoUpdate = (e: Event) => {
      const detail = (e as CustomEvent<EmployeePhotoUpdateDetail>).detail;
      if (!detail) return;
      if (
        user &&
        (user.employeeId === detail.employeeId ||
          user.employee?.id === detail.employeeId ||
          user.employee?.employeeCode === detail.employeeCode)
      ) {
        setPhotoVersion(Date.now());
        setPhotoError(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
      }
    };
  }, [user]);

  // Resolve photo URL hierarchy
  const rawUserPhoto =
    user?.photoUrl ||
    user?.employee?.photoUrl ||
    (user?.employee?.employeeCode ? `/uploads/employees/${user.employee.employeeCode}.jpg` : null) ||
    (user?.employeeId ? `/uploads/employees/EMP-${user.employeeId}.jpg` : null);

  const userPhoto = withPhotoCacheBuster(rawUserPhoto, photoVersion);

  const userInitials = user?.employee
    ? `${user.employee.firstName?.charAt(0) || ''}${user.employee.lastName?.charAt(0) || ''}`.toUpperCase()
    : (user?.username?.substring(0, 2).toUpperCase() || 'U');

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
  };

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-tr from-purple-700 via-indigo-600 to-slate-800 text-white font-bold select-none ${
        showBorder ? 'ring-2 ring-purple-500/40 shadow-sm' : ''
      } ${sizeClasses[size]} ${className}`}
    >
      {userPhoto && !photoError ? (
        <img
          src={userPhoto}
          alt={user?.username || 'User Profile'}
          className="h-full w-full object-cover object-top"
          onError={() => setPhotoError(true)}
        />
      ) : userInitials && userInitials !== 'U' ? (
        <span>{userInitials}</span>
      ) : (
        <UserIcon className={`${iconSizes[size]} text-purple-200`} />
      )}
    </div>
  );
};
