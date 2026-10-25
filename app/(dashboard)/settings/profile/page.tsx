'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useUser } from '@/hooks/useUser';
import { 
  User, 
  Lock, 
  Phone, 
  Camera, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWalletManagement } from '@/hooks/useWalletManagement';
import { ConnectedWallets } from '@/components/wallet/ConnectedWallets';

interface ProfileFormValues {
  name: string;
  phone: string;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfileSettingsPage() {
  const { profile, isLoading, updateProfile, changePassword } = useUser();
  const walletManagement = useWalletManagement();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'wallet'>('profile');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
  } = useForm<ProfileFormValues>({
    values: {
      name: profile?.name || '',
      phone: profile?.phone || '',
    },
  });

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isSubmitting: isChangingPassword },
    reset: resetPassword,
    watch: watchPassword
  } = useForm<PasswordFormValues>();

  const newPassword = watchPassword('newPassword');

  const onProfileSubmit = async (data: ProfileFormValues) => {
    await updateProfile(data);
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    const success = await changePassword(data);
    if (success) resetPassword();
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      await updateProfile({ profileImage: file });
      setIsUploading(false);
    }
  };

  if (!profile && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-500 mt-2">Manage your personal information and security settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar / Tabs */}
        <aside className="w-full md:w-64 space-y-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left",
              activeTab === 'profile' 
                ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <User className="w-5 h-5" />
            <span className="font-medium">Profile Information</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left",
              activeTab === 'security' 
                ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Lock className="w-5 h-5" />
            <span className="font-medium">Security</span>
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left",
              activeTab === 'wallet' 
                ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Wallet className="w-5 h-5" />
            <span className="font-medium">Wallet Management</span>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[420px]">
            {activeTab === 'profile' ? (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col items-center sm:flex-row gap-6">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-md relative">
                      {profile?.profileImage ? (
                        <img 
                          src={profile.profileImage} 
                          alt={profile.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 text-3xl font-bold">
                          {profile?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={handleImageClick}
                      disabled={isUploading}
                      className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageChange} 
                      className="hidden" 
                      accept="image/*"
                    />
                  </div>
                  
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-semibold text-gray-900">{profile?.name}</h3>
                    <p className="text-gray-500">{profile?.email}</p>
                    <p className="text-xs text-blue-600 mt-2 font-medium uppercase tracking-wider">Member Since 2024</p>
                  </div>
                </div>

                <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Full Name
                      </label>
                      <input
                        {...registerProfile('name', { required: 'Name is required', minLength: { value: 2, message: 'Name too short' } })}
                        placeholder="John Doe"
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border transition-all outline-none focus:ring-2",
                          profileErrors.name 
                            ? "border-red-300 focus:ring-red-100" 
                            : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                        )}
                      />
                      {profileErrors.name && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {profileErrors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone Number
                      </label>
                      <input
                        {...registerProfile('phone', { required: 'Phone is required', minLength: { value: 10, message: 'Phone too short' } })}
                        placeholder="+234..."
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border transition-all outline-none focus:ring-2",
                          profileErrors.phone 
                            ? "border-red-300 focus:ring-red-100" 
                            : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                        )}
                      />
                      {profileErrors.phone && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {profileErrors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading || !isProfileDirty}
                      className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                      Save Changes
                    </button>
                  </div>
                </form>
              </section>
            ) : activeTab === 'security' ? (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Change Password</h3>
                  <p className="text-gray-500 text-sm mt-1">Ensure your account is using a long, random password to stay secure.</p>
                </div>

                <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Current Password</label>
                    <input
                      type="password"
                      {...registerPassword('currentPassword', { required: 'Current password is required' })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border transition-all outline-none focus:ring-2",
                        passwordErrors.currentPassword 
                          ? "border-red-300 focus:ring-red-100" 
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                      )}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="text-xs text-red-500 mt-1">{passwordErrors.currentPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">New Password</label>
                    <input
                      type="password"
                      {...registerPassword('newPassword', { 
                        required: 'New password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' }
                      })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border transition-all outline-none focus:ring-2",
                        passwordErrors.newPassword 
                          ? "border-red-300 focus:ring-red-100" 
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                      )}
                    />
                    {passwordErrors.newPassword && (
                      <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                    <input
                      type="password"
                      {...registerPassword('confirmPassword', { 
                        required: 'Please confirm your password',
                        validate: (value) => value === newPassword || "Passwords don't match"
                      })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border transition-all outline-none focus:ring-2",
                        passwordErrors.confirmPassword 
                          ? "border-red-300 focus:ring-red-100" 
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                      )}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="w-full sm:w-auto px-8 py-3 bg-gray-900 text-white font-semibold rounded-xl shadow-lg shadow-gray-200 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      {isChangingPassword ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                      Update Password
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ConnectedWallets
                  wallets={walletManagement.wallets}
                  activeAddress={walletManagement.activeAddress}
                  isLoading={walletManagement.isLoading}
                  isDisconnecting={walletManagement.isDisconnecting}
                  isSettingPrimary={walletManagement.isSettingPrimary}
                  isConnecting={walletManagement.isConnecting}
                  error={walletManagement.error}
                  onRefresh={walletManagement.refetch}
                  onSetActive={walletManagement.setActiveWallet}
                  onSetPrimary={(wallet) => walletManagement.setPrimaryWallet(wallet.id)}
                  onConnect={() => walletManagement.connectWallet('freighter')}
                  onDisconnect={walletManagement.disconnectWallet}
                />
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
