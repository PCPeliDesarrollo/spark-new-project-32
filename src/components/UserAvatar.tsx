import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({ avatarUrl, fullName, size = "md" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-lg"
  };

  const getInitial = () => {
    if (!fullName) return "?";
    return fullName.charAt(0).toUpperCase();
  };

  return (
    <Avatar className={sizeClasses[size]}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || "User"} />}
      <AvatarFallback className="bg-primary text-primary-foreground">
        {getInitial()}
      </AvatarFallback>
    </Avatar>
  );
}
