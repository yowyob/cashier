"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CreateAdminForm } from "@/components/admin/create-admin-form";

type AssignAdminPayload = {
    currentRoleType: "superadmin" | "organization_admin";
    organizationId?: string | null;
    onAssigned?: () => void;
};

type ModalRenderer = (close: () => void) => React.ReactNode;

type AdminModalContextValue = {
    openModal: (render: ModalRenderer) => void;
    openAssignAdmin: (payload: AssignAdminPayload) => void;
    closeModal: () => void;
};

const AdminModalContext = createContext<AdminModalContextValue | null>(null);

export function AdminModalProvider({ children }: { children: React.ReactNode }) {
    const [modalRenderer, setModalRenderer] = useState<ModalRenderer | null>(null);

    const closeModal = useCallback(() => {
        setModalRenderer(null);
    }, []);

    const openModal = useCallback((render: ModalRenderer) => {
        setModalRenderer(() => render);
    }, []);

    const openAssignAdmin = useCallback(
        (payload: AssignAdminPayload) => {
            openModal((close) => (
                <div className="fixed bottom-4 right-4 z-50">
                    <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">Assign admin</h3>
                            <button
                                onClick={close}
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Close
                            </button>
                        </div>
                        <CreateAdminForm
                            onCreated={() => {
                                payload.onAssigned?.();
                                close();
                            }}
                            currentRoleType={payload.currentRoleType}
                            organizationId={payload.organizationId}
                            variant="modal"
                            hideTitle
                        />
                    </div>
                </div>
            ));
        },
        [openModal]
    );

    const contextValue = useMemo<AdminModalContextValue>(() => {
        return {
            openModal,
            openAssignAdmin,
            closeModal
        };
    }, [openModal, openAssignAdmin, closeModal]);

    return (
        <AdminModalContext.Provider value={contextValue}>
            {children}
            {modalRenderer ? modalRenderer(closeModal) : null}
        </AdminModalContext.Provider>
    );
}

export function useAdminModal() {
    const ctx = useContext(AdminModalContext);
    if (!ctx) {
        throw new Error("useAdminModal must be used within AdminModalProvider");
    }
    return ctx;
}
