import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signin, verifyOTP, resendOTP } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  // OTP Modal State
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleFillDemo = () => {
    setEmail('demo@mistcloud.com');
    setPassword('password123');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const res = await signin({ email, password });
      setAccountId(res.accountId);
      toast.success('Verification code sent to your email!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !otpCode) return;

    setIsVerifying(true);
    setOtpError('');
    try {
      const res = await verifyOTP({ accountId, password: otpCode });
      login(res.token, res.user);
      toast.success('Successfully signed in!');
      navigate('/');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid verification code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOTP(email);
      toast.success('Verification code resent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Left side illustration panel */}
      <section className="bg-brand p-10 hidden lg:flex lg:w-1/2 xl:w-2/5 items-center justify-center">
        <div className="flex max-h-[800px] max-w-[430px] flex-col justify-center space-y-8">
          <img src="/Mist (1).png" alt="logo" className="h-20 w-auto object-contain self-start" />

          <div className="space-y-3 text-white">
            <h1 className="text-3xl font-bold">Manage your files the best way</h1>
            <p className="text-sm text-white/90">The only cloud storage solution you need.</p>
          </div>

          <div className="py-5 transition-transform hover:rotate-2 hover:scale-105 duration-300">
            <img src="/Illustration.png" alt="illustration" className="h-auto w-full object-contain" />
          </div>
        </div>
      </section>

      {/* Right side form */}
      <section className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12">
        <div className="mb-8 lg:hidden">
          <img src="/mysticc.png" alt="logo" className="h-10 w-auto" />
        </div>

        <div className="w-full max-w-[420px] space-y-6">
          <div>
            <h2 className="h1 text-dark-100 font-bold mb-2">Sign in</h2>
            <p className="body-2 text-light-100">Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1 border border-light-300 rounded-xl px-4 py-2.5 focus-within:border-brand shadow-drop-1">
              <label className="text-xs text-light-100 font-medium">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="text-sm outline-none bg-transparent text-dark-100"
              />
            </div>

            <div className="flex flex-col gap-1 border border-light-300 rounded-xl px-4 py-2.5 focus-within:border-brand shadow-drop-1">
              <label className="text-xs text-light-100 font-medium">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="text-sm outline-none bg-transparent text-dark-100"
              />
            </div>

            <button
              type="button"
              onClick={handleFillDemo}
              className="text-xs text-brand hover:underline font-medium block text-right w-full cursor-pointer"
            >
              Quick Fill Demo Credentials
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="primary-btn w-full py-3 font-semibold shadow-drop-2 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading && <span className="animate-spin">⏳</span>}
              Sign In
            </button>
          </form>

          <p className="body-2 text-center text-light-100">
            Don&apos;t have an account?{' '}
            <Link to="/sign-up" className="font-semibold text-brand hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </section>

      {/* OTP MODAL */}
      {accountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 md:p-8 shadow-drop-2 animate-in zoom-in-95 relative text-center">
            <button
              type="button"
              onClick={() => setAccountId(null)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-light-300"
            >
              <img src="/assets/icons/close-dark.svg" alt="close" className="w-5 h-5" />
            </button>

            <h2 className="h2 text-dark-100 font-bold mb-2">Verify OTP</h2>
            <p className="subtitle-2 text-light-100 mb-1">
              We&apos;ve sent a verification code to <span className="text-brand font-medium">{email}</span>
            </p>
            <span className="block text-xs text-light-200 mb-6 font-medium">(Default code: 123456)</span>

            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                autoFocus
                className="w-full text-center tracking-[0.5em] text-2xl font-bold border-2 border-light-300 rounded-xl py-3 outline-none focus:border-brand text-brand"
              />

              {otpError && <p className="text-xs text-red">{otpError}</p>}

              <button
                type="submit"
                disabled={isVerifying || otpCode.length < 4}
                className="primary-btn w-full py-3 font-semibold shadow-drop-2 disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : 'Submit Code'}
              </button>
            </form>

            <div className="mt-4 text-xs text-light-200">
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                className="text-brand font-semibold hover:underline"
              >
                Click to Resend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignIn;
