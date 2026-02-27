type MockCustomer = {
    user_name: string;
    user_first_name: string;
    mail: string;
    country: string;
    profession: string;
};

const COUNTRY_BY_PREFIX: Record<string, string> = {
    "237": "Cameroon",
    "221": "Senegal",
    "225": "Cote d'Ivoire"
};

function normalizeDigits(value: string) {
    return value.replace(/\D+/g, "");
}

export function buildMockCustomerFromPhone(phone: string | null | undefined): MockCustomer | null {
    if (!phone) return null;
    const digits = normalizeDigits(phone);
    if (!digits) return null;

    const prefix = digits.slice(0, 3);
    const country = COUNTRY_BY_PREFIX[prefix] || "Cameroon";
    const suffix = digits.slice(-4);

    return {
        user_name: `customer_${digits}`,
        user_first_name: `Customer ${suffix}`,
        mail: `customer${suffix}@example.com`,
        country,
        profession: "Client"
    };
}
