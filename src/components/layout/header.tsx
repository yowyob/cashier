import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationsButton } from "@/components/layout/notifications-button";
import { SettingsButton } from "@/components/layout/settings-button";
import { UserAvatar } from "@/components/layout/user-avatar";
import { OrgLogo } from "@/components/layout/org-logo";

interface HeaderProps {
    title?: string | null;
    showLogout?: boolean;
    showSettings?: boolean;
}

export function Header({ title, showLogout = false, showSettings = false }: HeaderProps) {
    return (
        <header className="flex h-16 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center gap-3">
                <OrgLogo />
                <h2 className="text-lg font-semibold">{title || "Dashboard"}</h2>
            </div>
            <div className="flex items-center gap-4">
                {showSettings && <SettingsButton />}
                {showLogout && <LogoutButton />}
                <NotificationsButton />
                <UserAvatar size={32} />
            </div>
        </header>
    );
}
