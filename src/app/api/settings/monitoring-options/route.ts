import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchBackend, readBackendJson } from "@/lib/backend";
import { cheminAgences } from "@/lib/kernel-agencies";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const roleType = session.user.roleType || null;
        const organizationId = session.user?.organizationId;
        const [agenciesRes, registersRes] = await Promise.all([
            // Les agences vivent sous leur organisation dans le noyau (/api/agencies n'existe pas).
            organizationId
                ? fetchBackend(cheminAgences(String(organizationId)), { cache: "no-store" }, "tiers")
                : Promise.resolve(new Response("[]", { status: 200 })),
            fetchBackend("/api/cash-registers", { cache: "no-store" })
        ]);

        const agenciesBody = await readBackendJson(agenciesRes);
        const registersBody = await readBackendJson(registersRes);

        const agenciesRaw = Array.isArray(agenciesBody)
            ? agenciesBody
            : Array.isArray(agenciesBody?.data)
                ? agenciesBody.data
                : [];

        const registersRaw = Array.isArray(registersBody)
            ? registersBody
            : Array.isArray(registersBody?.data)
                ? registersBody.data
                : [];

        const agencies = agenciesRaw.map((agency: any) => ({
            id: String(agency.id ?? ""),
            name: agency.name ?? "",
            town: agency.town ?? agency.city ?? "",
            neighborhood: agency.neighborhood ?? null
        }));

        const registers = registersRaw.map((register: any) => ({
            id: String(register.id ?? ""),
            town: register.town ?? "",
            neighborhood: register.neighborhood ?? null,
            ip_address: register.ip_address ?? null,
            mac_address: register.mac_address ?? null,
            adress: register.adress ?? register.address ?? null,
            // Le noyau ne joint pas l'agence à la caisse : il ne donne que agency_id. Sans ce repli,
            // le filtre par agence plus bas ne gardait jamais aucune caisse.
            agency: register.agency || register.agency_id
                ? {
                    id: String(register.agency?.id ?? register.agency_id ?? ""),
                    name: register.agency?.name ?? agencies.find((a: any) => a.id === String(register.agency_id))?.name ?? "",
                    town: register.agency?.town ?? agencies.find((a: any) => a.id === String(register.agency_id))?.town ?? "",
                    neighborhood: register.agency?.neighborhood ?? null
                }
                : null
        }));

        if (roleType === "agency_admin" && session.user.agencyId) {
            const filteredRegisters = registers.filter((reg) => reg.agency?.id === session.user.agencyId);
            return NextResponse.json({ agencies: [], registers: filteredRegisters });
        }

        if ((roleType === "organization_admin" || roleType === "superadmin") && session.user.organizationId) {
            // Agencies already scoped by backend token; filter registers by agency list for safety.
            const agencyIds = new Set(agencies.map((agency: any) => agency.id));
            const filteredRegisters = registers.filter((reg) =>
                reg.agency?.id ? agencyIds.has(reg.agency.id) : false
            );
            return NextResponse.json({ agencies, registers: filteredRegisters });
        }

        return NextResponse.json({ agencies, registers });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
