import { User } from "lucide-react";
import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationsButton } from "@/components/layout/notifications-button";
import { SettingsButton } from "@/components/layout/settings-button";

interface HeaderProps {
    title?: string | null;
    showLogout?: boolean;
    showSettings?: boolean;
}

export function Header({ title, showLogout = false, showSettings = false }: HeaderProps) {
    return (
        <header className="flex h-16 items-center justify-between border-b bg-background px-6">
            <div>
                <h2 className="text-lg font-semibold">{title || "Dashboard"}</h2>
            </div>
            <div className="flex items-center gap-4">
                {showSettings && <SettingsButton />}
                {showLogout && <LogoutButton />}
                <NotificationsButton />
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <User className="h-5 w-5" />
                </div>
            </div>
        </header>
    );
}
