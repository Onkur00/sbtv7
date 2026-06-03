import React, { useState, useRef, useEffect } from 'react';
import { userCredentials, UserCredential } from '../users/credentials.ts';
import { playBeep } from '../utils/beep.ts';
import { Tv, Lock, User, Key, AlertTriangle } from 'lucide-react';
import { hashPassword, obfuscateData, deobfuscateData } from '../utils/crypto.ts';

interface LoginProps {
  onLoginSuccess: (user: UserCredential) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem('tv_remembered_username') || '';
    return deobfuscateData(saved);
  });
  const [password, setPassword] = useState(() => {
    const saved = localStorage.getItem('tv_remembered_password') || '';
    return deobfuscateData(saved);
  });
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('tv_remembered_checked') !== 'false'; // Default to true
  });
  const [error, setError] = useState('');

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Focus on relevant input on load
  useEffect(() => {
    if (usernameRef.current && !usernameRef.current.value) {
      usernameRef.current.focus();
    } else if (passwordRef.current && !passwordRef.current.value) {
      passwordRef.current.focus();
    } else if (submitBtnRef.current) {
      submitBtnRef.current.focus();
    }
  }, []);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const parsedUsername = username.trim();
    const parsedPassword = password.trim();

    if (!parsedUsername || !parsedPassword) {
      setError('Please fill in all fields');
      playBeep('select'); // beep on failure/warning
      return;
    }

    // Lookup user in credentials folder using direct plain password match
    const user = userCredentials.find(
      (u) => u.username.toLowerCase() === parsedUsername.toLowerCase() && u.password === parsedPassword
    );

    if (user) {
      playBeep('select');

      // Prepare a sanitized user session representation (omitting local password from active memory if possible, or keeping it clean)
      const sanitizedUser: UserCredential = {
        username: user.username,
        deviceLimit: user.deviceLimit,
        displayName: user.displayName
      };

      // Store in localStorage for session
      localStorage.setItem('tv_logged_in_user', JSON.stringify(sanitizedUser));

      // Handle Remember Me credentials saving (obfuscated symmetrically)
      if (rememberMe) {
        localStorage.setItem('tv_remembered_username', obfuscateData(parsedUsername));
        localStorage.setItem('tv_remembered_password', obfuscateData(parsedPassword));
        localStorage.setItem('tv_remembered_checked', 'true');
      } else {
        localStorage.removeItem('tv_remembered_username');
        localStorage.removeItem('tv_remembered_password');
        localStorage.setItem('tv_remembered_checked', 'false');
      }

      onLoginSuccess(sanitizedUser);
    } else {
      setError('Invalid Username or Password');
      playBeep('select');
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      {/* Decorative background grid and glowing circles */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25"></div>
      
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md relative z-10 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-radial from-yellow-400 to-amber-500 p-2.5 rounded-2xl shadow-xl shadow-yellow-500/10 border-2 border-yellow-300 mb-4 animate-pulse">
            <Tv className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white font-sans">
            LIVE <span className="text-white">TV</span>
          </h1>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border-2 border-slate-800/40 rounded-2xl p-6.5 shadow-2xl">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-5 pb-3 border-b border-slate-800">
            <Lock className="w-4 h-4 text-yellow-400" /> Sign In Required
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username input */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                User Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                  <User className="w-4 h-4" />
                </span>
                <input
                  ref={usernameRef}
                  id="usernameInput"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-yellow-400 py-2.5 pl-9 pr-4 rounded-xl text-white text-sm outline-hidden focus:ring-2 focus:ring-yellow-400/20 transition-all font-mono"
                  placeholder="Username"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Password
              </label>
              
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  ref={passwordRef}
                  id="passwordInput"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-yellow-400 py-2.5 pl-9 pr-4 rounded-xl text-white text-sm outline-hidden focus:ring-2 focus:ring-yellow-400/20 transition-all font-mono"
                  placeholder="••••"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Remember Me Checkbox option */}
            <div className="flex items-center pb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-semibold select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    playBeep('move');
                    setRememberMe(e.target.checked);
                  }}
                  className="accent-yellow-400 w-4 h-4 rounded border-slate-800 cursor-pointer text-slate-950 bg-slate-950 focus:ring-0"
                />
                <span className="group-hover:text-white transition-colors">
                  Remember Me
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-2 text-red-400 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="leading-relaxed font-semibold">{error}</p>
              </div>
            )}

            {/* Login button */}
            <button
              ref={submitBtnRef}
              id="loginSubmitBtn"
              type="submit"
              className="w-full bg-linear-to-r from-yellow-400 to-amber-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-yellow-500/10 hover:brightness-110 active:scale-98 transition-all font-mono tracking-wide text-xs uppercase cursor-pointer border border-yellow-300"
            >
              CONNECT CLIENT
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
