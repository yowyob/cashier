"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TiersDraggableDialog } from "@/components/tiers/ui/draggable-dialog"
import {
    TierType, Tier, ModePaiementClient, CategorieTransaction,
    LABEL_MODE_PAIEMENT, LABEL_CATEGORIE_TRANSACTION
} from "@/types/tiers"
import { useTiersStore } from "@/lib/tiers/store"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CreateTierDialogProps {
    type: TierType
    label?: string
}

const MODES_PAIEMENT: ModePaiementClient[] = ['CHEQUE', 'PAR_COMPTE', 'CREDIT', 'ESPECES', 'VIREMENT']
const CATEGORIES_TRANSACTION: CategorieTransaction[] = ['DETAIL', 'DEMI_GROS', 'GROS', 'SUPER_GROS']

const baseSchema = z.object({
    // Identité
    name: z.string().min(2, "Le nom est requis (min 2 caractères)"),
    shortName: z.string().optional(),
    code: z.string().optional(),
    typeEntreprise: z.enum(['PARTICULIER', 'ENTREPRISE', 'REVENDEUR']).optional(),
    formeJuridique: z.string().optional(),
    businessSector: z.enum(['IT', 'FINANCE', 'SANTE', 'INDUSTRIE', 'COMMERCE']).optional(),
    companySize: z.enum(['MICRO', 'PME', 'ETI', 'GE']).optional(),
    dateCreation: z.string().optional(),
    // Contact
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    phoneNumber: z.string().optional(),
    fax: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
    complement: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    pays: z.enum(['CMR', 'CG', 'TC', 'GB', 'CI']).optional(),
    preferredChannel: z.enum(['EMAIL', 'PHONE', 'COURRIER', 'IN_PERSON']).optional(),
    // Documents
    tradeRegistryNumber: z.string().optional(),
    taxNumber: z.string().optional(),
    nui: z.string().optional(),
    siret: z.string().optional(),
    description: z.string().optional(),
    // Client-specific
    segment: z.enum(['PARTICULIER', 'ENTREPRISE', 'REVENDEUR']).optional(),
    familleClient: z.string().optional(),
    creditLimit: z.number().optional(),
    acquisitionChannel: z.enum(['WEB', 'RESEAU', 'RECOMMANDATION']).optional(),
    vatSubject: z.boolean().optional(),
    // Fournisseur-specific
    familleFournisseur: z.string().optional(),
    deliveryLeadTime: z.string().optional(),
    conditionsPaiement: z.string().optional(),
    certification: z.string().optional(),
    // Commercial-specific
    agentType: z.enum(['INTERNE', 'EXTERNE', 'INDEPENDANT']).optional(),
    commission: z.number().optional(),
    matricule: z.string().optional(),
    // Prospect-specific
    source: z.enum(['SITE_WEB', 'RESEAU_SOCIAL', 'SALON', 'RECOMMANDATION']).optional(),
    potential: z.enum(['FAIBLE', 'MOYEN', 'ELEVE', 'STRATEGIQUE']).optional(),
    probability: z.number().min(0).max(100).optional(),
    // Multi-select arrays (handled manually)
    modesPaiementClient: z.array(z.string()).optional(),
    categoriesVente: z.array(z.string()).optional(),
    modesPaiementFournisseur: z.array(z.string()).optional(),
    categoriesAchat: z.array(z.string()).optional(),
    notes: z.string().optional(),
})

type FormValues = z.infer<typeof baseSchema>

const typeLabels: Record<TierType, string> = {
    client: 'Client',
    fournisseur: 'Fournisseur',
    commercial: 'Commercial',
    prospect: 'Prospect',
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{children}</h3>
}

