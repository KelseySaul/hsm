import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('fetchProfile error:', err.message);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const prof = await fetchProfile(session.user.id);
          if (mounted) setProfile(prof);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('initSession error:', err);
      } finally {
        if (mounted) {
          initDone.current = true;
          setLoading(false);
        }
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Skip until initSession has resolved to prevent race condition on page load
      if (!initDone.current) return;

      if (session?.user) {
        setUser(prev => (prev?.id === session.user.id ? prev : session.user));
        if (event === 'SIGNED_IN') {
          const prof = await fetchProfile(session.user.id);
          if (mounted) setProfile(prof);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Simple signOut - just calls supabase. The SIGNED_OUT event handler clears state.
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);