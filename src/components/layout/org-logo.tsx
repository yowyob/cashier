"use client";

import { useEffect, useState } from "react";

export function OrgLogo() {
    const [logoId, setLogoId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        fetch("/api/organizations/current", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (active) setLogoId(data?.logoId ?? data?.logo_id ?? null);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    if (!logoId) return null;
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/files/${logoId}`} alt="Logo" className="h-8 w-8 rounded object-cover border" />
    );
}
