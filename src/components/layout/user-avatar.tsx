"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";

export function UserAvatar({ size = 32 }: { size?: number }) {
    const [avatarId, setAvatarId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        fetch("/api/users/me", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (active) setAvatarId(data?.avatarId ?? data?.avatar_id ?? null);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    const style = { width: size, height: size };
    if (avatarId) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={`/api/files/${avatarId}`}
                alt="Avatar"
                style={style}
                className="rounded-full object-cover border"
            />
        );
    }
    return (
        <div
            style={style}
            className="rounded-full bg-primary flex items-center justify-center text-primary-foreground"
        >
            <User className="h-5 w-5" />
        </div>
    );
}
