import { prisma } from "@/lib/prisma";

export type BillQueueItem = {
    id: string;
    invoice_code: string;
    amount: number;
    customer_name: string;
    due_date: string | null;
    cash_register_id: string;
    payment_mode: "account" | "cash";
    items: Array<{ description: string; quantity: number; amount: number }>;
    account?: {
        id: string;
        account_number: string | null;
        total_funds: number;
        is_active: boolean;
        customer_name: string;
        customer_phone: string | null;
    };
};

export async function getMockBillsForRegister(cashRegisterId: string): Promise<BillQueueItem[]> {
    // TODO: replace with real bill source when invoice endpoints are available.
    const account = await prisma.account.findFirst({
        where: { is_active: true },
        include: { customer: { include: { person: true } } }
    });

    const now = Date.now();
    const dueSoon = new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString();
    const dueLater = new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString();

    const accountCustomer = account?.customer?.person;
    const accountName = accountCustomer?.user_first_name || "Client Account";
    const accountPhone = accountCustomer?.phone || null;

    const itemsOne = [
        { description: "Electricity bill", quantity: 1, amount: 12000 },
        { description: "Service fees", quantity: 1, amount: 1500 }
    ];
    const totalOne = itemsOne.reduce((sum, item) => sum + item.amount, 0);

    const itemsTwo = [
        { description: "Water bill", quantity: 1, amount: 7500 }
    ];
    const totalTwo = itemsTwo.reduce((sum, item) => sum + item.amount, 0);

    const bills: BillQueueItem[] = [
        {
            id: `bill-${cashRegisterId}-001`,
            invoice_code: `INV-${cashRegisterId.slice(0, 6)}-001`,
            amount: totalOne,
            customer_name: accountName,
            due_date: dueSoon,
            cash_register_id: cashRegisterId,
            payment_mode: account ? "account" : "cash",
            items: itemsOne,
            ...(account
                ? {
                      account: {
                          id: account.id,
                          account_number: account.account_number || null,
                          total_funds: Number(account.total_funds),
                          is_active: account.is_active,
                          customer_name: accountName,
                          customer_phone: accountPhone
                      }
                  }
                : {})
        },
        {
            id: `bill-${cashRegisterId}-002`,
            invoice_code: `INV-${cashRegisterId.slice(0, 6)}-002`,
            amount: totalTwo,
            customer_name: "Walk-in customer",
            due_date: dueLater,
            cash_register_id: cashRegisterId,
            payment_mode: "cash",
            items: itemsTwo
        }
    ];

    return bills;
}
