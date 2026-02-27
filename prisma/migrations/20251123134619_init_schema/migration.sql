-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_name" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "user_first_name" TEXT NOT NULL,
    "phone" TEXT,
    "mail" TEXT,
    "card_id" TEXT,
    "born_on" DATETIME,
    "sexe" TEXT,
    "adresse" TEXT,
    "country" TEXT,
    "password" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CashierProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "town_list_chosen" TEXT,
    "hire_date" DATETIME,
    CONSTRAINT "CashierProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "office_adress" TEXT,
    CONSTRAINT "AdminProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "profession" TEXT,
    "date_of_joining" DATETIME,
    CONSTRAINT "CustomerProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cashier" TEXT,
    "user_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "double_closing_count" BOOLEAN NOT NULL DEFAULT false,
    "justifiable_threshold" REAL,
    "create_on" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_by" TEXT NOT NULL,
    "adress" TEXT,
    "country" TEXT,
    "town" TEXT,
    "image_url" TEXT,
    CONSTRAINT "CashRegister_create_by_fkey" FOREIGN KEY ("create_by") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashierManageCashRegister" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cash_register_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashierManageCashRegister_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "CashRegister" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashierManageCashRegister_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashRegisterSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cash_register_id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "open_on" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "open_by" TEXT NOT NULL,
    "close_on" DATETIME,
    "close_by" TEXT,
    "theorical_initial_funds" DECIMAL NOT NULL DEFAULT 0,
    "theorical_close_funds" DECIMAL,
    "previous_event_hash" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CashRegisterSession_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "CashRegister" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashRegisterSession_open_by_fkey" FOREIGN KEY ("open_by") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashRegisterSession_close_by_fkey" FOREIGN KEY ("close_by") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "create_on" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_by" TEXT,
    "previous_event_hash" TEXT,
    "total_funds" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Account_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "CustomerProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashRegisterEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "idempotency" TEXT,
    "date_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author_id" TEXT NOT NULL,
    "payload" TEXT,
    "hash" TEXT,
    "previous_hash" TEXT,
    CONSTRAINT "CashRegisterEvent_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "CashRegisterSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashRegisterEvent_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashRegisterMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "sense" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "reason" TEXT,
    "recipient_id" TEXT,
    "emitter_id" TEXT,
    "is_accounted" BOOLEAN NOT NULL DEFAULT false,
    "event_ticketing_details" BOOLEAN NOT NULL DEFAULT false,
    "external_reference" TEXT,
    "create_on" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_by" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CashRegisterMovement_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "CashRegisterSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashRegisterMovement_create_by_fkey" FOREIGN KEY ("create_by") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventTicketingDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "connection_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "value" DECIMAL NOT NULL,
    "total" DECIMAL NOT NULL,
    "denomination_id" TEXT,
    CONSTRAINT "EventTicketingDetail_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "CashRegisterSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventTicketingDetail_denomination_id_fkey" FOREIGN KEY ("denomination_id") REFERENCES "CurrencyDenomination" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashReconciliation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "physical_total" DECIMAL NOT NULL,
    "theorical_total" DECIMAL NOT NULL,
    "difference" DECIMAL NOT NULL,
    "statut" TEXT NOT NULL,
    "justification" TEXT,
    "create_on" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_by" TEXT NOT NULL,
    "check_on" DATETIME,
    "check_by" TEXT,
    CONSTRAINT "CashReconciliation_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "CashRegisterSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashReconciliation_create_by_fkey" FOREIGN KEY ("create_by") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashReconciliation_check_by_fkey" FOREIGN KEY ("check_by") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttachedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "objet_type" TEXT NOT NULL,
    "objet_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "type_mime" TEXT NOT NULL,
    "storage_url" TEXT NOT NULL,
    "upload_on" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upload_by" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AttachedDocument_upload_by_fkey" FOREIGN KEY ("upload_by") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CurrencyDenomination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currency" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_user_name_key" ON "Person"("user_name");

-- CreateIndex
CREATE UNIQUE INDEX "Person_mail_key" ON "Person"("mail");

-- CreateIndex
CREATE UNIQUE INDEX "CashierProfile_personId_key" ON "CashierProfile"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminProfile_personId_key" ON "AdminProfile"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_personId_key" ON "CustomerProfile"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "CashReconciliation_session_id_key" ON "CashReconciliation"("session_id");
