import { Client, Product, Supplier } from "@/types/core";
import { Profile, SystemAudit, User, LoginData, RegisterData } from "@/types/personnel";
import { Invoice, Order, OrderJournalEntry } from "@/types/sales";
import { GeneralOptions, FiscalYear } from "@/types/settings";
import { Warehouse, StockMovement, Inventory, WarehouseTransfer, ProductTransformation } from "@/types/stock";

const API_BASE_URL = "http://localhost:8080";
export const ACCOUNTING_API_URL = process.env.NEXT_PUBLIC_ACCOUNTING_API_URL || "http://localhost:8081/api";
export const FACTURATION_API_URL = process.env.NEXT_PUBLIC_FACTURATION_API_URL || "http://localhost:8082/api";
export const BANKING_API_URL = process.env.NEXT_PUBLIC_BANKING_API_URL || "http://localhost:8083/api";

const apiRequest = async <T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> => {
    const config: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        let errorInfo;
        try {
            errorInfo = await response.json();
        } catch (e) {
            errorInfo = { message: `Erreur API: ${response.status} ${response.statusText}` };
        }
        throw new Error(errorInfo.message || `Erreur API: ${method} ${endpoint}`);
    }

    if (method === 'DELETE' || response.status === 204) {
        return {} as T;
    }

    return response.json();
};

const safeFetchList = async <T>(endpoint: string): Promise<T[]> => {
    try {
        return await apiRequest<T[]>(endpoint);
    } catch (error) {
        console.warn(`[Offline Fallback] API indisponible pour ${endpoint}. Renvoi d'une liste vide.`);
        return [];
    }
};


export const registerUser = async (data: RegisterData): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (response.status === 409) {
        throw new Error('Cet email est déjà utilisé.');
    }

    if (!response.ok) {
        throw new Error("Une erreur s'est produite lors de l'inscription.");
    }

    return response.json();
};


export const loginUser = async (data: LoginData): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (response.status === 401) {
        throw new Error('Email ou mot de passe invalide.');
    }

    if (!response.ok) {
        throw new Error('Erreur de connexion.');
    }

    return response.json();
};

export const getClients = (query?: string): Promise<Client[]> => safeFetchList<Client>(`/clients${query ? `?q=${query}` : ''}`);
export const createClient = (data: Omit<Client, 'id'>): Promise<Client> => apiRequest<Client>("/clients", 'POST', data);
export const updateClient = (id: string, data: Partial<Client>): Promise<Client> => apiRequest<Client>(`/clients/${id}`, 'PATCH', data);
export const deleteClient = (id: string): Promise<void> => apiRequest<void>(`/clients/${id}`, 'DELETE');

export const getProducts = (query?: string): Promise<Product[]> => safeFetchList<Product>(`/products${query ? `?q=${query}` : ''}`);
export const createProduct = (data: Omit<Product, 'id'>): Promise<Product> => apiRequest<Product>("/products", 'POST', data);
export const updateProduct = (id: string, data: Partial<Product>): Promise<Product> => apiRequest<Product>(`/products/${id}`, 'PATCH', data);
export const deleteProduct = (id: string): Promise<void> => apiRequest<void>(`/products/${id}`, 'DELETE');

export const getInvoices = async (): Promise<Invoice[]> => {
    const invoices = await safeFetchList<Invoice>("/invoices");
    return invoices.map(invoice => ({ ...invoice, orderDate: new Date(invoice.orderDate), dueDate: new Date(invoice.dueDate) }));
};

export const getOrderJournal = async (): Promise<OrderJournalEntry[]> => {
    const journal = await safeFetchList<OrderJournalEntry>("/orderJournal");
    return journal.map(entry => ({ ...entry, orderDate: new Date(entry.orderDate) }));
};
export const updateOrderJournalEntry = (id: string, data: Partial<OrderJournalEntry>): Promise<OrderJournalEntry> => apiRequest<OrderJournalEntry>(`/orderJournal/${id}`, 'PATCH', data);
export const deleteOrderJournalEntry = (id: string): Promise<void> => apiRequest<void>(`/orderJournal/${id}`, 'DELETE');

export const getOrders = async (): Promise<Order[]> => {
    const orders = await safeFetchList<Order>("/orders");
    return orders.map(order => ({ ...order, orderDate: new Date(order.orderDate) }));
};
export const createOrder = (data: Omit<Order, 'id'>): Promise<Order> => apiRequest<Order>("/orders", 'POST', data);
export const updateOrder = (id: string, data: Partial<Order>): Promise<Order> => apiRequest<Order>(`/orders/${id}`, 'PATCH', data);

