"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Edit2 } from "lucide-react"
import { TiersDraggableDialog } from "@/components/tiers/ui/draggable-dialog"
import {
    Tier, TierType, ModePaiementClient, CategorieTransaction,
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

interface EditTierDialogProps {
    tier: Tier
    compact?: boolean
}

const MODES_PAIEMENT: ModePaiementClient[] = ['CHEQUE', 'PAR_COMPTE', 'CREDIT', 'ESPECES', 'VIREMENT']
const CATEGORIES_TRANSACTION: CategorieTransaction[] = ['DETAIL', 'DEMI_GROS', 'GROS', 'SUPER_GROS']

const editSchema = z.object({
    name: z.string().min(2, "Le nom est requis"),
    shortName: z.string().optional(),
    code: z.string().optional(),
    typeEntreprise: z.enum(['PARTICULIER', 'ENTREPRISE', 'REVENDEUR']).optional().or(z.literal("")),
    formeJuridique: z.string().optional(),
    businessSector: z.enum(['IT', 'FINANCE', 'SANTE', 'INDUSTRIE', 'COMMERCE']).optional().or(z.literal("")),
    companySize: z.enum(['MICRO', 'PME', 'ETI', 'GE']).optional().or(z.literal("")),
    dateCreation: z.string().optional(),
    description: z.string().optional(),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    phoneNumber: z.string().optional(),
    fax: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
    complement: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    pays: z.enum(['CMR', 'CG', 'TC', 'GB', 'CI']).optional().or(z.literal("")),
    preferredChannel: z.enum(['EMAIL', 'PHONE', 'COURRIER', 'IN_PERSON']).optional().or(z.literal("")),
    tradeRegistryNumber: z.string().optional(),
    taxNumber: z.string().optional(),
    nui: z.string().optional(),
    siret: z.string().optional(),
    // Client
    segment: z.enum(['PARTICULIER', 'ENTREPRISE', 'REVENDEUR']).optional().or(z.literal("")),
    familleClient: z.string().optional(),
    creditLimit: z.number().optional(),
    acquisitionChannel: z.enum(['WEB', 'RESEAU', 'RECOMMANDATION']).optional().or(z.literal("")),
    vatSubject: z.boolean().optional(),
    modesPaiementClient: z.array(z.string()).optional(),
    categoriesVente: z.array(z.string()).optional(),
    // Fournisseur
    familleFournisseur: z.string().optional(),
    deliveryLeadTime: z.string().optional(),
    conditionsPaiement: z.string().optional(),
    certification: z.string().optional(),
    modesPaiementFournisseur: z.array(z.string()).optional(),
    categoriesAchat: z.array(z.string()).optional(),
    // Commercial
    agentType: z.enum(['INTERNE', 'EXTERNE', 'INDEPENDANT']).optional().or(z.literal("")),
    commission: z.number().optional(),
    matricule: z.string().optional(),
    // Prospect
    source: z.enum(['SITE_WEB', 'RESEAU_SOCIAL', 'SALON', 'RECOMMANDATION']).optional().or(z.literal("")),
    potential: z.enum(['FAIBLE', 'MOYEN', 'ELEVE', 'STRATEGIQUE']).optional().or(z.literal("")),
    probability: z.number().optional(),
    notes: z.string().optional(),
})

type EditFormValues = z.infer<typeof editSchema>

const typeLabels: Record<TierType, string> = {
    client: 'Client',
    fournisseur: 'Fournisseur',
    commercial: 'Commercial',
    prospect: 'Prospect',
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{children}</h3>
}

export function EditTierDialog({ tier, compact }: EditTierDialogProps) {
    const [open, setOpen] = useState(false)
    const { updateTier } = useTiersStore()

    const clientData = tier.type === 'client' ? tier : null
    const fournisseurData = tier.type === 'fournisseur' ? tier : null
    const commercialData = tier.type === 'commercial' ? tier : null
    const prospectData = tier.type === 'prospect' ? tier : null

    const form = useForm<EditFormValues>({
        resolver: zodResolver(editSchema),
        defaultValues: {
            name: tier.name || "",
            shortName: tier.shortName || "",
            code: tier.code || "",
            formeJuridique: (tier as any).formeJuridique || "",
            description: tier.description || "",
            email: tier.email || "",
            phoneNumber: tier.phoneNumber || "",
            fax: (tier as any).fax || "",
            website: tier.website || "",
            address: tier.address || "",
            complement: tier.complement || "",
            postalCode: tier.postalCode || "",
            city: tier.city || "",
            tradeRegistryNumber: tier.tradeRegistryNumber || "",
            taxNumber: tier.taxNumber || "",
            nui: tier.nui || "",
            siret: (tier as any).siret || "",
            // Client-specific
            ...(clientData && {
                segment: clientData.segment,
                familleClient: clientData.familleClient || "",
                creditLimit: clientData.creditLimit,
                vatSubject: clientData.vatSubject || false,
                modesPaiementClient: clientData.modesPaiementClient || [],
                categoriesVente: clientData.categoriesVente || [],
                notes: clientData.notes || "",
            }),
            // Fournisseur-specific
            ...(fournisseurData && {
                familleFournisseur: fournisseurData.familleFournisseur || "",
                deliveryLeadTime: fournisseurData.deliveryLeadTime || "",
                conditionsPaiement: fournisseurData.conditionsPaiement || "",
                certification: fournisseurData.certification || "",
                modesPaiementFournisseur: fournisseurData.modesPaiementFournisseur || [],
                categoriesAchat: fournisseurData.categoriesAchat || [],
                notes: fournisseurData.notes || "",
            }),
            // Commercial-specific
            ...(commercialData && {
                matricule: commercialData.matricule || "",
                commission: commercialData.commission,
            }),
            // Prospect-specific
            ...(prospectData && {
                probability: prospectData.probability,
                notes: prospectData.notes || "",
            }),
        },
    })

    const watchedModesCli = form.watch("modesPaiementClient") || []
    const watchedCatVente = form.watch("categoriesVente") || []
    const watchedModesFou = form.watch("modesPaiementFournisseur") || []
    const watchedCatAchat = form.watch("categoriesAchat") || []

    const toggleArray = (fieldName: keyof EditFormValues, value: string) => {
        const current = (form.getValues(fieldName) as string[]) || []
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
        form.setValue(fieldName, next)
    }

    const onSubmit = async (values: EditFormValues) => {
        try {
            await updateTier(tier.id, {
                ...values,
                ...(tier.type === 'client' && {
                    modesPaiementClient: values.modesPaiementClient as ModePaiementClient[],
                    categoriesVente: values.categoriesVente as CategorieTransaction[],
                }),
                ...(tier.type === 'fournisseur' && {
                    modesPaiementFournisseur: values.modesPaiementFournisseur as ModePaiementClient[],
                    categoriesAchat: values.categoriesAchat as CategorieTransaction[],
                }),
            } as Partial<Tier>)
            setOpen(false)
        } catch (error) {
            console.error("Error updating tier", error)
        }
    }

    return (
        <>
            {compact ? (
                <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
                    <Edit2 className="h-3.5 w-3.5" />
                </Button>
            ) : (
                <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                    <Edit2 className="mr-2 h-4 w-4" /> Modifier
                </Button>
            )}

            <TiersDraggableDialog
                isOpen={open}
                onClose={() => setOpen(false)}
                title={`Modifier – ${tier.name}`}
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
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="shortName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nom court</FormLabel>
                                            <FormControl><Input placeholder="Abréviation" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="code" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Code</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="formeJuridique" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Forme Juridique</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {['SA', 'SARL', 'SAS', 'GIE', 'Individuel', 'Autre'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="companySize" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Taille Entreprise</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="MICRO">Micro</SelectItem>
                                                    <SelectItem value="PME">PME</SelectItem>
                                                    <SelectItem value="ETI">ETI</SelectItem>
                                                    <SelectItem value="GE">Grande Entreprise</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl><Textarea rows={2} {...field} /></FormControl>
                                    </FormItem>
                                )} />
                            </TabsContent>

                            {/* TAB 2 – CONTACT */}
                            <TabsContent value="contact" className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Téléphone</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="fax" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fax</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="website" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Site Web</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Adresse</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField control={form.control} name="city" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ville</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="postalCode" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Code Postal</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="pays" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pays</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
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
                            </TabsContent>

                            {/* TAB 3 – COMMERCIAL */}
                            <TabsContent value="commercial" className="space-y-4 pt-4">
                                {tier.type === 'client' && (
                                    <>
                                        <SectionTitle>Profil Client</SectionTitle>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="segment" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Segment</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
                                                    <FormControl><Input {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="creditLimit" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Plafond Crédit (XAF)</FormLabel>
                                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                            </FormItem>
                                        )} />
                                        <SectionTitle>Moyens de Règlement</SectionTitle>
                                        <div className="grid grid-cols-2 gap-2">
                                            {MODES_PAIEMENT.map(m => (
                                                <div key={m} className="flex items-center gap-2 p-2 rounded-md border border-gray-100 bg-gray-50">
                                                    <Checkbox
                                                        id={`edit-mp-${m}`}
                                                        checked={watchedModesCli.includes(m)}
                                                        onCheckedChange={() => toggleArray("modesPaiementClient", m)}
                                                    />
                                                    <label htmlFor={`edit-mp-${m}`} className="text-sm text-gray-700 cursor-pointer">{LABEL_MODE_PAIEMENT[m]}</label>
                                                </div>
                                            ))}
                                        </div>
                                        <SectionTitle>Catégories de Vente</SectionTitle>
                                        <div className="grid grid-cols-2 gap-2">
                                            {CATEGORIES_TRANSACTION.map(c => (
                                                <div key={c} className="flex items-center gap-2 p-2 rounded-md border border-gray-100 bg-gray-50">
                                                    <Checkbox
                                                        id={`edit-cv-${c}`}
                                                        checked={watchedCatVente.includes(c)}
                                                        onCheckedChange={() => toggleArray("categoriesVente", c)}
                                                    />
                                                    <label htmlFor={`edit-cv-${c}`} className="text-sm text-gray-700 cursor-pointer">{LABEL_CATEGORIE_TRANSACTION[c]}</label>
                                                </div>
                                            ))}
                                        </div>
                                        <FormField control={form.control} name="vatSubject" render={({ field }) => (
                                            <FormItem className="flex items-center gap-3 rounded-md border p-3">
                                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                <FormLabel className="!mt-0">Assujetti à la TVA</FormLabel>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="notes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Notes</FormLabel>
                                                <FormControl><Textarea rows={3} {...field} /></FormControl>
                                            </FormItem>
                                        )} />
                                    </>
                                )}

                                {tier.type === 'fournisseur' && (
                                    <>
                                        <SectionTitle>Profil Fournisseur</SectionTitle>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="familleFournisseur" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Famille Fournisseur</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="deliveryLeadTime" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Délai de Livraison</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="conditionsPaiement" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Conditions de Paiement</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="certification" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Certification</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <SectionTitle>Moyens de Règlement</SectionTitle>
                                        <div className="grid grid-cols-2 gap-2">
                                            {MODES_PAIEMENT.map(m => (
                                                <div key={m} className="flex items-center gap-2 p-2 rounded-md border border-gray-100 bg-gray-50">
                                                    <Checkbox
                                                        id={`edit-mf-${m}`}
                                                        checked={watchedModesFou.includes(m)}
                                                        onCheckedChange={() => toggleArray("modesPaiementFournisseur", m)}
                                                    />
                                                    <label htmlFor={`edit-mf-${m}`} className="text-sm text-gray-700 cursor-pointer">{LABEL_MODE_PAIEMENT[m]}</label>
                                                </div>
                                            ))}
                                        </div>
                                        <SectionTitle>Catégories d'Achat</SectionTitle>
                                        <div className="grid grid-cols-2 gap-2">
                                            {CATEGORIES_TRANSACTION.map(c => (
                                                <div key={c} className="flex items-center gap-2 p-2 rounded-md border border-gray-100 bg-gray-50">
                                                    <Checkbox
                                                        id={`edit-ca-${c}`}
                                                        checked={watchedCatAchat.includes(c)}
                                                        onCheckedChange={() => toggleArray("categoriesAchat", c)}
                                                    />
                                                    <label htmlFor={`edit-ca-${c}`} className="text-sm text-gray-700 cursor-pointer">{LABEL_CATEGORIE_TRANSACTION[c]}</label>
                                                </div>
                                            ))}
                                        </div>
                                        <FormField control={form.control} name="notes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Notes</FormLabel>
                                                <FormControl><Textarea rows={3} {...field} /></FormControl>
                                            </FormItem>
                                        )} />
                                    </>
                                )}

                                {tier.type === 'commercial' && (
                                    <>
                                        <SectionTitle>Profil Commercial</SectionTitle>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="agentType" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Type Commercial</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
                                                    <FormControl><Input {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="commission" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Commission (%)</FormLabel>
                                                <FormControl><Input type="number" min={0} max={100} {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                            </FormItem>
                                        )} />
                                    </>
                                )}

                                {tier.type === 'prospect' && (
                                    <>
                                        <SectionTitle>Profil Prospect</SectionTitle>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="source" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Source</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="SITE_WEB">Site Web</SelectItem>
                                                            <SelectItem value="RESEAU_SOCIAL">Réseau Social</SelectItem>
                                                            <SelectItem value="SALON">Salon</SelectItem>
                                                            <SelectItem value="RECOMMANDATION">Recommandation</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="potential" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Potentiel</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
                                                <FormLabel>Probabilité (%)</FormLabel>
                                                <FormControl><Input type="number" min={0} max={100} {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="notes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Notes prospect</FormLabel>
                                                <FormControl><Textarea rows={3} {...field} /></FormControl>
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
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="taxNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>N° Fiscal</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="nui" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>NUI</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="siret" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>SIRET</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                                Enregistrer les modifications
                            </Button>
                        </div>
                    </form>
                </Form>
            </TiersDraggableDialog>
        </>
    )
}
