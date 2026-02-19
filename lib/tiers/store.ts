import { create } from 'zustand';
import { TiersUser, Tier, TiersClient, TiersFournisseur, TiersCommercial, TiersProspect, TierType } from '@/types/tiers';
import { ClientsService } from './services/ClientsService';
import { FournisseursService } from './services/FournisseursService';
import { CommerciauxService } from './services/CommerciauxService';
import { ProspectsService } from './services/ProspectsService';
import { TiersService } from './services/TiersService';
import { MOCK_TIERS } from './mock-data';

interface TiersStoreState {
    currentUser: TiersUser | null;
    tiers: Tier[];
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (email: string) => void;
    logout: () => void;
    fetchTiers: () => Promise<void>;
    addTier: (tier: Tier) => Promise<void>;
    updateTier: (id: string, tier: Partial<Tier>) => Promise<void>;
    deleteTier: (id: string) => Promise<void>;
    getTiersByType: (type: TierType) => Tier[];

    // Global Scheduler State
    isSchedulerOpen: boolean;
    schedulerTierId: string | null;
    openScheduler: (tierId?: string) => void;
    closeScheduler: () => void;
}

const MOCK_USER: TiersUser = {
    id: '1',
    email: 'admin@comops.com',
    name: 'Administrateur',
    role: 'admin',
    permissions: {
        client: ['read', 'create', 'update', 'delete', 'export'],
        fournisseur: ['read', 'create', 'update', 'delete', 'export'],
        commercial: ['read', 'create', 'update', 'delete', 'export'],
        prospect: ['read', 'create', 'update', 'delete', 'export']
    }
};

export const useTiersStore = create<TiersStoreState>((set, get) => ({
    currentUser: MOCK_USER,
    tiers: [],
    isLoading: false,
    error: null,

    login: (email: string) => set({ currentUser: MOCK_USER }),
    logout: () => set({ currentUser: null }),

    fetchTiers: async () => {
        set({ isLoading: true, error: null });
        try {
            const [clients, fournisseurs, commerciaux, prospects] = await Promise.all([
                ClientsService.getAllClients(),
                FournisseursService.getAllFournisseurs(),
                CommerciauxService.getAllCommerciaux(),
                ProspectsService.getAllProspects()
            ]);

            const formattedClients = clients.map(c => ({ ...c, type: 'client' as const } as unknown as TiersClient));
            const formattedFournisseurs = fournisseurs.map(f => ({ ...f, type: 'fournisseur' as const } as unknown as TiersFournisseur));
            const formattedCommerciaux = commerciaux.map(c => ({ ...c, type: 'commercial' as const } as unknown as TiersCommercial));
            const formattedProspects = prospects.map(p => ({ ...p, type: 'prospect' as const } as unknown as TiersProspect));

            set({
                tiers: [
                    ...MOCK_TIERS,
                    ...formattedClients,
                    ...formattedFournisseurs,
                    ...formattedCommerciaux,
                    ...formattedProspects
                ].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i),
                isLoading: false
            });
        } catch (err: any) {
            console.warn('Backend tiers indisponible, utilisation des données mock');
            set({ tiers: MOCK_TIERS, isLoading: false, error: null });
        }
    },

    addTier: async (tier: Tier) => {
        set({ isLoading: true, error: null });
        try {
            let createdTier: any;
            switch (tier.type) {
                case 'client':
                    createdTier = await ClientsService.createClient(tier as any);
                    createdTier.type = 'client';
                    break;
                case 'fournisseur':
                    createdTier = await FournisseursService.createFournisseur(tier as any);
                    createdTier.type = 'fournisseur';
                    break;
                case 'commercial':
                    createdTier = await CommerciauxService.createCommercial(tier as any);
                    createdTier.type = 'commercial';
                    break;
                case 'prospect':
                    createdTier = await ProspectsService.createProspect(tier as any);
                    createdTier.type = 'prospect';
                    break;
            }
            if (tier.actions && createdTier) createdTier.actions = tier.actions;
            if (createdTier) set((state) => ({ tiers: [...state.tiers, createdTier], isLoading: false }));
        } catch (err: any) {
            // Fallback: add locally with generated ID
            const localTier = { ...tier, id: tier.id || crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date() };
            set((state) => ({ tiers: [...state.tiers, localTier], isLoading: false, error: null }));
        }
    },

    updateTier: async (id: string, updates: Partial<Tier>) => {
        set({ isLoading: true, error: null });
        try {
            const currentTier = get().tiers.find(t => t.id === id);
            if (!currentTier) throw new Error('Tier not found');
            const type = updates.type || currentTier.type;
            const payload = { ...currentTier, ...updates };
            let updatedResult: any;

            switch (type) {
                case 'client':
                    updatedResult = await ClientsService.updateClient(id, payload as any);
                    updatedResult.type = 'client';
                    break;
                case 'fournisseur':
                    updatedResult = await FournisseursService.updateFournisseur(id, payload as any);
                    updatedResult.type = 'fournisseur';
                    break;
                case 'commercial':
                    updatedResult = await CommerciauxService.updateCommercial(id, payload as any);
                    updatedResult.type = 'commercial';
                    break;
                case 'prospect':
                    updatedResult = await ProspectsService.updateProspect(id, payload as any);
                    updatedResult.type = 'prospect';
                    break;
            }

            if (payload.actions) updatedResult.actions = payload.actions;
            else if (currentTier.actions) updatedResult.actions = currentTier.actions;

            set((state) => ({ tiers: state.tiers.map((t) => (t.id === id ? updatedResult : t)), isLoading: false }));
        } catch (err: any) {
            // Fallback: update locally
            const currentTier = get().tiers.find(t => t.id === id);
            if (currentTier) {
                const updatedTier = { ...currentTier, ...updates, updatedAt: new Date() };
                set((state) => ({ tiers: state.tiers.map((t) => (t.id === id ? updatedTier : t)), isLoading: false, error: null }));
            } else {
                set({ error: err.message || 'Error updating tier', isLoading: false });
            }
        }
    },

    deleteTier: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            await TiersService.deleteTiers(id);
            set((state) => ({ tiers: state.tiers.filter((t) => t.id !== id), isLoading: false }));
        } catch (err: any) {
            // Fallback: delete locally
            set((state) => ({ tiers: state.tiers.filter((t) => t.id !== id), isLoading: false, error: null }));
        }
    },

    getTiersByType: (type: TierType) => get().tiers.filter((t) => t.type === type),

    // Scheduler
    isSchedulerOpen: false,
    schedulerTierId: null,
    openScheduler: (tierId?: string) => set({ isSchedulerOpen: true, schedulerTierId: tierId || null }),
    closeScheduler: () => set({ isSchedulerOpen: false, schedulerTierId: null }),
}));
