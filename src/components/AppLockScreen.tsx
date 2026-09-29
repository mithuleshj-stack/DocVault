import React, { useState } from 'react';
import { Shield, Lock, Delete, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface AppLockScreenProps {
  onUnlock: () => void;
  userEmail?: string;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({ onUnlock, userEmail }) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length >= 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const verifyPin = async (candidatePin: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.verifyPin(candidatePin);
      if (res.valid) {
        onUnlock();
      } else {
        if (candidatePin.length >= 4) {
          setErrorMsg('Incorrect PIN. Please try again.');
          setTimeout(() => setPin(''), 600);
        }
      }
    } catch (err) {
      setErrorMsg('Failed to verify PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-slate-950 text-white flex flex-col items-center justify-center p-6 select-none animate-fade-in">
      <div className="w-full max-w-xs text-center space-y-6">
        {/* Brand Icon */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Shield className="w-8 h-8 text-teal-100" />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight">DocVault is Locked</h1>
          <p className="text-xs text-slate-400 mt-1">
            {userEmail ? `Protected vault for ${userEmail}` : 'Enter your 4-digit security PIN to unlock'}
          </p>
        </div>

        {/* PIN Dots */}
        <div className="flex items-center justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                pin.length > index
                  ? 'bg-teal-400 scale-125'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 pt-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="h-14 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 active:scale-95 text-lg font-bold font-mono transition-all flex items-center justify-center"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 active:scale-95 text-lg font-bold font-mono transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 active:scale-95 text-sm font-semibold transition-all flex items-center justify-center text-slate-400"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
