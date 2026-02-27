import crypto from "crypto";

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    // Backward compatibility: if no salt delimiter, assume plain text
    if (!stored.includes(":")) {
        return password === stored;
    }

    const [saltHex, hashHex] = stored.split(":");
    if (!saltHex || !hashHex) return false;

    const salt = Buffer.from(saltHex, "hex");
    const derived = crypto.scryptSync(password, salt, 64);
    const storedHash = Buffer.from(hashHex, "hex");

    return crypto.timingSafeEqual(derived, storedHash);
}
