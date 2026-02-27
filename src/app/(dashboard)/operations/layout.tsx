import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OperationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    // Only cashiers can access operations
    if (!session || session.user.role !== "cashier") {
        redirect("/");
    }

    return <>{children}</>;
}
