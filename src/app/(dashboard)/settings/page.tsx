import { SettingsPanel } from "@/components/layout/settings-panel";
import { AvatarUploader } from "@/components/layout/avatar-uploader";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your notification preferences</p>
            </div>
            <div className="rounded-xl border bg-card p-6 max-w-xl">
                <h2 className="text-lg font-semibold mb-4">Photo de profil</h2>
                <AvatarUploader />
            </div>
            <div className="rounded-xl border bg-card p-6 max-w-xl">
                <SettingsPanel />
            </div>
        </div>
    );
}
