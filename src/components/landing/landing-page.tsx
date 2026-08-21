"use client";

import { useState } from "react";
import {
    ArrowRight, ShieldCheck, Zap, BarChart3, Building2,
    Receipt, Lock, Users, RefreshCw, Clock, Check, Minus, Star,
} from "lucide-react";
import { LoginModal } from "./login-modal";

const SIGNUP_URL = process.env.NEXT_PUBLIC_YOWAUTH_URL || process.env.NEXT_PUBLIC_SIGNUP_URL || "https://yowauth.yowyob.com/login?mode=signup";

const FEATURES = [
    { icon: Receipt, title: "Encaissements unifiés", desc: "Dépôts, retraits, transferts P2P et paiements de factures depuis une seule interface, sans ressaisie." },
    { icon: RefreshCw, title: "Réconciliation automatique", desc: "Sessions de caisse, dénominations et mouvements rapprochés en temps réel — l'écart saute aux yeux." },
    { icon: Users, title: "Multi-agences & rôles", desc: "Caissiers, admins d'agence, admins d'organisation : chacun voit exactement son périmètre." },
    { icon: Lock, title: "Sécurité de niveau bancaire", desc: "Authentification déléguée au kernel, MFA, et piste d'audit sur chaque opération." },
    { icon: BarChart3, title: "Reporting en direct", desc: "Soldes, flux et performance par agence et par caissier, exportables en PDF." },
    { icon: Zap, title: "Temps réel", desc: "Chaque opération met à jour les soldes et la trésorerie instantanément." },
];

const BENCHMARK: { label: string; us: boolean | "partial"; odoo: boolean | "partial"; excel: boolean | "partial"; generic: boolean | "partial" }[] = [
    { label: "Réconciliation de caisse automatique", us: true, odoo: "partial", excel: false, generic: "partial" },
    { label: "Multi-agences natif", us: true, odoo: true, excel: false, generic: "partial" },
    { label: "Piste d'audit par opération", us: true, odoo: "partial", excel: false, generic: false },
    { label: "Conforme OHADA", us: true, odoo: "partial", excel: false, generic: false },
    { label: "Authentification centralisée + MFA", us: true, odoo: "partial", excel: false, generic: "partial" },
    { label: "Quotas & isolation multi-organisations", us: true, odoo: false, excel: false, generic: false },
    { label: "Déploiement local (souveraineté des données)", us: true, odoo: true, excel: true, generic: false },
    { label: "Mise en route < 1 jour", us: true, odoo: false, excel: true, generic: "partial" },
];

function Cell({ value }: { value: boolean | "partial" }) {
    if (value === "partial") return <Minus className="mx-auto h-5 w-5 text-amber-500" />;
    return value ? (
        <Check className="mx-auto h-5 w-5 text-emerald-600" />
    ) : (
        <Minus className="mx-auto h-5 w-5 text-muted-foreground/40" />
    );
}

