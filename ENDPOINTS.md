# API endpoints used by the frontend

Base prefix: `/api`

Auth: `POST /auth/login` sets a `session` cookie. All endpoints below require the cookie unless marked **public**.

Timestamps are ISO-8601 strings. Errors are `{ "error": "..." }` with 4xx/5xx unless noted.

## Login flows (all actors)

All actors use `POST /auth/login`. The difference is the selectors.

- ERP admin (superadmin)
  - Body:
    ```json
    { "username": "ERP_admin", "password": "..." }
    ```
- Organization admin
  - Body:
    ```json
    { "username": "org_admin", "password": "...", "organization_id": "ORG_ID" }
    ```
- Agency admin
  - Body:
    ```json
    { "username": "agency_admin", "password": "...", "organization_id": "ORG_ID", "agency_id": "AGENCY_ID" }
    ```
- Cashier
  - Body:
    ```json
    { "username": "cashier1", "password": "..." }
    ```

Success response:
```json
{ "success": true }
```

Error response:
```json
{ "error": "Invalid credentials" }
```

Helpers for selectors:
- **public** `GET /public/organizations`
- **public** `GET /public/agencies?organizationId=ORG_ID`

## Auth and session

### POST /auth/login
- Body: `{ username, password, organization_id?, agency_id? }`
- 200: `{ "success": true }` + sets `session` cookie

### POST /auth/logout
- Body: none
- 200: `{ "success": true }`

### GET /auth/session
- 200:
  ```json
  {
    "user": {
      "id": "...",
      "username": "...",
      "role": "admin|cashier",
      "roleType": "superadmin|organization_admin|agency_admin|null",
      "agencyId": "...|null",
      "organizationId": "...|null"
    },
    "organization": { "id": "...", "name": "..." } | null,
    "agency": { "id": "...", "name": "..." } | null
  }
  ```

## User profile (admin settings)

### GET /users/profile
- 200:
  ```json
  {
    "id": "...",
    "user_name": "...",
    "user_first_name": "...",
    "telegram_chat_id": "...|null",
    "telegram_bot_token": "...|null",
    "role_type": "organization_admin|agency_admin|null",
    "agency_id": "...|null",
    "organization_id": "...|null",
    "monitor_all_agencies": true,
    "monitor_agency_ids": ["..."],
    "monitor_all_registers": true,
    "monitor_register_ids": ["..."]
  }
  ```

### PUT /users/profile
- Body:
  ```json
  {
    "telegram_chat_id": "...|null",
    "telegram_bot_token": "...|null",
    "monitor_all_agencies": true,
    "monitor_agency_ids": ["..."],
    "monitor_all_registers": true,
    "monitor_register_ids": ["..."]
  }
  ```
- 200:
  ```json
  { "id": "...", "telegram_chat_id": "...|null", "telegram_bot_token": "...|null" }
  ```

## Admin users

### GET /users/admins
- 200: `[{ person + adminProfile + agency + organization }]`

### POST /users/admins
- Body (lookup by phone or person_id):
  ```json
  { "person_id": "..." }
  ```
  or
  ```json
  { "phone": "+237..." }
  ```
- Superadmin also requires `organization_id`.
- Org admin also requires `agency_id`.
- 200: `{ person + adminProfile + agency + organization }`

### PUT /users/admins/[id]
- Body (common profile fields):
  ```json
  {
    "user_first_name": "...",
    "user_name": "...",
    "mail": "...",
    "account_number": "...",
    "country": "...",
    "phone": "...",
    "telegram_chat_id": "...",
    "actif": true
  }
  ```
- Superadmin also uses:
  ```json
  { "organization_id": "...", "organization_bot_token": "..." }
  ```
- Org admin also uses:
  ```json
  { "agency_id": "..." }
  ```
- 200: `{ person + adminProfile + agency + organization }`

### DELETE /users/admins/[id]
- Body: none
- 200: `{ "success": true }`

## Cashiers

### GET /users/cashiers
- 200: `[{ person + cashierProfile + agencyAssignments }]`

### POST /users/cashiers
- Body (required):
  ```json
  {
    "user_name": "...",
    "user_first_name": "...",
    "password": "...",
    "account_number": "...",
    "work_town": "...",
    "base_agency_id": "..."
  }
  ```
- Body (optional):
  ```json
  { "mail": "...", "phone": "...", "country": "...", "town_list_chosen": ["..."], "hire_date": "...", "organization_id": "..." }
  ```
