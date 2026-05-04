import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: string | null }>;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0a0a0a',
  border: '1px solid var(--au-line-2)',
  borderRadius: 0,
  padding: '11px 14px',
  fontSize: 13,
  color: 'var(--au-text)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.12s',
  fontFamily: 'Inter, sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10, color: 'var(--au-text-3)',
  marginBottom: 8,
  letterSpacing: '0.18em', textTransform: 'uppercase',
  fontWeight: 500,
};

const LoginPage: React.FC<LoginPageProps> = ({ onSignIn, onSignUp }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const result = await onSignUp(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess('Account created. Check your email for a confirmation link.');
          setIsSignUp(false);
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const result = await onSignIn(email, password);
        if (result.error) setError(result.error);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        padding: 24,
        position: 'relative',
      }}
    >
      {/* Index marker top-left */}
      <div className="au-eyebrow" style={{ position: 'absolute', top: 24, left: 28 }}>
        — File / 001 · Access · Auth
      </div>
      {/* Date marker top-right */}
      <div className="au-eyebrow" style={{ position: 'absolute', top: 24, right: 28, color: 'var(--au-text-4)' }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
      </div>

      <div style={{ width: '100%', maxWidth: 440, border: '1px solid var(--au-line)', background: 'transparent' }}>
        {/* Brand row */}
        <div style={{ padding: '32px 36px 24px', borderBottom: '1px solid var(--au-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <img src="/aureum-logo.svg" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
            <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--au-text)' }}>Aureum</span>
            <span
              style={{
                marginLeft: 'auto',
                minWidth: 18, height: 18,
                background: 'transparent',
                border: '1px solid var(--au-line-2)',
                display: 'grid', placeItems: 'center',
                color: 'var(--au-text-2)',
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {isSignUp ? '02' : '01'}
            </span>
          </div>
          <div className="au-eyebrow" style={{ marginBottom: 6 }}>— {isSignUp ? 'New account' : 'Returning'}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--au-text)', lineHeight: 1.1 }}>
            {isSignUp ? 'Create your account.' : 'Welcome back.'}
          </h1>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 36px 32px' }}>
          {error && (
            <div
              style={{
                background: 'transparent',
                border: '1px solid rgba(212,109,109,0.4)',
                padding: '10px 14px',
                marginBottom: 18,
                fontSize: 12,
                color: 'var(--au-bad)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.04em',
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              style={{
                background: 'transparent',
                border: '1px solid rgba(109,212,154,0.4)',
                padding: '10px 14px',
                marginBottom: 18,
                fontSize: 12,
                color: 'var(--au-good)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.04em',
              }}
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>— Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--au-text-3)')}
                onBlur={e => (e.target.style.borderColor = 'var(--au-line-2)')}
              />
            </div>

            <div style={{ marginBottom: isSignUp ? 16 : 22 }}>
              <label style={labelStyle}>— Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--au-text-3)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--au-line-2)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                    color: 'var(--au-text-3)', display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>— Confirm</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    style={{ ...inputStyle, paddingRight: 40 }}
                    onFocus={e => (e.target.style.borderColor = 'var(--au-text-3)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--au-line-2)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                      color: 'var(--au-text-3)', display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="au-btn-primary"
              style={{
                width: '100%',
                padding: '12px 16px',
                justifyContent: 'center',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
              {isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 22, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--au-text-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            <span>{isSignUp ? 'Have an account?' : 'New here?'}</span>
            <button
              type="button"
              onClick={toggleMode}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: 'var(--au-text)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LoginPage;
