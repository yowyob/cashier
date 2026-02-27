import fs from "fs";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "storage", "docs");

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export async function saveFile(buffer: ArrayBuffer, filename: string): Promise<string> {
    const filePath = path.join(STORAGE_DIR, filename);
    const nodeBuffer = Buffer.from(buffer);

    await fs.promises.writeFile(filePath, nodeBuffer);

    // Return relative path for storage in DB
    return `/storage/docs/${filename}`;
}

export async function getFile(filename: string): Promise<Buffer> {
    const filePath = path.join(STORAGE_DIR, filename);
    return await fs.promises.readFile(filePath);
}