export const getWarehouses = (): Promise<Warehouse[]> => safeFetchList<Warehouse>('/warehouses');
export const getStockMovements = (): Promise<StockMovement[]> => safeFetchList<StockMovement>('/stockMovements');
export const createStockMovement = (data: Omit<StockMovement, 'id'>): Promise<StockMovement> => apiRequest<StockMovement>('/stockMovements', 'POST', data);

export const getWarehouseTransfers = (): Promise<WarehouseTransfer[]> => safeFetchList<WarehouseTransfer>('/warehouseTransfers');
export const createWarehouseTransfer = (data: Omit<WarehouseTransfer, 'id'>): Promise<WarehouseTransfer> => apiRequest<WarehouseTransfer>('/warehouseTransfers', 'POST', data);

export const getProductTransformations = (): Promise<ProductTransformation[]> => safeFetchList<ProductTransformation>('/productTransformations');
export const createProductTransformation = (data: Omit<ProductTransformation, 'id'>): Promise<ProductTransformation> => apiRequest<ProductTransformation>('/productTransformations', 'POST', data);

export const getInventories = (): Promise<Inventory[]> => safeFetchList<Inventory>('/inventories');
export const createInventory = (data: Omit<Inventory, 'id'>): Promise<Inventory> => apiRequest<Inventory>('/inventories', 'POST', data);
export const updateInventory = (id: string, data: Partial<Inventory>): Promise<Inventory> => apiRequest<Inventory>(`/inventories/${id}`, 'PATCH', data);
export const deleteInventory = (id: string): Promise<void> => apiRequest<void>(`/inventories/${id}`, 'DELETE');

export const getUsers = (): Promise<User[]> => safeFetchList<User>('/users');
export const createUser = (data: Omit<User, 'id' | 'creationDate'>): Promise<User> => apiRequest<User>('/users', 'POST', { ...data, creationDate: new Date().toISOString() });
export const updateUser = (id: string, data: Partial<User>): Promise<User> => apiRequest<User>(`/users/${id}`, 'PATCH', data);

export const getProfiles = (): Promise<Profile[]> => safeFetchList<Profile>('/profiles');
export const createProfile = (data: Omit<Profile, 'id'>): Promise<Profile> => apiRequest<Profile>('/profiles', 'POST', data);
export const updateProfile = (id: string, data: Partial<Profile>): Promise<Profile> => apiRequest<Profile>(`/profiles/${id}`, 'PATCH', data);
export const deleteProfile = (id: string): Promise<void> => apiRequest<void>(`/profiles/${id}`, 'DELETE');

export const getSystemAudits = (): Promise<SystemAudit[]> => safeFetchList<SystemAudit>('/systemAudits');

export const getSuppliers = (query?: string): Promise<Supplier[]> => safeFetchList<Supplier>(`/suppliers${query ? `?q=${query}` : ''}`);
export const createSupplier = (data: Omit<Supplier, 'id'>): Promise<Supplier> => apiRequest<Supplier>("/suppliers", 'POST', data);
export const updateSupplier = (id: string, data: Partial<Supplier>): Promise<Supplier> => apiRequest<Supplier>(`/suppliers/${id}`, 'PATCH', data);
export const deleteSupplier = (id: string): Promise<void> => apiRequest<void>(`/suppliers/${id}`, 'DELETE');

export const getGeneralOptions = async (): Promise<GeneralOptions> => {
    const options = await safeFetchList<GeneralOptions>('/generalOptions');
    if (!options || options.length === 0) {
        return {
            companyName: "ComOps",
            address: "Système Local",
            phone: "",
            email: "",
            currency: "XAF",
            taxRate: 19.25
        } as unknown as GeneralOptions;
    }
    return options[0];
};
export const updateGeneralOptions = (data: GeneralOptions): Promise<GeneralOptions> => apiRequest<GeneralOptions>('/generalOptions/main', 'PUT', data);

export const getFiscalYears = (): Promise<FiscalYear[]> => safeFetchList<FiscalYear>('/fiscalYears');
export const createFiscalYear = (data: Omit<FiscalYear, 'id'>): Promise<FiscalYear> => apiRequest<FiscalYear>('/fiscalYears', 'POST', data);
export const updateFiscalYear = (id: string, data: Partial<FiscalYear>): Promise<FiscalYear> => apiRequest<FiscalYear>(`/fiscalYears/${id}`, 'PATCH', data);