export function LandingPage() {
    const [loginOpen, setLoginOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
                    <a href="#" className="flex items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/brand/logo-horizontal.png" alt="KSM Cashier" className="h-10 w-auto" />
                    </a>
                    <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
                        <a href="#features" className="transition hover:text-foreground">Fonctionnalités</a>
                        <a href="#benchmark" className="transition hover:text-foreground">Comparatif</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setLoginOpen(true)}
                            className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                            Connexion
                        </button>
                        <a
                            href={SIGNUP_URL}
                            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                        >
                            Inscription <ArrowRight className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </header>

            <section className="relative overflow-hidden">
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
                    <div className="space-y-6">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Encaisser · Gérer · Piloter
                        </span>
                        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                            Votre caisse, vos agences, votre trésorerie — <span className="text-primary">au même endroit</span>.
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Encaissez, réconciliez et pilotez chaque agence en temps réel. Une plateforme unique, sécurisée et conforme, pensée pour les entreprises africaines.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setLoginOpen(true)}
                                className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                            >
                                Accéder à ma caisse <ArrowRight className="h-4 w-4" />
                            </button>
                            <a
                                href={SIGNUP_URL}
                                className="inline-flex h-12 items-center rounded-lg border border-border px-6 text-sm font-semibold transition hover:bg-muted"
                            >
                                Créer un compte
                            </a>
                        </div>
                        <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Mise en route &lt; 1 jour</span>
                            <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-primary" /> Multi-agences</span>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm font-semibold">Session de caisse — Agence Akwa</span>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Ouverte</span>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { l: "Solde d'ouverture", v: "250 000 FCFA" },
                                    { l: "Encaissements", v: "+ 1 240 000 FCFA", c: "text-emerald-600" },
                                    { l: "Retraits", v: "− 430 000 FCFA", c: "text-destructive" },
                                ].map((r) => (
                                    <div key={r.l} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 text-sm">
                                        <span className="text-muted-foreground">{r.l}</span>
                                        <span className={`font-semibold ${r.c || ""}`}>{r.v}</span>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground">
                                    <span>Solde théorique</span>
                                    <span className="font-bold">1 060 000 FCFA</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="features" className="border-t border-border bg-muted/40">
                <div className="mx-auto max-w-6xl px-5 py-20">
                    <div className="mx-auto mb-14 max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight">Tout ce qu'une caisse devrait faire</h2>
                        <p className="mt-3 text-muted-foreground">Conçu avec les caissiers et les gérants, pas contre eux.</p>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map((f) => (
                            <div key={f.title} className="rounded-xl border border-border bg-card p-6 transition hover:shadow-lg">
                                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <f.icon className="h-5 w-5" />
                                </span>
                                <h3 className="mb-1.5 font-semibold">{f.title}</h3>
                                <p className="text-sm text-muted-foreground">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="benchmark" className="border-t border-border">
                <div className="mx-auto max-w-6xl px-5 py-20">
                    <div className="mx-auto mb-14 max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight">Comment on se compare</h2>
                        <p className="mt-3 text-muted-foreground">Face aux solutions habituelles des entreprises de la région.</p>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-border">
                        <table className="w-full min-w-[640px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/60">
                                    <th className="p-4 text-left font-semibold">Critère</th>
                                    <th className="p-4 text-center font-bold text-primary">
                                        <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-primary" /> KSM Cashier</span>
                                    </th>
                                    <th className="p-4 text-center font-semibold text-muted-foreground">Odoo POS</th>
                                    <th className="p-4 text-center font-semibold text-muted-foreground">Excel / cahier</th>
                                    <th className="p-4 text-center font-semibold text-muted-foreground">POS générique</th>
                                </tr>
                            </thead>
                            <tbody>
                                {BENCHMARK.map((row, i) => (
                                    <tr key={row.label} className={i % 2 ? "bg-muted/20" : ""}>
                                        <td className="p-4 font-medium">{row.label}</td>
                                        <td className="bg-primary/5 p-4"><Cell value={row.us} /></td>
                                        <td className="p-4"><Cell value={row.odoo} /></td>
                                        <td className="p-4"><Cell value={row.excel} /></td>
                                        <td className="p-4"><Cell value={row.generic} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Check className="h-4 w-4 text-emerald-600" /> Inclus</span>
                        <span className="flex items-center gap-1"><Minus className="h-4 w-4 text-amber-500" /> Partiel / module payant</span>
                        <span className="flex items-center gap-1"><Minus className="h-4 w-4 text-muted-foreground/40" /> Absent</span>
                    </p>
                </div>
            </section>

            <section className="border-t border-border bg-primary">
                <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-16 text-center text-primary-foreground">
                    <h2 className="max-w-2xl text-3xl font-bold tracking-tight">Prêt à reprendre le contrôle de votre caisse ?</h2>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            onClick={() => setLoginOpen(true)}
                            className="inline-flex h-12 items-center gap-2 rounded-lg bg-background px-6 text-sm font-semibold text-foreground transition hover:bg-background/90"
                        >
                            Se connecter <ArrowRight className="h-4 w-4" />
                        </button>
                        <a
                            href={SIGNUP_URL}
                            className="inline-flex h-12 items-center rounded-lg border border-primary-foreground/30 px-6 text-sm font-semibold transition hover:bg-primary-foreground/10"
                        >
                            Créer un compte
                        </a>
                    </div>
                </div>
            </section>

            <footer className="border-t border-border">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
                    <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/brand/icon.png" alt="" className="h-5 w-auto" />
                        <span className="font-semibold text-foreground">KSM Cashier</span>
                    </div>
                    <span>© {new Date().getFullYear()} Yowyob. Tous droits réservés.</span>
                </div>
            </footer>

            <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
        </div>
    );
}
