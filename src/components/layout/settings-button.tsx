"use client";

import { Settings } from "lucide-react";
import { useAdminModal } from "@/components/admin/admin-modal-provider";
import { SettingsPanel } from "@/components/layout/settings-panel";

export function SettingsButton() {
    const { openModal } = useAdminModal();

    return (
        <button
            type="button"
            onClick={() =>
                openModal((close) => (
                    <div className="fixed bottom-4 right-4 z-50">
                        <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg">Settings</h3>
                                <button
                                    onClick={close}
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Close
                                </button>
                            </div>
                            <SettingsPanel />
                        </div>
                    </div>
                ))
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-accent"
        >
            <Settings className="h-4 w-4" />
        </button>
    );
}
