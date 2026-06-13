import { useUserProfile } from "../hooks/useUserProfile";

/** Navbar / header profile thumbnail — stays in sync after profile photo updates. */
export function ProfileNavAvatar({ className = "", width = 28, height = 28 }) {
  const { avatarSrc } = useUserProfile();

  return (
    <img
      src={avatarSrc}
      alt=""
      className={className}
      width={width}
      height={height}
    />
  );
}
