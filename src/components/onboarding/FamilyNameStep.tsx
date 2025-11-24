/**
 * Family Name Step
 * First step of onboarding: capture the family name for filtering person extraction
 */

import React, { useState } from 'react';
import { Users, ArrowRight } from 'lucide-react';

interface FamilyNameStepProps {
  onComplete: (familyName: string) => void;
  darkMode?: boolean;
}

export const FamilyNameStep: React.FC<FamilyNameStepProps> = ({
  onComplete,
  darkMode = false
}) => {
  const [familyName, setFamilyName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = familyName.trim();

    if (!trimmed) {
      setError('Please enter your family name');
      return;
    }

    if (trimmed.length < 2) {
      setError('Family name must be at least 2 characters');
      return;
    }

    onComplete(trimmed);
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
        darkMode ? 'bg-blue-900' : 'bg-blue-100'
      }`}>
        <Users size={40} className="text-blue-500" />
      </div>

      <h3 className="text-2xl font-bold mb-2">Welcome to Lifemap</h3>

      <p className={`text-center max-w-md mb-8 ${
        darkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        Let's start by setting up your family's lifemap. We'll automatically detect
        and organize documents for people with your family name.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="mb-6">
          <label
            htmlFor="familyName"
            className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            Family Name
          </label>
          <input
            id="familyName"
            type="text"
            value={familyName}
            onChange={(e) => {
              setFamilyName(e.target.value);
              setError('');
            }}
            placeholder="e.g., Thebault Family"
            className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } ${error ? 'border-red-500' : ''}`}
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
          <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Only people with this family name will be extracted from your documents.
          </p>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight size={20} />
        </button>
      </form>
    </div>
  );
};
