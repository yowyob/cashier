-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventTicketingDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "connection_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "value" DECIMAL NOT NULL,
    "total" DECIMAL NOT NULL,
    "denomination_id" TEXT,
    "movement_id" TEXT,
    CONSTRAINT "EventTicketingDetail_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "CashRegisterSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventTicketingDetail_denomination_id_fkey" FOREIGN KEY ("denomination_id") REFERENCES "CurrencyDenomination" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventTicketingDetail_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "CashRegisterMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EventTicketingDetail" ("connection_type", "denomination_id", "id", "quantity", "session_id", "total", "value") SELECT "connection_type", "denomination_id", "id", "quantity", "session_id", "total", "value" FROM "EventTicketingDetail";
DROP TABLE "EventTicketingDetail";
ALTER TABLE "new_EventTicketingDetail" RENAME TO "EventTicketingDetail";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
