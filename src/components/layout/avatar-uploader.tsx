"use client";

import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";

export function AvatarUploader() {
    const [avatarId, setAvatarId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch("/api/users/me", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setAvatarId(data?.avatarId ?? data?.avatar_id ?? null))
            .catch(() => {});
    }, []);

    async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setBusy(true);
        setError(null);
        try {
            const form = new FormData();
            form.append("file", file);
            const upload = await fetch("/api/files", { method: "POST", body: form });
            const uploaded = await upload.json();
            if (!upload.ok) throw new Error(uploaded?.error || "Upload échoué");
            const id = uploaded?.id ?? uploaded?.fileId ?? uploaded?.file_id;
            if (!id) throw new Error("Identifiant de fichier manquant");

            const save = await fetch("/api/users/me/avatar", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatarId: id })
            });
            if (!save.ok) {
                const body = await save.json().catch(() => ({}));
                throw new Error(body?.error || "Échec de la mise à jour");
            }
            setAvatarId(id);
        } catch (err: any) {
            setError(err?.message || "Erreur lors de l'envoi");
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    return (
        <div className="flex items-center gap-4">
            {avatarId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={`/api/files/${avatarId}`}
                    alt="Avatar"
                    className="h-16 w-16 rounded-full object-cover border"
                />
            ) : (
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <User className="h-7 w-7" />
                </div>
            )}
            <div className="space-y-1">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                    {busy ? "Envoi…" : "Changer la photo"}
                </button>
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPick}
            />
        </div>
    );
}
