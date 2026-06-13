import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../api/client";
import { DEFAULT_PROFILE_AVATAR } from "../data/profileDisplay";
import { isAuthenticated, onAuthChange } from "../utils/authToken";
import { UserProfileContext } from "./user-profile-context";

export function UserProfileProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isAuthenticated());

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const data = await getCurrentUser();
      const next = data?.user ?? null;
      setUser(next);
      return next;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    return onAuthChange(({ authenticated }) => {
      if (authenticated) refreshUser();
      else {
        setUser(null);
        setLoading(false);
      }
    });
  }, [refreshUser]);

  const patchUser = useCallback((nextUser) => {
    if (!nextUser) return;
    setUser(nextUser);
  }, []);

  const avatarSrc = user?.avatar || DEFAULT_PROFILE_AVATAR;

  const value = useMemo(
    () => ({
      user,
      avatarSrc,
      loading,
      refreshUser,
      patchUser,
    }),
    [user, avatarSrc, loading, refreshUser, patchUser]
  );

  return (
    <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
  );
}