- 200: `{ person + cashierProfile }`

### PUT /users/cashiers/[id]
- Body:
  ```json
  {
    "user_name": "...",
    "user_first_name": "...",
    "country": "...",
    "town_list_chosen": ["..."],
    "work_town": "...",
    "hire_date": "...",
    "organization_id": "...",
    "base_agency_id": "..."
  }
  ```
- 200: `{ person + cashierProfile }`

### DELETE /users/cashiers/[id]
- 200: `{ "success": true }`

## Organizations (ERP admin only)

### GET /organizations
- 200: `[{ id, name, country, description, telegram_bot_token, is_active, creator }]`

### POST /organizations
- Body:
  ```json
  { "name": "...", "country": "...", "description": "...", "telegram_bot_token": "...", "is_active": true }
  ```
- 200: `{ organization }`

### PUT /organizations/[id]
- Body:
  ```json
  { "name": "...", "country": "...", "description": "...", "telegram_bot_token": "...", "is_active": true }
  ```
- 200: `{ organization }`

### DELETE /organizations/[id]
- 200: `{ "success": true }`

## Agencies

### GET /agencies
- Query: `country?`, `town?`, `organization_id?` (superadmin only)
- 200: `[{ agency + cashRegisters (sessions summary) }]`

### POST /agencies
- Body:
  ```json
  {
    "name": "...",
    "country": "...",
    "town": "...",
    "neighborhood": "...",
    "address": "...",
    "location_hint": "...",
    "is_active": true,
    "requires_admin_assignment": false,
    "organization_id": "..."
  }
  ```
- 200: `{ agency + cashRegisters (sessions summary) }`

### PUT /agencies/[id]
- Body:
  ```json
  {
    "name": "...",
    "country": "...",
    "town": "...",
    "neighborhood": "...",
    "address": "...",
    "location_hint": "...",
    "is_active": true,
    "requires_admin_assignment": false
  }
  ```
- 200: `{ agency + cashRegisters (sessions summary) }`

### DELETE /agencies/[id]
- 200: `{ "success": true }`

## Cash registers

### GET /cash-registers
- 200: `[{ register + agency + assignedCashier + lastSession[] }]`

### POST /cash-registers
- Body:
  ```json
  {
    "adress": "...",
    "country": "...",
    "town": "...",
    "neighborhood": "...",
    "ip_address": "...",
    "mac_address": "...",
    "image_url": "...",
    "min_open_time": "08:00",
    "max_close_time": "20:00"
  }
  ```
- 200: `{ register }`

### GET /cash-registers/[id]
- 200: `{ register + agency + assignedCashier + sessions[] (with movements, ticketing, reconciliation) }`

### PUT /cash-registers/[id]
- Body:
  ```json
  {
    "ip_address": "...",
    "mac_address": "...",
    "neighborhood": "...",
    "town": "...",
    "country": "...",
    "is_active": true,
    "min_open_time": "08:00",
    "max_close_time": "20:00"
  }
  ```
- 200: `{ register + agency + assignedCashier + sessions[] }`

### DELETE /cash-registers/[id]
- 200: `{ "success": true }`

### POST /cash-registers/[id]/assign
- Body:
  ```json
  {
    "cashier_id": "...",
    "initial_funds": { "total": 10000, "denominations": { "denom_id": 5 } }
  }
  ```
- 200: `{ assignment }`

## Sessions

### GET /sessions
- 200: `[{ session + cashRegister + movements + ticketingDetails + reconciliation }]`

### POST /sessions
- Body:
  ```json
  { "cash_register_id": "...", "open_by": "...", "theorical_initial_funds": 0 }
  ```
- 200: `{ session }`

### POST /sessions/[id]/close
- Body:
  ```json
  { "physical_total": 0 }
  ```
- 200:
  ```json
  {
    "success": true,
    "message": "Session closed successfully",
    "reconciliation": { "sessionData": { ... }, "reconciliation": { ... } }
  }
  ```

### POST /sessions/[id]/lock
- Body: none
- 200: `{ "success": true, "message": "...", "session": { ... } }`

### DELETE /sessions/[id]/lock
- Body: none
- 200: `{ "success": true, "message": "...", "session": { ... } }`

### GET /cashier/sessions
- 200: `[{ session + cashRegister + movements + ticketingDetails + reconciliation }]`

