import { TiersDataInitializer } from "@/components/tiers/data-initializer"
import { TiersActionDialog } from "@/components/tiers/actions/action-dialog"

export default function TiersLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <TiersDataInitializer />
            {children}
            <TiersActionDialog />
        </>
    )
}