export function CreateTierDialog({ type, label }: CreateTierDialogProps) {
    const [open, setOpen] = useState(false)
    const { addTier } = useTiersStore()

    const form = useForm<FormValues>({
        resolver: zodResolver(baseSchema),
        defaultValues: {
            name: "", email: "", phoneNumber: "", address: "", city: "",
            modesPaiementClient: [], categoriesVente: [],
            modesPaiementFournisseur: [], categoriesAchat: [],
            vatSubject: false,
        },
    })

    const onSubmit = async (values: FormValues) => {
        try {
            const newTier = {
                ...values,
                id: crypto.randomUUID(),
                type,
                active: true,
                postalCode: values.postalCode || "",
                createdAt: new Date(),
                updatedAt: new Date(),
                ...(type === 'client' && {
                    segment: values.segment || 'ENTREPRISE' as const,
                    modesPaiementClient: (values.modesPaiementClient || []) as ModePaiementClient[],
                    categoriesVente: (values.categoriesVente || []) as CategorieTransaction[],
                }),
                ...(type === 'fournisseur' && {
                    paymentMode: 'VIREMENT' as const,
                    modesPaiementFournisseur: (values.modesPaiementFournisseur || []) as ModePaiementClient[],
                    categoriesAchat: (values.categoriesAchat || []) as CategorieTransaction[],
                }),
                ...(type === 'commercial' && { commission: values.commission || 5, agentType: values.agentType || 'INTERNE' as const }),
                ...(type === 'prospect' && { potential: values.potential || 'MOYEN' as const }),
            } as Tier
            await addTier(newTier)
            form.reset()
            setOpen(false)
        } catch (error) {
            console.error("Error creating tier", error)
        }
    }

    const watchedModesCli = form.watch("modesPaiementClient") || []
    const watchedCatVente = form.watch("categoriesVente") || []
    const watchedModesFou = form.watch("modesPaiementFournisseur") || []
    const watchedCatAchat = form.watch("categoriesAchat") || []

    const toggleArray = (fieldName: keyof FormValues, value: string) => {
        const current = (form.getValues(fieldName) as string[]) || []
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
        form.setValue(fieldName, next)
    }

    return (
        <>
            <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                {label || `Nouveau ${typeLabels[type]}`}
            </Button>

            <TiersDraggableDialog
                isOpen={open}
                onClose={() => setOpen(false)}
                title={`Nouveau ${typeLabels[type]}`}
                width="w-[680px]"
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Tabs defaultValue="identite" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="identite">Identité</TabsTrigger>
                                <TabsTrigger value="contact">Contact</TabsTrigger>
                                <TabsTrigger value="commercial">Commercial</TabsTrigger>
                                <TabsTrigger value="documents">Documents</TabsTrigger>
                            </TabsList>

                            {/* TAB 1 – IDENTITÉ */}
                            <TabsContent value="identite" className="space-y-4 pt-4">
                                <SectionTitle>Identification</SectionTitle>
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nom / Raison Sociale <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><Input placeholder="Ex: Mon Entreprise S.A.R.L" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="shortName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nom court / Abréviation</FormLabel>
                                            <FormControl><Input placeholder="Ex: DOMINO" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="code" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Code</FormLabel>
                                            <FormControl><Input placeholder="Ex: CLI-001" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="formeJuridique" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Forme Juridique</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {['SA', 'SARL', 'SAS', 'GIE', 'Individuel', 'Autre'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="typeEntreprise" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="PARTICULIER">Particulier</SelectItem>
                                                    <SelectItem value="ENTREPRISE">Entreprise</SelectItem>
                                                    <SelectItem value="REVENDEUR">Revendeur</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="businessSector" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Secteur d'Activité</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="IT">IT / Tech</SelectItem>
                                                    <SelectItem value="FINANCE">Finance</SelectItem>
                                                    <SelectItem value="SANTE">Santé</SelectItem>
                                                    <SelectItem value="INDUSTRIE">Industrie</SelectItem>
                                                    <SelectItem value="COMMERCE">Commerce</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="companySize" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Taille Entreprise</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="MICRO">Micro (&lt;10 emp.)</SelectItem>
                                                    <SelectItem value="PME">PME (10-249 emp.)</SelectItem>
                                                    <SelectItem value="ETI">ETI (250-4999)</SelectItem>
                                                    <SelectItem value="GE">Grande Entreprise</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="dateCreation" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date de Création</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl><Textarea placeholder="Brève description..." rows={2} {...field} /></FormControl>
                                    </FormItem>
                                )} />
                            </TabsContent>

                            {/* TAB 2 – CONTACT */}
                            <TabsContent value="contact" className="space-y-4 pt-4">
                                <SectionTitle>Coordonnées</SectionTitle>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl><Input placeholder="contact@exemple.cm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Téléphone</FormLabel>
                                            <FormControl><Input placeholder="+237 6XX XXX XXX" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="fax" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fax</FormLabel>
                                            <FormControl><Input placeholder="+237 2XX XXX XXX" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="website" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Site Web</FormLabel>
                                            <FormControl><Input placeholder="https://www.exemple.cm" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <SectionTitle>Adresse</SectionTitle>
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Adresse</FormLabel>
                                        <FormControl><Input placeholder="123 Rue de la République" {...field} /></FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="complement" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Complément d'adresse</FormLabel>
                                        <FormControl><Input placeholder="Bâtiment B, Porte 4" {...field} /></FormControl>
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField control={form.control} name="city" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ville</FormLabel>
                                            <FormControl><Input placeholder="Douala" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="postalCode" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Code Postal</FormLabel>
                                            <FormControl><Input placeholder="BP 1234" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="pays" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pays</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Pays" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="CMR">Cameroun</SelectItem>
                                                    <SelectItem value="CG">Congo</SelectItem>
                                                    <SelectItem value="TC">Tchad</SelectItem>
                                                    <SelectItem value="GB">Gabon</SelectItem>
                                                    <SelectItem value="CI">Côte d'Ivoire</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="preferredChannel" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal de Communication Préféré</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="EMAIL">Email</SelectItem>
                                                <SelectItem value="PHONE">Téléphone</SelectItem>
                                                <SelectItem value="COURRIER">Courrier</SelectItem>
                                                <SelectItem value="IN_PERSON">En personne</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                            </TabsContent>

                            {/* TAB 3 – COMMERCIAL */}
                            <TabsContent value="commercial" className="space-y-4 pt-4">
                                {type === 'client' && (
                                    <>
                                        <SectionTitle>Profil Client</SectionTitle>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="segment" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Segment</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="PARTICULIER">Particulier</SelectItem>
                                                            <SelectItem value="ENTREPRISE">Entreprise</SelectItem>
                                                            <SelectItem value="REVENDEUR">Revendeur</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="familleClient" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Famille Client</FormLabel>
                                                    <FormControl><Input placeholder="Ex: Grossiste, Détaillant..." {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="creditLimit" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Plafond Crédit (XAF)</FormLabel>
                                                    <FormControl><Input type="number" placeholder="500000" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="acquisitionChannel" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Canal d'Acquisition</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="WEB">Web</SelectItem>
                                                            <SelectItem value="RESEAU">Réseau</SelectItem>
                                                            <SelectItem value="RECOMMANDATION">Recommandation</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <SectionTitle>Moyens de Règlement Autorisés</SectionTitle>
                                        <div className="grid grid-cols-2 gap-2">
                                            {MODES_PAIEMENT.map(m => (
                                                <div key={m} className="flex items-center gap-2 p-2 rounded-md border border-gray-100 bg-gray-50">
                                                    <Checkbox
                                                        id={`mp-${m}`}
                                                        checked={watchedModesCli.includes(m)}
                                                        onCheckedChange={() => toggleArray("modesPaiementClient", m)}
                                                    />
                                                    <label htmlFor={`mp-${m}`} className="text-sm text-gray-700 cursor-pointer">{LABEL_MODE_PAIEMENT[m]}</label>
                                                </div>
                                            ))}
                                        </div>
                                        <SectionTitle>Catégories de Vente</SectionTitle>
                                        <div className="grid grid-cols-2 gap-2">
                                            {CATEGORIES_TRANSACTION.map(c => (
                                                <div key={c} className="flex items-center gap-2 p-2 rounded-md border border-gray-100 bg-gray-50">
                                                    <Checkbox
                                                        id={`cv-${c}`}
                                                        checked={watchedCatVente.includes(c)}
                                                        onCheckedChange={() => toggleArray("categoriesVente", c)}
                                                    />
                                                    <label htmlFor={`cv-${c}`} className="text-sm text-gray-700 cursor-pointer">{LABEL_CATEGORIE_TRANSACTION[c]}</label>
                                                </div>
                                            ))}
                                        </div>
                                        <FormField control={form.control} name="vatSubject" render={({ field }) => (
                                            <FormItem className="flex items-center gap-3 rounded-md border p-3">
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <FormLabel className="!mt-0">Assujetti à la TVA</FormLabel>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="notes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Notes</FormLabel>
                                                <FormControl><Textarea placeholder="Notes internes..." rows={2} {...field} /></FormControl>
                                            </FormItem>
                                        )} />
                                    </>
                                )}

                                {type === 'fournisseur' && (
                                    <>
                                        <SectionTitle>Profil Fournisseur</SectionTitle>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="familleFournisseur" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Famille Fournisseur</FormLabel>
                                                    <FormControl><Input placeholder="Ex: Boissons, Alimentaire..." {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="deliveryLeadTime" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Délai de Livraison</FormLabel>
                                                    <FormControl><Input placeholder="Ex: 48h, 5 jours..." {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="conditionsPaiement" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Conditions de Paiement</FormLabel>
                                                    <FormControl><Input placeholder="Ex: 30 jours fin de mois" {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="certification" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Certification</FormLabel>
                                                    <FormControl><Input placeholder="Ex: ISO 9001" {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <SectionTitle>Moyens de Règlement</SectionTitle>
                                        <div className="grid grid-cols-2 gap-2">
                                            {MODES_PAIEMENT.map(m => (
                                                <div key={m} className="flex items-center gap-2 p-2 rounded-md border border-gray-100 bg-gray-50">
                                                    <Checkbox
                                                        id={`mf-${m}`}
                                                        checked={watchedModesFou.includes(m)}
                                                        onCheckedChange={() => toggleArray("modesPaiementFournisseur", m)}
                                                    />
                                                    <label htmlFor={`mf-${m}`} className="text-sm text-gray-700 cursor-pointer">{LABEL_MODE_PAIEMENT[m]}</label>
                                                </div>
                                            ))}
                                        </div>
                                        <SectionTitle>Catégories d'Achat</SectionTitle>
                                        <div className="grid grid-cols-2 gap-2">
                                            {CATEGORIES_TRANSACTION.map(c => (
                                                <div key={c} className="flex items-center gap-2 p-2 rounded-md border border-gray-100 bg-gray-50">
                                                    <Checkbox
                                                        id={`ca-${c}`}
                                                        checked={watchedCatAchat.includes(c)}
                                                        onCheckedChange={() => toggleArray("categoriesAchat", c)}
                                                    />
                                                    <label htmlFor={`ca-${c}`} className="text-sm text-gray-700 cursor-pointer">{LABEL_CATEGORIE_TRANSACTION[c]}</label>
                                                </div>
                                            ))}
                                        </div>
                                        <FormField control={form.control} name="notes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Notes</FormLabel>
                                                <FormControl><Textarea placeholder="Notes internes..." rows={2} {...field} /></FormControl>
                                            </FormItem>
                                        )} />
                                    </>
                                )}

                                {type === 'commercial' && (
                                    <>
                                        <SectionTitle>Profil Commercial</SectionTitle>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="agentType" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Type Commercial</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="INTERNE">Interne</SelectItem>
                                                            <SelectItem value="EXTERNE">Externe</SelectItem>
                                                            <SelectItem value="INDEPENDANT">Indépendant</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="matricule" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Matricule</FormLabel>
                                                    <FormControl><Input placeholder="M-2024-001" {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="commission" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Commission (%)</FormLabel>
                                                <FormControl><Input type="number" placeholder="5" min={0} max={100} {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                            </FormItem>
                                        )} />
                                    </>
                                )}

                                {type === 'prospect' && (
                                    <>
                                        <SectionTitle>Profil Prospect</SectionTitle>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="source" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Source</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="SITE_WEB">Site Web</SelectItem>
                                                            <SelectItem value="RESEAU_SOCIAL">Réseau Social</SelectItem>
                                                            <SelectItem value="SALON">Salon / Expo</SelectItem>
                                                            <SelectItem value="RECOMMANDATION">Recommandation</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="potential" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Potentiel</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="FAIBLE">Faible</SelectItem>
                                                            <SelectItem value="MOYEN">Moyen</SelectItem>
                                                            <SelectItem value="ELEVE">Élevé</SelectItem>
                                                            <SelectItem value="STRATEGIQUE">Stratégique</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="probability" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Probabilité de conversion (%)</FormLabel>
                                                <FormControl><Input type="number" placeholder="50" min={0} max={100} {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="notes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Notes prospect</FormLabel>
                                                <FormControl><Textarea placeholder="Notes de suivi..." rows={3} {...field} /></FormControl>
                                            </FormItem>
                                        )} />
                                    </>
                                )}
                            </TabsContent>

                            {/* TAB 4 – DOCUMENTS */}
                            <TabsContent value="documents" className="space-y-4 pt-4">
                                <SectionTitle>Identification Fiscale & Légale</SectionTitle>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="tradeRegistryNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>N° Registre de Commerce</FormLabel>
                                            <FormControl><Input placeholder="RC/DLA/2020/B/1234" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="taxNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>N° Fiscal</FormLabel>
                                            <FormControl><Input placeholder="M123456789A" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="nui" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>NUI (N° Unique d'Identification)</FormLabel>
                                            <FormControl><Input placeholder="P000000000000A" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="siret" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>SIRET (si applicable)</FormLabel>
                                            <FormControl><Input placeholder="12345678901234" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
                            <Button type="button" variant="outline" onClick={() => { form.reset(); setOpen(false); }}>Annuler</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                                Créer le {typeLabels[type]}
                            </Button>
                        </div>
                    </form>
                </Form>
            </TiersDraggableDialog>
        </>
    )
}