## Assignments

### GET /admin/assignments
- 200: `[{ id, person, cashRegister, day, ... }]`

### GET /admin/cashier-agency-assignments
- 200: `[{ id, cashier, agency, start_on, end_on, assigned_on }]`

### POST /admin/cashier-agency-assignments
- Body:
  ```json
  { "cashier_id": "...", "agency_id": "...", "start_on": "YYYY-MM-DD", "end_on": "YYYY-MM-DD" }
  ```
- 200: `{ assignment }`

### DELETE /admin/cashier-agency-assignments
- Body:
  ```json
  { "id": "ASSIGNMENT_ID" }
  ```
- 200: `{ assignment }` (updated end_on)

## Accounts and customers

### GET /admin/accounts
- 200:
  ```json
  [
    {
      "id": "...",
      "account_number": "...",
      "total_funds": 0,
      "is_active": true,
      "create_on": "...",
      "ownerId": "...",
      "owner": { "name": "...", "username": "...", "role": "customer|cashier|admin" },
      "events": [ ... ],
      "operations": [ ... ]
    }
  ]
  ```

### GET /admin/customers
- 200: `[{ id, person, phone, accounts, totalBalance, accountsCount }]`

### POST /admin/customers
- Body:
  ```json
  {
    "phone": "+237...",
    "user_first_name": "...",
    "user_name": "...",
    "mail": "...",
    "country": "...",
    "profession": "...",
    "account_number": "...",
    "initial_balance": 0
  }
  ```
- 200: `{ id, person, accounts: [account] }`

### GET /cashier/accounts
- 200: `[{ account + customer + events }]`

### GET /cashier/customers
- 200: `[{ customer + person + accounts + totalBalance + accountsCount }]`

### GET /customers/search
- Query: `q`
- 200: `[{ customer + person + accounts }]`

### POST /accounts/transfer (deposit)
- Body:
  ```json
  { "account_id": "...", "amount": 1000, "ticketing": [], "reason": "...", "reference": "..." }
  ```
- 200: `{ "success": true, "newBalance": 0, "movementId": "...", "reference": "..." }`

### POST /accounts/withdraw
- Body:
  ```json
  { "account_id": "...", "amount": 1000, "ticketing": [], "reason": "...", "reference": "..." }
  ```
- 200: `{ "success": true, "newBalance": 0, "movementId": "...", "reference": "..." }`

### POST /accounts/transfer-p2p
- Body:
  ```json
  { "source_account_id": "...", "dest_account_id": "...", "amount": 1000, "ticketing": [], "reference": "..." }
  ```
- 200: `{ "success": true, "inMovementId": "...", "outMovementId": "...", "reference": "..." }`

## Bills

### GET /cashier/bills
- 200: `[{ id, invoice_code, amount, customer_name, due_date, cash_register_id, payment_mode, items[], account? }]`

### GET /cashier/bills/[id]
- 200: `{ bill }` (same shape as list item)

### GET /bills
- Query: `page?`, `limit?`, `search?`
- 200: `{ bills: [movement], total, page, totalPages }`

### POST /bills/pay
- Body:
  ```json
  {
    "invoice_code": "...",
    "amount": 1000,
    "payment_mode": "cash|account",
    "cash_given": 1000,
    "ticketing": [],
    "change_ticketing": [],
    "account_id": "..."
  }
  ```
- 200 (cash): `{ "success": true, "movement_id": "...", "change": 0 }`
- 200 (account): `{ "success": true, "inMovementId": "...", "outMovementId": "...", "reference": "..." }`

## Movements and transactions

### GET /cashier/movements
- Query: `sense?`, `hasInvoice?`, `isTransfer?`, `type?`
- `type` values: `deposit`, `withdrawal`, `p2p_transfer`, `bill`, `change`
- 200: `[{ movement + recipient?, emitter?, sourceRegister?, destinationRegister? }]`

### POST /movements/transfer
- Body:
  ```json
  { "amount": 1000, "ticketing": [] }
  ```
- 200: `{ "success": true, "message": "...", "newBalance": 0, "sourceRegister": { ... } }`

### POST /movements/[id]/account
- Body: none
- 200: `{ "success": true, "movement": { ... } }`

### GET /transactions
- Query: `startDate?`, `endDate?`, `registerId?`, `cashierId?`, `type?`, `page?`, `limit?`
- 200: `{ movements: [movement], total, page, totalPages }`

