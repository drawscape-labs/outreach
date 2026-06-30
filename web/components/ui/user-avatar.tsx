import cn from "clsx";

import {Avatar} from "@/components/ui/avatar";

const avatarColorClasses = [
  "bg-red-500 text-white",
  "bg-orange-500 text-white",
  "bg-amber-500 text-white",
  "bg-green-500 text-white",
  "bg-teal-500 text-white",
  "bg-blue-500 text-white",
  "bg-cyan-500 text-white",
  "bg-violet-500 text-white",
  "bg-pink-500 text-white",
];

type UserAvatarProps = {
  alt?: string;
  className?: string;
  email?: string | null;
  fallbackLabel?: string;
};

type UserIdentityProps = {
  avatarClassName?: string;
  className?: string;
  email?: string | null;
  fallbackLabel?: string;
  labelClassName?: string;
};

export function getUserDisplayName(
  email?: string | null,
  fallbackLabel = "Unknown"
) {
  const normalizedEmail = normalizeUserValue(email);

  if (!normalizedEmail) {
    return fallbackLabel;
  }

  return normalizedEmail.split("@")[0] || fallbackLabel;
}

export function getUserAvatarTone(
  value?: string | null,
  fallbackLabel = "Unknown"
) {
  const hashKey = getUserAvatarHashKey(value, fallbackLabel);
  let hash = 0;

  for (let index = 0; index < hashKey.length; index += 1) {
    hash = hashKey.charCodeAt(index) + ((hash << 5) - hash);
  }

  return avatarColorClasses[Math.abs(hash) % avatarColorClasses.length];
}

export function getUserAvatarInitial(
  value?: string | null,
  fallbackLabel = "Unknown"
) {
  const displayValue = getUserDisplayName(value, fallbackLabel);
  return displayValue.charAt(0).toUpperCase() || "?";
}

export function UserAvatar({
  alt,
  className,
  email,
  fallbackLabel = "Unknown",
}: UserAvatarProps) {
  const displayName = getUserDisplayName(email, fallbackLabel);

  return (
    <Avatar
      initials={getUserAvatarInitial(email, fallbackLabel)}
      alt={alt ?? displayName}
      className={cn(className, getUserAvatarTone(email, fallbackLabel))}
    />
  );
}

export function UserIdentity({
  avatarClassName = "size-9",
  className,
  email,
  fallbackLabel = "Unknown",
  labelClassName,
}: UserIdentityProps) {
  const displayName = getUserDisplayName(email, fallbackLabel);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <UserAvatar
        email={email}
        fallbackLabel={fallbackLabel}
        className={avatarClassName}
        alt={displayName}
      />
      <span
        title={normalizeUserValue(email) ?? displayName}
        className={cn("truncate text-sm font-medium text-gray-900 dark:text-white", labelClassName)}
      >
        {displayName}
      </span>
    </div>
  );
}

function getUserAvatarHashKey(
  value?: string | null,
  fallbackLabel = "Unknown"
) {
  return normalizeUserValue(value)?.toLowerCase() || fallbackLabel.toLowerCase();
}

function normalizeUserValue(value?: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}
