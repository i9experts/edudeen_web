import { useState } from 'react';
import { refreshProfile } from '@/hooks/auth/useGetProfile';
import { apiEditProfile, type EditProfilePayload, type ProfileData } from '@/api/services/auth';

export function useEditProfile() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  async function execute(payload: EditProfilePayload): Promise<ProfileData | null> {
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      if (payload.name !== undefined && !payload.name.trim()) {
        setError('Name cannot be empty.');
        return null;
      }
      const res = await apiEditProfile(payload);
      refreshProfile(); // re-read from the server so the form/header show what was really saved
      setSuccess(true);
      return res.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { execute, loading, error, success };
}