### GET /transactions/recent
- 200: `[{ id, amount, sense, reason, createdAt, cashier, register, customer, externalReference }]`

## Reconciliations

### GET /admin/reconciliations
- 200: `[{ reconciliation + session + cashRegister + opener + closer + creator }]`

### GET /cashier/reconciliations
- 200: `[{ reconciliation + session + cashRegister + opener + closer + creator }]`

### POST /reconciliations/[id]/review
- Body:
  ```json
  { "action": "valide" | "rejete", "admin_comment": "..." }
  ```
- 200: `{ "success": true, "message": "...", "reconciliation": { ... } }`

### POST /reconciliations/[id]/justify
- Body:
  ```json
  { "justification": "..." }
  ```
- 200: `{ "success": true, "message": "...", "reconciliation": { ... } }`

## Reports and dashboard

### GET /reports/transactions
- Query: `startDate?`, `endDate?`, `registerId?`, `cashierId?`, `type?`
- 200: PDF (`Content-Type: application/pdf`)

### POST /reports/register/[id]
- Body:
  ```json
  { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }
  ```
- 200: PDF (`Content-Type: application/pdf`)

### GET /reports/session/[id]
- 200: PDF (`Content-Type: application/pdf`)

### GET /dashboard/stats
- 200 (cashier):
  ```json
  { "totalRevenue": 0, "activeSessions": 0, "todayMovements": 0, "todayTotal": 0, "monthlyRevenue": 0, "cashierData": {}, "role": "cashier" }
  ```
- 200 (admin):
  ```json
  { "totalRevenue": 0, "activeSessions": 0, "todayMovements": 0, "todayTotal": 0, "monthlyRevenue": 0, "dailyRevenue": [], "hourlyRevenue": [], "role": "admin" }
  ```

## Documents, audit, notifications

### GET /admin/documents
- 200: `[{ document + uploader + adminProfile }]`

### GET /audit
- Query: `limit?`, `agencyId?`
- 200: `[ { id, type, date_time, payload, author } ]`

### POST /audit
- Body:
  ```json
  { "path": "...", "method": "...", "ip": "...", "payload": { ... } }
  ```
- 200: `{ "success": true }`

### POST /notify-unauthorized
- Body:
  ```json
  { "path": "...", "username": "...", "userId": "...", "agencyId": "...", "organizationId": "...", "ip": "...", "userAgent": "...", "macAddress": "..." }
  ```
- 200: `{ "ok": true }`

### GET /notifications
- 200:
  ```json
  { "newsletters": [ { "id": "...", "title": "...", "content": "..." } ], "forums": [ { "id": "...", "title": "...", "messages": [ ... ] } ] }
  ```

### POST /notifications/test
- Body:
  ```json
  { "chat_id": "...", "bot_token": "..." }
  ```
- 200: `{ "ok": true }`

## Config

### GET /config/denominations
- 200: `[{ id, currency, value, label, order, is_active }]`

### GET /settings/monitoring-options
- 200:
  ```json
  {
    "agencies": [{ "id": "...", "name": "...", "town": "...", "neighborhood": "..." }],
    "registers": [{ "id": "...", "town": "...", "neighborhood": "...", "agency": { "id": "...", "name": "..." } }]
  }
  ```

## Public (no auth)

### GET /public/organizations
- 200: `[{ id, name, country, is_active }]`

### GET /public/agencies
- Query: `organizationId`
- 200: `[{ id, name, country, town, neighborhood, is_active }]`

## External or upstream platform endpoints (mocked today)

These are expected to be provided by another system and are mocked locally for now.

External platform base URLs (to be used when endpoints are available):
- Yowyob Tiers API: `https://gestiontiersbackend-yowyob.onrender.com`
- Yowyob ERP - Accounting API: `https://yowyob-erp-backend-2duy.onrender.com`

### GET /lookup/admin
- Query: `phone`
- 200: `{ person + adminProfile }`

### GET /lookup/cashier
- Query: `id`
- 200: `{ id, user_name, user_first_name, account_number, country, mail?, phone?, password?, source }`

### GET /lookup/customer
- Query: `phone`
- 200: `{ phone, user_name, user_first_name, mail, country, profession, source }`

### GET /lookup/organization
- Query: `code`
- 200: `{ id, name, country?, description?, telegram_bot_token?, is_active? }`
