import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  Home, Package, ShoppingCart, Users, Wallet, BarChart3, Settings, Lock,
  Plus, Trash2, Pencil, Check, X, Printer, Download, Search, Menu as MenuIcon,
  AlertTriangle, GraduationCap, ClipboardList, Truck, Layers, LogOut,
} from "lucide-react";

const C = {
  ink: "#1f2937", inkDeep: "#111827", paper: "#f7f5f0", brass: "#e0720f", brassSoft: "#fce4cc",
  sage: "#4d7c5f", sageSoft: "#e2ede4", rose: "#b3452f", roseSoft: "#f6e3de", text: "#28241d",
  textSoft: "#7a7266", line: "#e6e0d4",
};

const FONTS = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
    .f-display{font-family:'Fraunces',serif} .f-body{font-family:'Public Sans',sans-serif} .f-mono{font-family:'IBM Plex Mono',monospace}
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    @media print {
      .no-print{display:none !important}
      @page{margin:0}
      body{margin:0}
      .print-area{position:absolute;top:0;left:0;width:100%;box-sizing:border-box;padding:14mm !important}
      .print-area *{box-sizing:border-box}
      .print-area table, .print-area th, .print-area td{border-collapse:collapse !important}
    }
  `}</style>
);

const uid = (p) => p + Math.random().toString(36).slice(2, 8);
const today = new Date().toISOString().slice(0, 10);
const nomMat = (s) => `${s.prenoms || s.nom} ${s.nom || ""}`.trim();

function Card({ children, style, className }) {
  return <div className={className} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, border: `1px solid ${C.line}`, ...style }}>{children}</div>;
}
function Btn({ children, onClick, kind = "primary", style, className, disabled }) {
  const styles = {
    primary: { background: C.ink, color: "#fff" },
    ghost: { background: "#fff", color: C.text, border: `1px solid ${C.line}` },
    brass: { background: C.brass, color: "#fff" },
    danger: { background: C.rose, color: "#fff" },
  };
  return (
    <button className={className} disabled={disabled} onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
      border: "none", fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, ...styles[kind], ...style,
    }}>{children}</button>
  );
}
function Input(props) { return <input {...props} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, ...props.style }} />; }
function Select(props) { return <select {...props} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, background: "#fff", ...props.style }}>{props.children}</select>; }
function Th({ children }) { return <th style={{ background: C.ink, color: "#fff", padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", border: `1px solid ${C.ink}` }}>{children}</th>; }
function Td({ children, style, colSpan }) { return <td colSpan={colSpan} style={{ padding: "8px 10px", fontSize: 12.5, color: C.text, borderBottom: `1px solid ${C.line}`, ...style }}>{children}</td>; }
function Pill_({ text, color, bg }) { return <span style={{ background: bg, color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{text}</span>; }

function fmt(n, devise) { return `${Number(n || 0).toLocaleString("fr-FR")} ${devise || ""}`.trim(); }

function exportCSV(filename, headers, rows) {
  const csv = [headers.join(";"), ...rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

const initProduits = () => ([
  { id: "pr1", nom: "Riz (sac 25kg)", categorie: "Alimentation", prixAchat: 180000, prixVente: 220000, stock: 12, seuilAlerte: 3, unite: "sac", dateAjout: today },
  { id: "pr2", nom: "Huile 1L", categorie: "Alimentation", prixAchat: 12000, prixVente: 15000, stock: 30, seuilAlerte: 8, unite: "bouteille", dateAjout: today },
  { id: "pr3", nom: "Savon Marseille", categorie: "Hygiène", prixAchat: 3000, prixVente: 4000, stock: 50, seuilAlerte: 10, unite: "pièce", dateAjout: today },
]);
const initClients = () => ([
  { id: "cl1", prenoms: "Mamadou", nom: "Diallo", sexe: "M", telephone: "622 00 00 00", quartier: "", profession: "" },
]);

export default function App() {
  const [session, setSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [email, setEmail] = useState(""); const [pwd, setPwd] = useState(""); const [pwdErr, setPwdErr] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [retrySaveTick, setRetrySaveTick] = useState(0);
  const [menu, setMenu] = useState("accueil");
  const [dashboardAuthed, setDashboardAuthed] = useState(false);
  const [dashboardPwd, setDashboardPwd] = useState(""); const [dashboardErr, setDashboardErr] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [produits, setProduits] = useState(initProduits());
  const [clients, setClients] = useState(initClients());
  const [ventes, setVentes] = useState([]);
  const [paiementsCredit, setPaiementsCredit] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [arrivages, setArrivages] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [config, setConfig] = useState({ devise: "GNF", nomBoutique: "MA BOUTIQUE", adresse: "", tels: "", logo: null, comptaPassword: "boutique2026" });

  /* ---- Connexion Supabase : session + chargement/sauvegarde protégés ---- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthChecking(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoadError(null);
    (async () => {
      const { data, error } = await supabase.from("app_state").select("data").eq("id", "main").maybeSingle();
      if (error) { setLoadError(error.message || "Erreur de connexion à la base de données."); return; }
      if (data && data.data) {
        const d = data.data;
        setProduits(d.produits || initProduits());
        setClients(d.clients || initClients());
        setVentes(d.ventes || []);
        setPaiementsCredit(d.paiementsCredit || []);
        setDepenses(d.depenses || []);
        setArrivages(d.arrivages || []);
        setCommandes(d.commandes || []);
        setConfig(d.config || { devise: "GNF", nomBoutique: "MA BOUTIQUE", adresse: "", tels: "", logo: null, comptaPassword: "boutique2026" });
      } else {
        await supabase.from("app_state").insert({
          id: "main",
          data: { produits: initProduits(), clients: initClients(), ventes: [], paiementsCredit: [], depenses: [], arrivages: [], commandes: [], config: { devise: "GNF", nomBoutique: "MA BOUTIQUE", adresse: "", tels: "", logo: null, comptaPassword: "boutique2026" } },
        });
      }
      setDataLoaded(true);
    })();
  }, [session, retryCount]);

  useEffect(() => {
    if (!session || !dataLoaded) return;
    const t = setTimeout(() => {
      setSaveStatus("saving");
      supabase.from("app_state").upsert({
        id: "main",
        data: { produits, clients, ventes, paiementsCredit, depenses, arrivages, commandes, config },
        updated_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) { setSaveStatus("error"); setTimeout(() => setRetrySaveTick(x => x + 1), 5000); }
        else setSaveStatus("saved");
      });
    }, 800);
    return () => clearTimeout(t);
  }, [produits, clients, ventes, paiementsCredit, depenses, arrivages, commandes, config, session, dataLoaded, retrySaveTick]);

  /* ---------- Fonctions financières clients ---------- */
  const clientTotalAchats = (id) => ventes.filter(v => v.clientId === id).reduce((s, v) => s + v.total, 0);
  const clientTotalPaye = (id) => ventes.filter(v => v.clientId === id).reduce((s, v) => s + Number(v.montantPaye || 0), 0) + paiementsCredit.filter(p => p.clientId === id).reduce((s, p) => s + Number(p.montant), 0);
  const clientSolde = (id) => clientTotalAchats(id) - clientTotalPaye(id);
  const clientEnRetard = (id) => clientSolde(id) > 0 && ventes.some(v => v.clientId === id && v.dateEcheance && v.dateEcheance < today && (v.total - v.montantPaye) > 0);

  /* ---------- Comptabilité générale ---------- */
  const totalVentes = ventes.reduce((s, v) => s + v.total, 0);
  const totalEncaisse = ventes.reduce((s, v) => s + Number(v.montantPaye || 0), 0) + paiementsCredit.reduce((s, p) => s + Number(p.montant), 0);
  const totalDepenses = depenses.reduce((s, d) => s + Number(d.montant), 0);
  const coutMarchandisesVendues = ventes.reduce((s, v) => s + v.items.reduce((s2, it) => { const p = produits.find(x => x.id === it.produitId); return s2 + (p ? p.prixAchat * it.quantite : 0); }, 0), 0);
  const beneficeBrut = totalVentes - coutMarchandisesVendues;

  /* ---------- Produits ---------- */
  const [produitForm, setProduitForm] = useState(null);
  const saveProduit = () => {
    if (!produitForm.nom || !produitForm.prixVente) return;
    if (produitForm.id) setProduits(prev => prev.map(p => p.id === produitForm.id ? produitForm : p));
    else setProduits(prev => [...prev, { ...produitForm, id: uid("pr"), stock: Number(produitForm.stock) || 0 }]);
    setProduitForm(null);
  };
  const deleteProduit = (id) => {
    if (ventes.some(v => v.items.some(it => it.produitId === id))) { window.alert("Impossible de supprimer : ce produit a déjà été vendu au moins une fois. Ses ventes passées doivent rester lisibles."); return; }
    if (arrivages.some(a => a.produitId === id)) { window.alert("Impossible de supprimer : ce produit a déjà des arrivages enregistrés. Son historique doit rester lisible."); return; }
    if (commandes.some(c => c.items.some(it => it.produitId === id))) { window.alert("Impossible de supprimer : ce produit a déjà des commandes fournisseurs liées."); return; }
    if (window.confirm("Supprimer ce produit ?")) setProduits(prev => prev.filter(p => p.id !== id));
  };
  const enregistrerArrivage = (produitId, quantite, date, fournisseur) => {
    const q = Number(quantite);
    if (!q) return;
    setProduits(prev => prev.map(p => p.id === produitId ? { ...p, stock: p.stock + q } : p));
    setArrivages(prev => [...prev, { id: uid("ar"), produitId, quantite: q, date: date || today, fournisseur: fournisseur || "" }]);
  };
  const [arrivageForm, setArrivageForm] = useState(null);

  const [panierCommande, setPanierCommande] = useState([]);
  const [commandeFournisseur, setCommandeFournisseur] = useState("");
  const [derniereCommandeId, setDerniereCommandeId] = useState(null);
  const ajouterAuPanierCommande = (produitId) => {
    setPanierCommande(prev => {
      const existe = prev.find(x => x.produitId === produitId);
      if (existe) return prev.map(x => x.produitId === produitId ? { ...x, quantite: x.quantite + 1 } : x);
      return [...prev, { produitId, quantite: 1 }];
    });
  };
  const changerQuantitePanierCommande = (produitId, quantite) => {
    const q = Number(quantite);
    setPanierCommande(prev => q <= 0 ? prev.filter(x => x.produitId !== produitId) : prev.map(x => x.produitId === produitId ? { ...x, quantite: q } : x));
  };
  const retirerDuPanierCommande = (produitId) => setPanierCommande(prev => prev.filter(x => x.produitId !== produitId));
  const totalPanierCommande = panierCommande.reduce((s, x) => { const p = produits.find(pr => pr.id === x.produitId); return s + (p ? p.prixAchat * x.quantite : 0); }, 0);

  const validerCommande = () => {
    if (!panierCommande.length) return;
    const id = uid("co");
    setCommandes(prev => [...prev, {
      id, dateCommande: today, fournisseur: commandeFournisseur,
      items: panierCommande.map(x => { const p = produits.find(pr => pr.id === x.produitId); return { produitId: x.produitId, nom: p.nom, prixAchat: p.prixAchat, quantite: x.quantite }; }),
      total: totalPanierCommande, statut: "En attente",
    }]);
    setPanierCommande([]); setCommandeFournisseur(""); setDerniereCommandeId(id);
  };
  const receptionnerCommande = (id) => {
    const c = commandes.find(x => x.id === id);
    if (!c) return;
    c.items.forEach(it => enregistrerArrivage(it.produitId, it.quantite, today, c.fournisseur));
    setCommandes(prev => prev.map(x => x.id === id ? { ...x, statut: "Reçue", dateReception: today } : x));
  };
  const supprimerCommande = (id) => { if (window.confirm("Annuler cette commande ?")) setCommandes(prev => prev.filter(c => c.id !== id)); };

  /* ---------- Clients ---------- */
  const [clientForm, setClientForm] = useState(null);
  const saveClient = () => {
    if (!clientForm.prenoms || !clientForm.nom) return;
    if (clientForm.id) setClients(prev => prev.map(c => c.id === clientForm.id ? clientForm : c));
    else setClients(prev => [...prev, { ...clientForm, id: uid("cl") }]);
    setClientForm(null);
  };
  const deleteClient = (id) => {
    if (clientSolde(id) > 0) { window.alert("Impossible de supprimer : ce client a encore un solde dû."); return; }
    if (ventes.some(v => v.clientId === id)) { window.alert("Impossible de supprimer : ce client a déjà un historique d'achats. Ses ventes passées doivent rester lisibles."); return; }
    if (window.confirm("Supprimer ce client ?")) setClients(prev => prev.filter(c => c.id !== id));
  };

  /* ---------- Dépenses ---------- */
  const [depForm, setDepForm] = useState({ categorie: "", montant: "", description: "" });
  const saveDepense = () => {
    if (!depForm.categorie || !depForm.montant) return;
    if (depForm.id) setDepenses(prev => prev.map(d => d.id === depForm.id ? { ...d, categorie: depForm.categorie, montant: Number(depForm.montant), description: depForm.description } : d));
    else setDepenses(prev => [...prev, { id: uid("d"), ...depForm, montant: Number(depForm.montant), date: today }]);
    setDepForm({ categorie: "", montant: "", description: "" });
  };
  const deleteDepense = (id) => setDepenses(prev => prev.filter(d => d.id !== id));

  /* ---------- Vente / Caisse ---------- */
  const [panier, setPanier] = useState([]); // [{produitId, quantite}]
  const [venteClientId, setVenteClientId] = useState("");
  const [venteMontantPaye, setVenteMontantPaye] = useState("");
  const [venteMode, setVenteMode] = useState("Espèces");
  const [venteEcheance, setVenteEcheance] = useState("");
  const [rechercheProduit, setRechercheProduit] = useState("");
  const [derniereVenteId, setDerniereVenteId] = useState(null);

  const ajouterAuPanier = (produitId) => {
    setPanier(prev => {
      const existe = prev.find(x => x.produitId === produitId);
      if (existe) return prev.map(x => x.produitId === produitId ? { ...x, quantite: x.quantite + 1 } : x);
      return [...prev, { produitId, quantite: 1 }];
    });
  };
  const changerQuantitePanier = (produitId, quantite) => {
    const q = Number(quantite);
    const produit = produits.find(p => p.id === produitId);
    if (produit && q > produit.stock) { window.alert(`Stock insuffisant : il ne reste que ${produit.stock} ${produit.unite}(s) de "${produit.nom}".`); return; }
    setPanier(prev => q <= 0 ? prev.filter(x => x.produitId !== produitId) : prev.map(x => x.produitId === produitId ? { ...x, quantite: q } : x));
  };
  const retirerDuPanier = (produitId) => setPanier(prev => prev.filter(x => x.produitId !== produitId));
  const totalPanier = panier.reduce((s, x) => { const p = produits.find(pr => pr.id === x.produitId); return s + (p ? p.prixVente * x.quantite : 0); }, 0);

  const validerVente = () => {
    if (!panier.length) return;
    const montantPaye = venteMontantPaye === "" ? totalPanier : Number(venteMontantPaye);
    if (montantPaye < totalPanier && !venteClientId) { window.alert("Pour une vente à crédit (montant payé inférieur au total), vous devez sélectionner un client — pour pouvoir suivre ce qui reste dû."); return; }
    if (montantPaye < totalPanier && !venteEcheance) { window.alert("Pour une vente à crédit, indiquez la date de paiement prévue."); return; }
    if (montantPaye > totalPanier) { window.alert("Le montant payé ne peut pas dépasser le total de la vente."); return; }
    const id = uid("v");
    setVentes(prev => [...prev, {
      id, date: today, clientId: venteClientId || null,
      items: panier.map(x => { const p = produits.find(pr => pr.id === x.produitId); return { produitId: x.produitId, nom: p.nom, prixUnitaire: p.prixVente, quantite: x.quantite }; }),
      total: totalPanier, montantPaye, mode: venteMode, dateEcheance: montantPaye < totalPanier ? venteEcheance : null,
    }]);
    setProduits(prev => prev.map(p => { const item = panier.find(x => x.produitId === p.id); return item ? { ...p, stock: p.stock - item.quantite } : p; }));
    setPanier([]); setVenteMontantPaye(""); setVenteClientId(""); setVenteEcheance(""); setDerniereVenteId(id);
  };

  /* ---------- Paiement de crédit (remboursement client) ---------- */
  const [remboursementForm, setRemboursementForm] = useState({ clientId: "", montant: "", mode: "Espèces" });
  const enregistrerRemboursement = () => {
    if (!remboursementForm.clientId || !remboursementForm.montant) return;
    const solde = clientSolde(remboursementForm.clientId);
    if (Number(remboursementForm.montant) > solde) { window.alert(`Ce montant dépasse ce que le client doit encore (${fmt(solde, config.devise)}).`); return; }
    setPaiementsCredit(prev => [...prev, { id: uid("pc"), ...remboursementForm, montant: Number(remboursementForm.montant), date: today }]);
    setRemboursementForm({ clientId: "", montant: "", mode: "Espèces" });
  };

  const [venteEnEdition, setVenteEnEdition] = useState(null);
  const [comptaTab, setComptaTab] = useState("historique");
  const [rapportPeriode, setRapportPeriode] = useState("jour");
  const [rapportDate, setRapportDate] = useState(today);
  const modifierVente = (id, nouveauMontantPaye, nouveauMode) => {
    const v = ventes.find(x => x.id === id);
    if (!v) return;
    const montant = Number(nouveauMontantPaye);
    if (montant > v.total) { window.alert("Le montant payé ne peut pas dépasser le total de la vente."); return; }
    setVentes(prev => prev.map(x => x.id === id ? { ...x, montantPaye: montant, mode: nouveauMode } : x));
    setVenteEnEdition(null);
  };
  const supprimerVente = (id) => {
    const v = ventes.find(x => x.id === id);
    if (!v) return;
    if (!window.confirm("Supprimer définitivement cette vente ? Le stock des produits concernés sera restitué.")) return;
    setProduits(prev => prev.map(p => { const item = v.items.find(it => it.produitId === p.id); return item ? { ...p, stock: p.stock + item.quantite } : p; }));
    setVentes(prev => prev.filter(x => x.id !== id));
    if (derniereVenteId === id) setDerniereVenteId(null);
  };

  /* ================= LOGIN ================= */
  const handleLogin = async () => {
    setPwdErr(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (error) setPwdErr(true);
  };

  if (authChecking) return <div className="f-body" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>{FONTS}Chargement…</div>;

  if (!session) {
    return (
      <div className="f-body" style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {FONTS}
        <Card style={{ width: 320 }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <ShoppingCart size={28} color={C.brass} />
            <div className="f-display" style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>Ma Boutique — Gestion</div>
          </div>
          <Input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", marginBottom: 8, boxSizing: "border-box" }} />
          <Input type="password" placeholder="Mot de passe" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} style={{ width: "100%", marginBottom: 8, boxSizing: "border-box" }} />
          {pwdErr && <div style={{ color: C.rose, fontSize: 12, marginBottom: 8 }}>Identifiants incorrects.</div>}
          <Btn onClick={handleLogin} style={{ width: "100%", justifyContent: "center" }}>Se connecter</Btn>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="f-body" style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        {FONTS}
        <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", borderRadius: 14, padding: 30, border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Impossible de charger vos données</div>
          <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 18 }}>Rien n'a été modifié ni effacé — l'application a volontairement bloqué l'accès plutôt que de risquer d'écraser vos vraies données. Vérifiez votre connexion, puis réessayez.</div>
          <button onClick={() => setRetryCount(c => c + 1)} style={{ background: C.ink, color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Réessayer</button>
          <div style={{ fontSize: 10.5, color: C.textSoft, marginTop: 14 }}>Détail : {loadError}</div>
        </div>
      </div>
    );
  }

  if (!dataLoaded) return <div className="f-body" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>{FONTS}Chargement des données…</div>;

  /* ================= MENUS ================= */
  const renderAccueil = () => (
    <div>
      <div className="f-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Tableau de bord</div>
      <div style={{ color: C.textSoft, fontSize: 13 }}>{config.nomBoutique}</div>
    </div>
  );

  const renderCommandes = () => {
    const commandeRecu = derniereCommandeId ? commandes.find(c => c.id === derniereCommandeId) : null;
    return (
    <div>
      <div className="f-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Commandes fournisseurs</div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        <Card className="no-print">
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Choisir les produits à commander</div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {produits.map(p => (
              <div key={p.id} onClick={() => ajouterAuPanierCommande(p.id)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 6px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{p.nom}</div><div style={{ fontSize: 10.5, color: C.textSoft }}>Stock actuel : {p.stock} {p.unite}(s)</div></div>
                <div className="f-mono" style={{ fontWeight: 700 }}>{fmt(p.prixAchat, config.devise)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="no-print">
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Panier de commande</div>
          {panierCommande.map(x => {
            const p = produits.find(pr => pr.id === x.produitId);
            if (!p) return null;
            return (
              <div key={x.produitId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 12.5 }}>
                <div style={{ flex: 1 }}>{p.nom}</div>
                <Input type="number" min="1" value={x.quantite} onChange={e => changerQuantitePanierCommande(x.produitId, e.target.value)} style={{ width: 55 }} />
                <div className="f-mono" style={{ width: 90, textAlign: "right" }}>{fmt(p.prixAchat * x.quantite, config.devise)}</div>
                <button onClick={() => retirerDuPanierCommande(x.produitId)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={13} color={C.rose} /></button>
              </div>
            );
          })}
          {!panierCommande.length && <div style={{ fontSize: 12, color: C.textSoft }}>Panier vide — cliquez sur un produit à gauche.</div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, margin: "10px 0", paddingTop: 8, borderTop: `2px solid ${C.ink}` }}>
            <span>Total</span><span className="f-mono">{fmt(totalPanierCommande, config.devise)}</span>
          </div>
          <Input placeholder="Fournisseur" value={commandeFournisseur} onChange={e => setCommandeFournisseur(e.target.value)} style={{ width: "100%", marginBottom: 10, boxSizing: "border-box" }} />
          <Btn onClick={validerCommande} disabled={!panierCommande.length} style={{ width: "100%", justifyContent: "center" }}>Valider la commande</Btn>
        </Card>
      </div>

      {commandeRecu && (
        <Card className="print-area" style={{ marginTop: 16, border: `2px solid ${C.ink}`, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ width: 46, height: 46, borderRadius: "50%", border: `2px solid ${C.brass}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {config.logo ? <img src={config.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ClipboardList size={20} color={C.brass} />}
              </div>
              <div style={{ fontWeight: 700, marginTop: 6 }}>{config.nomBoutique}</div>
              {config.adresse && <div style={{ fontSize: 10.5, color: C.textSoft }}>{config.adresse}</div>}
              {config.tels && <div style={{ fontSize: 10.5, color: C.textSoft }}>Tél : {config.tels}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="f-display" style={{ fontSize: 18, fontWeight: 700 }}>BON DE COMMANDE</div>
              <div style={{ fontSize: 11, color: C.textSoft }}>{commandeRecu.dateCommande}</div>
              {commandeRecu.fournisseur && <div style={{ fontSize: 11, color: C.textSoft }}>Fournisseur : {commandeRecu.fournisseur}</div>}
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14, fontSize: 12.5, border: `1px solid ${C.text}` }}>
            <thead><tr>
              <th style={{ background: C.ink, color: "#fff", padding: "6px 8px", textAlign: "left", border: `1px solid ${C.ink}` }}>Produit</th>
              <th style={{ background: C.ink, color: "#fff", padding: "6px 8px", border: `1px solid ${C.ink}` }}>Quantité</th>
              <th style={{ background: C.ink, color: "#fff", padding: "6px 8px", border: `1px solid ${C.ink}` }}>Prix d'achat</th>
              <th style={{ background: C.ink, color: "#fff", padding: "6px 8px", border: `1px solid ${C.ink}` }}>Total</th>
            </tr></thead>
            <tbody>
              {commandeRecu.items.map((it, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 8px", border: `1px solid ${C.line}` }}>{it.nom}</td>
                  <td className="f-mono" style={{ padding: "6px 8px", textAlign: "center", border: `1px solid ${C.line}` }}>{it.quantite}</td>
                  <td className="f-mono" style={{ padding: "6px 8px", textAlign: "right", border: `1px solid ${C.line}` }}>{fmt(it.prixAchat, config.devise)}</td>
                  <td className="f-mono" style={{ padding: "6px 8px", textAlign: "right", border: `1px solid ${C.line}` }}>{fmt(it.prixAchat * it.quantite, config.devise)}</td>
                </tr>
              ))}
              <tr style={{ background: C.paper, fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: "8px", textAlign: "right", border: `1px solid ${C.line}` }}>Total général</td>
                <td className="f-mono" style={{ padding: "8px", textAlign: "right", border: `1px solid ${C.line}` }}>{fmt(commandeRecu.total, config.devise)}</td>
              </tr>
            </tbody>
          </table>
          <Btn kind="ghost" className="no-print" onClick={() => window.print()} style={{ marginTop: 14 }}><Printer size={13} /> Imprimer le bon de commande</Btn>
        </Card>
      )}

      <Card className="no-print">
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Historique des commandes (vérifiable à tout moment)</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Date</Th><Th>Produits</Th><Th>Total</Th><Th>Fournisseur</Th><Th>Statut</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {[...commandes].reverse().map(c => (
              <tr key={c.id}>
                <Td>{c.dateCommande}</Td>
                <Td style={{ fontSize: 11.5 }}>{c.items.map(it => `${it.nom} (${it.quantite})`).join(", ")}</Td>
                <Td className="f-mono">{fmt(c.total, config.devise)}</Td>
                <Td>{c.fournisseur || "—"}</Td>
                <Td><Pill_ text={c.statut} color={c.statut === "Reçue" ? C.sage : C.brass} bg={c.statut === "Reçue" ? C.sageSoft : C.brassSoft} /></Td>
                <Td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn kind="ghost" onClick={() => setDerniereCommandeId(c.id)}><Printer size={12} /></Btn>
                    {c.statut === "En attente" && (
                      <>
                        <Btn kind="ghost" onClick={() => receptionnerCommande(c.id)}><Check size={12} /> Reçue</Btn>
                        <button onClick={() => supprimerCommande(c.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rose} /></button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
            {!commandes.length && <tr><Td colSpan={6} style={{ textAlign: "center", color: C.textSoft }}>Aucune commande.</Td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
    );
  };

  const renderStock = () => {
    const mouvementsCombines = [
      ...arrivages.map(a => ({ date: a.date, produitId: a.produitId, type: "Entrée", quantite: a.quantite, detail: a.fournisseur || "Arrivage" })),
      ...ventes.flatMap(v => v.items.map(it => ({ date: v.date, produitId: it.produitId, type: "Sortie", quantite: it.quantite, detail: "Vente" }))),
    ].sort((a, b) => b.date.localeCompare(a.date));

    const quantiteVendue = (produitId) => ventes.reduce((s, v) => s + v.items.filter(it => it.produitId === produitId).reduce((s2, it) => s2 + it.quantite, 0), 0);

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="f-display" style={{ fontSize: 22, fontWeight: 600 }}>Stock</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" onClick={() => exportCSV(
              "stock.csv",
              ["Date", "Nom du produit", "Quantité", "Prix achat unitaire", "Prix vente unitaire", "Montant total achat", "Montant total ventes", "Bénéfices", "Seuil alerte"],
              produits.map(p => { const qv = quantiteVendue(p.id); const mAchat = qv * p.prixAchat; const mVente = qv * p.prixVente; return [p.dateAjout || "", p.nom, p.stock, p.prixAchat, p.prixVente, mAchat, mVente, mVente - mAchat, p.seuilAlerte]; })
            )}><Download size={13} /> Exporter</Btn>
            <Btn onClick={() => setProduitForm({ nom: "", categorie: "", prixAchat: "", prixVente: "", stock: 0, seuilAlerte: 5, unite: "pièce", dateAjout: today })}><Plus size={13} /> Ajouter un produit</Btn>
          </div>
        </div>

        {produitForm && (
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Input placeholder="Nom du produit" value={produitForm.nom} onChange={e => setProduitForm({ ...produitForm, nom: e.target.value })} />
              <Input placeholder="Catégorie" value={produitForm.categorie} onChange={e => setProduitForm({ ...produitForm, categorie: e.target.value })} />
              <Input type="number" placeholder="Prix d'achat unitaire" value={produitForm.prixAchat} onChange={e => setProduitForm({ ...produitForm, prixAchat: e.target.value })} />
              <Input type="number" placeholder="Prix de vente unitaire" value={produitForm.prixVente} onChange={e => setProduitForm({ ...produitForm, prixVente: e.target.value })} />
              <Input type="number" placeholder="Quantité en stock" value={produitForm.stock} onChange={e => setProduitForm({ ...produitForm, stock: e.target.value })} disabled={!!produitForm.id} />
              <Input type="number" placeholder="Quantité pour l'alerte" value={produitForm.seuilAlerte} onChange={e => setProduitForm({ ...produitForm, seuilAlerte: e.target.value })} />
              <Input placeholder="Unité (pièce, sac, litre...)" value={produitForm.unite} onChange={e => setProduitForm({ ...produitForm, unite: e.target.value })} />
              <Input type="date" value={produitForm.dateAjout || today} onChange={e => setProduitForm({ ...produitForm, dateAjout: e.target.value })} />
            </div>
            {produitForm.id && <div style={{ fontSize: 10.5, color: C.textSoft, marginTop: 4 }}>La quantité en stock ne se modifie pas ici — utilisez le bouton 🚚 "Arrivage" dans la liste.</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Btn onClick={saveProduit}><Check size={13} /> Enregistrer</Btn>
              <Btn kind="ghost" onClick={() => setProduitForm(null)}><X size={13} /> Annuler</Btn>
            </div>
          </Card>
        )}

        <Card style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <Th>Date</Th><Th>Nom du produit</Th><Th>Quantité</Th><Th>Prix achat unit.</Th><Th>Prix vente unit.</Th>
              <Th>Montant total achat</Th><Th>Montant total ventes</Th><Th>Bénéfices</Th><Th>Seuil alerte</Th><Th>Actions</Th>
            </tr></thead>
            <tbody>
              {produits.map(p => {
                const enAlerte = p.stock <= p.seuilAlerte;
                const qv = quantiteVendue(p.id);
                const mAchat = qv * p.prixAchat;
                const mVente = qv * p.prixVente;
                const benefice = mVente - mAchat;
                return (
                  <tr key={p.id}>
                    <Td>{p.dateAjout || "—"}</Td>
                    <Td style={{ fontWeight: 600 }}>{p.nom}</Td>
                    <Td><Pill_ text={`${p.stock} ${p.unite}(s)`} color={enAlerte ? C.rose : C.sage} bg={enAlerte ? C.roseSoft : C.sageSoft} /></Td>
                    <Td className="f-mono">{fmt(p.prixAchat, config.devise)}</Td>
                    <Td className="f-mono">{fmt(p.prixVente, config.devise)}</Td>
                    <Td className="f-mono">{fmt(mAchat, config.devise)}</Td>
                    <Td className="f-mono">{fmt(mVente, config.devise)}</Td>
                    <Td className="f-mono" style={{ color: C.brass, fontWeight: 700 }}>{fmt(benefice, config.devise)}</Td>
                    <Td className="f-mono">{p.seuilAlerte}</Td>
                    <Td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setArrivageForm({ produitId: p.id, quantite: "", date: today, fournisseur: "" })} style={{ background: "none", border: "none", cursor: "pointer" }} title="Enregistrer un arrivage"><Truck size={14} color={C.brass} /></button>
                        <button onClick={() => setProduitForm(p)} style={{ background: "none", border: "none", cursor: "pointer" }}><Pencil size={14} color={C.textSoft} /></button>
                        <button onClick={() => deleteProduit(p.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rose} /></button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {!produits.length && <tr><Td colSpan={10} style={{ textAlign: "center", color: C.textSoft }}>Aucun produit.</Td></tr>}
            </tbody>
          </table>
        </Card>

        {arrivageForm && (
          <Card>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Enregistrer un arrivage — {produits.find(p => p.id === arrivageForm.produitId)?.nom}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Input type="number" placeholder="Quantité reçue" value={arrivageForm.quantite} onChange={e => setArrivageForm({ ...arrivageForm, quantite: e.target.value })} />
              <Input type="date" value={arrivageForm.date} onChange={e => setArrivageForm({ ...arrivageForm, date: e.target.value })} />
              <Input placeholder="Fournisseur (optionnel)" value={arrivageForm.fournisseur} onChange={e => setArrivageForm({ ...arrivageForm, fournisseur: e.target.value })} />
              <Btn onClick={() => { enregistrerArrivage(arrivageForm.produitId, arrivageForm.quantite, arrivageForm.date, arrivageForm.fournisseur); setArrivageForm(null); }}><Check size={13} /> Valider</Btn>
              <Btn kind="ghost" onClick={() => setArrivageForm(null)}><X size={13} /></Btn>
            </div>
          </Card>
        )}

        <Card>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Mouvements (entrées et sorties, en temps réel)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Date</Th><Th>Produit</Th><Th>Type</Th><Th>Quantité</Th><Th>Détail</Th></tr></thead>
            <tbody>
              {mouvementsCombines.slice(0, 60).map((m, i) => (
                <tr key={i}>
                  <Td>{m.date}</Td>
                  <Td style={{ fontWeight: 600 }}>{produits.find(p => p.id === m.produitId)?.nom || "—"}</Td>
                  <Td><Pill_ text={m.type} color={m.type === "Entrée" ? C.sage : C.rose} bg={m.type === "Entrée" ? C.sageSoft : C.roseSoft} /></Td>
                  <Td className="f-mono">{m.type === "Entrée" ? "+" : "−"}{m.quantite}</Td>
                  <Td style={{ fontSize: 11.5, color: C.textSoft }}>{m.detail}</Td>
                </tr>
              ))}
              {!mouvementsCombines.length && <tr><Td colSpan={5} style={{ textAlign: "center", color: C.textSoft }}>Aucun mouvement encore.</Td></tr>}
            </tbody>
          </table>
          {mouvementsCombines.length > 60 && <div style={{ fontSize: 11, color: C.textSoft, marginTop: 6 }}>Affichage des 60 mouvements les plus récents.</div>}
        </Card>
      </div>
    );
  };

  const renderVente = () => {
    const recu = derniereVenteId ? ventes.find(v => v.id === derniereVenteId) : null;
    const produitsFiltres = produits.filter(p => !rechercheProduit || p.nom.toLowerCase().includes(rechercheProduit.toLowerCase())).filter(p => p.stock > 0);
    return (
      <div>
        <div className="f-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Vente / Caisse</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
          <Card className="no-print">
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <Search size={16} color={C.textSoft} style={{ marginTop: 8 }} />
              <Input placeholder="Rechercher un produit…" value={rechercheProduit} onChange={e => setRechercheProduit(e.target.value)} style={{ flex: 1 }} />
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {produitsFiltres.map(p => (
                <div key={p.id} onClick={() => ajouterAuPanier(p.id)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 6px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{p.nom}</div><div style={{ fontSize: 10.5, color: C.textSoft }}>{p.stock} {p.unite}(s) en stock</div></div>
                  <div className="f-mono" style={{ fontWeight: 700 }}>{fmt(p.prixVente, config.devise)}</div>
                </div>
              ))}
              {!produitsFiltres.length && <div style={{ fontSize: 12, color: C.textSoft, padding: 8 }}>Aucun produit trouvé.</div>}
            </div>
          </Card>

          <Card className="no-print">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Panier</div>
            {panier.map(x => {
              const p = produits.find(pr => pr.id === x.produitId);
              if (!p) return null;
              return (
                <div key={x.produitId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 12.5 }}>
                  <div style={{ flex: 1 }}>{p.nom}</div>
                  <Input type="number" min="1" max={p.stock} value={x.quantite} onChange={e => changerQuantitePanier(x.produitId, e.target.value)} style={{ width: 55 }} />
                  <div className="f-mono" style={{ width: 90, textAlign: "right" }}>{fmt(p.prixVente * x.quantite, config.devise)}</div>
                  <button onClick={() => retirerDuPanier(x.produitId)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={13} color={C.rose} /></button>
                </div>
              );
            })}
            {!panier.length && <div style={{ fontSize: 12, color: C.textSoft }}>Panier vide — cliquez sur un produit à gauche.</div>}

            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, margin: "10px 0", paddingTop: 8, borderTop: `2px solid ${C.ink}` }}>
              <span>Total</span><span className="f-mono">{fmt(totalPanier, config.devise)}</span>
            </div>

            <Select value={venteClientId} onChange={e => setVenteClientId(e.target.value)} style={{ width: "100%", marginBottom: 6, boxSizing: "border-box" }}>
              <option value="">Client anonyme (vente au comptant)</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.prenoms} {c.nom}</option>)}
            </Select>
            {venteClientId && (() => {
              const cl = clients.find(c => c.id === venteClientId);
              if (!cl) return null;
              return (
                <div style={{ background: C.paper, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: C.textSoft, marginBottom: 6 }}>
                  {cl.sexe} · {cl.telephone || "sans numéro"} · {[cl.quartier, cl.profession].filter(Boolean).join(" — ") || "aucune autre info"}
                  {clientSolde(cl.id) > 0 && <div style={{ color: C.rose, fontWeight: 700, marginTop: 2 }}>Doit déjà {fmt(clientSolde(cl.id), config.devise)}</div>}
                </div>
              );
            })()}
            <Input type="number" placeholder={`Montant payé (par défaut : ${fmt(totalPanier, config.devise)})`} value={venteMontantPaye} onChange={e => setVenteMontantPaye(e.target.value)} style={{ width: "100%", marginBottom: 6, boxSizing: "border-box" }} />
            {venteMontantPaye !== "" && Number(venteMontantPaye) < totalPanier && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10.5, color: C.textSoft, marginBottom: 2 }}>Date de paiement prévue (vente à crédit)</div>
                <Input type="date" value={venteEcheance} onChange={e => setVenteEcheance(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
            )}
            <Select value={venteMode} onChange={e => setVenteMode(e.target.value)} style={{ width: "100%", marginBottom: 10, boxSizing: "border-box" }}>
              <option>Espèces</option><option>Orange Money</option><option>Mobile Money (autre)</option><option>Virement</option>
            </Select>
            <Btn onClick={validerVente} disabled={!panier.length} style={{ width: "100%", justifyContent: "center" }}>Valider la vente</Btn>
          </Card>
        </div>

        {recu && (() => {
          const client = clients.find(c => c.id === recu.clientId);
          const numero = ventes.findIndex(v => v.id === recu.id) + 1;
          return (
            <Card className="print-area" style={{ marginTop: 16, border: `2px solid ${C.ink}`, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ width: 50, height: 50, borderRadius: "50%", border: `2px solid ${C.brass}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 6 }}>
                    {config.logo ? <img src={config.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ShoppingCart size={20} color={C.brass} />}
                  </div>
                  <div style={{ fontWeight: 700 }}>{config.nomBoutique}</div>
                  {config.adresse && <div style={{ fontSize: 11, color: C.textSoft }}>{config.adresse}</div>}
                  {config.tels && <div style={{ fontSize: 11, color: C.textSoft }}>Tél : {config.tels}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="f-display" style={{ fontSize: 18, fontWeight: 700 }}>REÇU N° {numero}</div>
                  <div style={{ fontSize: 11, color: C.textSoft }}>{recu.date}</div>
                </div>
              </div>
              <div style={{ marginTop: 14, fontSize: 12.5 }}>Client : <b>{client ? `${client.prenoms} ${client.nom}` : "Vente au comptant"}</b></div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 12.5, border: `1px solid ${C.text}` }}>
                <thead><tr>
                  <th style={{ background: C.ink, color: "#fff", padding: "6px 8px", textAlign: "left", border: `1px solid ${C.ink}` }}>Article</th>
                  <th style={{ background: C.ink, color: "#fff", padding: "6px 8px", border: `1px solid ${C.ink}` }}>Qté</th>
                  <th style={{ background: C.ink, color: "#fff", padding: "6px 8px", border: `1px solid ${C.ink}` }}>P.U.</th>
                  <th style={{ background: C.ink, color: "#fff", padding: "6px 8px", border: `1px solid ${C.ink}` }}>Total</th>
                </tr></thead>
                <tbody>
                  {recu.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ padding: "6px 8px", border: `1px solid ${C.line}` }}>{it.nom}</td>
                      <td className="f-mono" style={{ padding: "6px 8px", textAlign: "center", border: `1px solid ${C.line}` }}>{it.quantite}</td>
                      <td className="f-mono" style={{ padding: "6px 8px", textAlign: "right", border: `1px solid ${C.line}` }}>{fmt(it.prixUnitaire, config.devise)}</td>
                      <td className="f-mono" style={{ padding: "6px 8px", textAlign: "right", border: `1px solid ${C.line}` }}>{fmt(it.prixUnitaire * it.quantite, config.devise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 10, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Total</span><span className="f-mono">{fmt(recu.total, config.devise)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Montant payé</span><span className="f-mono">{fmt(recu.montantPaye, config.devise)}</span></div>
                {recu.total - recu.montantPaye > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: C.rose, fontWeight: 700 }}><span>Reste dû</span><span className="f-mono">{fmt(recu.total - recu.montantPaye, config.devise)}</span></div>}
                {recu.dateEcheance && <div style={{ display: "flex", justifyContent: "space-between", color: C.rose }}><span>Date de paiement prévue</span><span className="f-mono">{recu.dateEcheance}</span></div>}
              </div>
              <div style={{ marginTop: 20, fontSize: 10.5, fontStyle: "italic", color: C.textSoft }}>Merci de votre confiance.</div>
              <Btn kind="ghost" className="no-print" onClick={() => window.print()} style={{ marginTop: 14 }}><Printer size={13} /> Imprimer le reçu</Btn>
            </Card>
          );
        })()}

        <div className="no-print" style={{ fontSize: 11.5, color: C.textSoft, marginTop: 6 }}>L'historique complet des ventes est disponible dans le menu <b>Comptabilité → Historique</b>.</div>
      </div>
    );
  };

  const renderClients = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="f-display" style={{ fontSize: 22, fontWeight: 600 }}>Clients</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="ghost" onClick={() => exportCSV("clients.csv", ["Prénoms", "Nom", "Sexe", "Numéro", "Quartier", "Fonction", "Total acheté", "Solde dû"], clients.map(c => [c.prenoms, c.nom, c.sexe, c.telephone, c.quartier || "", c.profession || "", clientTotalAchats(c.id), Math.max(clientSolde(c.id), 0)]))}><Download size={13} /> Exporter</Btn>
          <Btn onClick={() => setClientForm({ prenoms: "", nom: "", sexe: "F", telephone: "", quartier: "", profession: "" })}><Plus size={13} /> Ajouter</Btn>
        </div>
      </div>

      {clientForm && (
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Input placeholder="Prénoms" value={clientForm.prenoms || ""} onChange={e => setClientForm({ ...clientForm, prenoms: e.target.value })} />
            <Input placeholder="Nom" value={clientForm.nom} onChange={e => setClientForm({ ...clientForm, nom: e.target.value })} />
            <Select value={clientForm.sexe || "F"} onChange={e => setClientForm({ ...clientForm, sexe: e.target.value })}><option value="F">Féminin</option><option value="M">Masculin</option></Select>
            <Input placeholder="Numéro (téléphone)" value={clientForm.telephone} onChange={e => setClientForm({ ...clientForm, telephone: e.target.value })} />
            <Input placeholder="Quartier" value={clientForm.quartier || ""} onChange={e => setClientForm({ ...clientForm, quartier: e.target.value })} />
            <Input placeholder="Fonction" value={clientForm.profession || ""} onChange={e => setClientForm({ ...clientForm, profession: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn onClick={saveClient}><Check size={13} /> Enregistrer</Btn>
            <Btn kind="ghost" onClick={() => setClientForm(null)}><X size={13} /> Annuler</Btn>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Encaisser un remboursement de crédit</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Select value={remboursementForm.clientId} onChange={e => setRemboursementForm({ ...remboursementForm, clientId: e.target.value })}>
            <option value="">Choisir un client…</option>
            {clients.filter(c => clientSolde(c.id) > 0).map(c => <option key={c.id} value={c.id}>{c.prenoms} {c.nom} — doit {fmt(clientSolde(c.id), config.devise)}</option>)}
          </Select>
          <Input type="number" placeholder="Montant reçu" value={remboursementForm.montant} onChange={e => setRemboursementForm({ ...remboursementForm, montant: e.target.value })} />
          <Select value={remboursementForm.mode} onChange={e => setRemboursementForm({ ...remboursementForm, mode: e.target.value })}>
            <option>Espèces</option><option>Orange Money</option><option>Mobile Money (autre)</option><option>Virement</option>
          </Select>
          <Btn onClick={enregistrerRemboursement}>Encaisser</Btn>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Prénoms et Nom</Th><Th>Sexe</Th><Th>Numéro</Th><Th>Quartier / Fonction</Th><Th>Total acheté</Th><Th>Solde dû</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {clients.map(c => {
              const solde = clientSolde(c.id);
              const retard = clientEnRetard(c.id);
              return (
                <tr key={c.id}>
                  <Td style={{ fontWeight: 600 }}>{c.prenoms} {c.nom}{retard && <div><Pill_ text="EN RETARD DE PAIEMENT" color={C.rose} bg={C.roseSoft} /></div>}</Td>
                  <Td>{c.sexe}</Td>
                  <Td>{c.telephone}</Td>
                  <Td style={{ fontSize: 11.5, color: C.textSoft }}>{[c.quartier, c.profession].filter(Boolean).join(" — ")}</Td>
                  <Td className="f-mono">{fmt(clientTotalAchats(c.id), config.devise)}</Td>
                  <Td className="f-mono" style={{ color: solde > 0 ? C.rose : C.sage, fontWeight: 700 }}>{fmt(solde, config.devise)}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setClientForm(c)} style={{ background: "none", border: "none", cursor: "pointer" }}><Pencil size={14} color={C.textSoft} /></button>
                      <button onClick={() => deleteClient(c.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rose} /></button>
                    </div>
                  </Td>
                </tr>
              );
            })}
            {!clients.length && <tr><Td colSpan={7} style={{ textAlign: "center", color: C.textSoft }}>Aucun client.</Td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );

  const CATEGORIES_DEPENSES = ["Achat de marchandises", "Frais de location", "Salaire", "Taxes", "Connexion", "Autres"];
  const renderDepenses = () => (
    <div>
      <div className="f-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Dépenses</div>
      <Card>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <Select value={depForm.categorie || CATEGORIES_DEPENSES[0]} onChange={e => setDepForm({ ...depForm, categorie: e.target.value })}>
            {CATEGORIES_DEPENSES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input type="number" placeholder="Montant" value={depForm.montant} onChange={e => setDepForm({ ...depForm, montant: e.target.value })} />
          <Input placeholder="Description" value={depForm.description} onChange={e => setDepForm({ ...depForm, description: e.target.value })} style={{ flex: 1 }} />
          <Btn onClick={saveDepense}>{depForm.id ? <Check size={13} /> : <Plus size={13} />}</Btn>
          {depForm.id && <Btn kind="ghost" onClick={() => setDepForm({ categorie: "", montant: "", description: "" })}><X size={13} /></Btn>}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Date</Th><Th>Catégorie</Th><Th>Description</Th><Th>Montant</Th><Th>Actions</Th></tr></thead>
          <tbody>{[...depenses].sort((a, b) => b.date.localeCompare(a.date)).map(d => (
            <tr key={d.id}>
              <Td>{d.date}</Td><Td style={{ fontWeight: 600 }}>{d.categorie}</Td><Td>{d.description}</Td><Td className="f-mono">{fmt(d.montant, config.devise)}</Td>
              <Td><div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setDepForm(d)} style={{ background: "none", border: "none", cursor: "pointer" }}><Pencil size={14} color={C.textSoft} /></button>
                <button onClick={() => deleteDepense(d.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rose} /></button>
              </div></Td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );

  const renderAlerte = () => {
    const produitsAlerte = produits.filter(p => p.stock <= p.seuilAlerte);
    const clientsRetard = clients.filter(c => clientEnRetard(c.id));
    return (
      <div>
        <div className="f-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Alerte</div>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={16} color={C.rose} /> Produits en manque de stock ({produitsAlerte.length})</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Produit</Th><Th>Stock actuel</Th><Th>Seuil d'alerte</Th></tr></thead>
            <tbody>
              {produitsAlerte.map(p => (
                <tr key={p.id}><Td style={{ fontWeight: 600 }}>{p.nom}</Td><Td className="f-mono" style={{ color: C.rose, fontWeight: 700 }}>{p.stock} {p.unite}(s)</Td><Td className="f-mono">{p.seuilAlerte}</Td></tr>
              ))}
              {!produitsAlerte.length && <tr><Td colSpan={3} style={{ textAlign: "center", color: C.sage }}>Aucun produit en manque.</Td></tr>}
            </tbody>
          </table>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={16} color={C.rose} /> Clients n'ayant pas réglé leur dette ({clientsRetard.length})</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Client</Th><Th>Numéro</Th><Th>Solde dû</Th></tr></thead>
            <tbody>
              {clientsRetard.map(c => (
                <tr key={c.id}><Td style={{ fontWeight: 600 }}>{c.prenoms} {c.nom}</Td><Td>{c.telephone}</Td><Td className="f-mono" style={{ color: C.rose, fontWeight: 700 }}>{fmt(clientSolde(c.id), config.devise)}</Td></tr>
              ))}
              {!clientsRetard.length && <tr><Td colSpan={3} style={{ textAlign: "center", color: C.sage }}>Aucun retard de paiement.</Td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    );
  };

  const renderHistorique = () => (
    <Card style={{ padding: 0 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><Th>Date</Th><Th>Client</Th><Th>Total</Th><Th>Payé</Th><Th>Mode</Th><Th>Actions</Th></tr></thead>
        <tbody>
          {[...ventes].reverse().map(v => {
            const client = clients.find(c => c.id === v.clientId);
            return (
              <tr key={v.id}>
                <Td>{v.date}</Td>
                <Td>{client ? `${client.prenoms} ${client.nom}` : "Comptant"}</Td>
                <Td className="f-mono">{fmt(v.total, config.devise)}</Td>
                {venteEnEdition === v.id ? (
                  <>
                    <Td><Input type="number" defaultValue={v.montantPaye} id={`edit-paye-${v.id}`} style={{ width: 90 }} /></Td>
                    <Td>
                      <Select defaultValue={v.mode} id={`edit-mode-${v.id}`}>
                        <option>Espèces</option><option>Orange Money</option><option>Mobile Money (autre)</option><option>Virement</option>
                      </Select>
                    </Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Btn kind="ghost" onClick={() => modifierVente(v.id, document.getElementById(`edit-paye-${v.id}`).value, document.getElementById(`edit-mode-${v.id}`).value)}><Check size={12} /></Btn>
                        <Btn kind="ghost" onClick={() => setVenteEnEdition(null)}><X size={12} /></Btn>
                      </div>
                    </Td>
                  </>
                ) : (
                  <>
                    <Td className="f-mono" style={{ color: v.montantPaye < v.total ? C.rose : C.sage }}>{fmt(v.montantPaye, config.devise)}</Td>
                    <Td style={{ fontSize: 11.5 }}>{v.mode}</Td>
                    <Td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn kind="ghost" onClick={() => setDerniereVenteId(v.id)}><Printer size={12} /></Btn>
                        <button onClick={() => setVenteEnEdition(v.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Pencil size={14} color={C.textSoft} /></button>
                        <button onClick={() => supprimerVente(v.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rose} /></button>
                      </div>
                    </Td>
                  </>
                )}
              </tr>
            );
          })}
          {!ventes.length && <tr><Td colSpan={6} style={{ textAlign: "center", color: C.textSoft }}>Aucune vente.</Td></tr>}
        </tbody>
      </table>
    </Card>
  );

  const renderComptabilite = () => {
    if (!dashboardAuthed) return (
      <Card style={{ width: 320, margin: "40px auto", textAlign: "center" }}>
        <Lock size={22} color={C.brass} style={{ marginBottom: 8 }} />
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Comptabilité protégée</div>
        <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10 }}>Les informations financières de la boutique sont réservées.</div>
        <Input type="password" placeholder="Mot de passe" value={dashboardPwd} onChange={e => { setDashboardPwd(e.target.value); setDashboardErr(false); }}
          onKeyDown={e => e.key === "Enter" && (dashboardPwd === (config.dashboardPassword || "Boutique2026") ? setDashboardAuthed(true) : setDashboardErr(true))}
          style={{ width: "100%", marginBottom: 8, boxSizing: "border-box" }} />
        {dashboardErr && <div style={{ color: C.rose, fontSize: 12, marginBottom: 8 }}>Mot de passe incorrect.</div>}
        <Btn style={{ width: "100%", justifyContent: "center" }} onClick={() => dashboardPwd === (config.dashboardPassword || "Boutique2026") ? setDashboardAuthed(true) : setDashboardErr(true)}>Déverrouiller</Btn>
      </Card>
    );
    return (
    <div>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div className="f-display" style={{ fontSize: 22, fontWeight: 600 }}>Comptabilité</div>
        <Btn kind="ghost" onClick={() => setDashboardAuthed(false)}><Lock size={13} /> Verrouiller</Btn>
      </div>
      <div style={{ color: C.textSoft, fontSize: 13, marginBottom: 16 }}>Archive de chaque vente, et bilan financier de la boutique.</div>
      <div className="no-print" style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <Btn kind={comptaTab === "historique" ? "primary" : "ghost"} onClick={() => setComptaTab("historique")}>Historique</Btn>
        <Btn kind={comptaTab === "bilan" ? "primary" : "ghost"} onClick={() => setComptaTab("bilan")}>Bilan</Btn>
      </div>
      {comptaTab === "historique" ? renderHistorique() : renderBilan()}
    </div>
    );
  };

  const renderBilan = () => {
    const parProduit = {};
    ventes.forEach(v => v.items.forEach(it => { parProduit[it.produitId] = (parProduit[it.produitId] || 0) + it.quantite; }));
    const meilleuresVentes = Object.entries(parProduit).map(([id, q]) => ({ produit: produits.find(p => p.id === id), quantite: q })).filter(x => x.produit).sort((a, b) => b.quantite - a.quantite).slice(0, 10);

    const ref = new Date(rapportDate + "T00:00:00");
    let debut, fin, labelPeriode;
    if (rapportPeriode === "jour") { debut = fin = rapportDate; labelPeriode = `Rapport journalier — ${rapportDate}`; }
    else if (rapportPeriode === "semaine") {
      const jourSemaine = ref.getDay();
      const diffLundi = jourSemaine === 0 ? -6 : 1 - jourSemaine;
      const lundi = new Date(ref); lundi.setDate(ref.getDate() + diffLundi);
      const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6);
      debut = lundi.toISOString().slice(0, 10); fin = dimanche.toISOString().slice(0, 10);
      labelPeriode = `Rapport hebdomadaire — du ${debut} au ${fin}`;
    } else {
      const premier = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const dernier = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      debut = premier.toISOString().slice(0, 10); fin = dernier.toISOString().slice(0, 10);
      labelPeriode = `Rapport mensuel — ${ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
    }
    const ventesP = ventes.filter(v => v.date >= debut && v.date <= fin);
    const depensesP = depenses.filter(d => d.date >= debut && d.date <= fin);
    const paiementsCreditP = paiementsCredit.filter(p => p.date >= debut && p.date <= fin);
    const totalVentesP = ventesP.reduce((s, v) => s + v.total, 0);
    const totalEncaisseP = ventesP.reduce((s, v) => s + Number(v.montantPaye || 0), 0) + paiementsCreditP.reduce((s, p) => s + Number(p.montant), 0);
    const totalDepensesP = depensesP.reduce((s, d) => s + Number(d.montant), 0);
    const coutMarchandisesP = ventesP.reduce((s, v) => s + v.items.reduce((s2, it) => { const p = produits.find(x => x.id === it.produitId); return s2 + (p ? p.prixAchat * it.quantite : 0); }, 0), 0);
    const beneficeP = totalVentesP - coutMarchandisesP;
    const montantEnCaisseP = totalEncaisseP - totalDepensesP;

    return (
      <div>
        <div className="f-display" style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Bilan</div>

        <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <Select value={rapportPeriode} onChange={e => setRapportPeriode(e.target.value)}>
            <option value="jour">Journalier</option><option value="semaine">Hebdomadaire</option><option value="mois">Mensuel</option>
          </Select>
          <Input type="date" value={rapportDate} onChange={e => setRapportDate(e.target.value)} />
          <Btn kind="ghost" onClick={() => window.print()}><Printer size={13} /> Imprimer ce rapport</Btn>
        </div>

        <Card className="print-area">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", border: `2px solid ${C.brass}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {config.logo ? <img src={config.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ShoppingCart size={20} color={C.brass} />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{config.nomBoutique}</div>
                {config.adresse && <div style={{ fontSize: 10.5, color: C.textSoft }}>{config.adresse}</div>}
                {config.tels && <div style={{ fontSize: 10.5, color: C.textSoft }}>Tél : {config.tels}</div>}
              </div>
            </div>
          </div>

          <div className="f-display" style={{ textAlign: "center", fontWeight: 700, fontSize: 19, margin: "16px 0 20px", textTransform: "uppercase" }}>{labelPeriode}</div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, border: `1px solid ${C.ink}` }}>
            <tbody>
              <tr>
                <td style={{ background: C.ink, color: "#fff", fontWeight: 700, padding: "10px 14px", border: `1px solid ${C.ink}` }}>Montant total des ventes</td>
                <td className="f-mono" style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, border: `1px solid ${C.line}` }}>{fmt(totalVentesP, config.devise)}</td>
              </tr>
              <tr>
                <td style={{ background: C.ink, color: "#fff", fontWeight: 700, padding: "10px 14px", border: `1px solid ${C.ink}` }}>Montant total des dépenses</td>
                <td className="f-mono" style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: C.rose, border: `1px solid ${C.line}` }}>{fmt(totalDepensesP, config.devise)}</td>
              </tr>
              <tr>
                <td style={{ background: C.ink, color: "#fff", fontWeight: 700, padding: "10px 14px", border: `1px solid ${C.ink}` }}>Bénéfice (intérêt)</td>
                <td className="f-mono" style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: C.brass, border: `1px solid ${C.line}` }}>{fmt(beneficeP, config.devise)}</td>
              </tr>
              <tr>
                <td style={{ background: C.ink, color: "#fff", fontWeight: 700, padding: "10px 14px", border: `1px solid ${C.ink}` }}>Montant en caisse</td>
                <td className="f-mono" style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: C.sage, border: `1px solid ${C.line}` }}>{fmt(montantEnCaisseP, config.devise)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 10.5, color: C.textSoft, marginTop: 8 }}>{ventesP.length} vente(s) · {depensesP.length} dépense(s) enregistrée(s) sur cette période.</div>
        </Card>

        <div className="f-display no-print" style={{ fontSize: 15, fontWeight: 600, margin: "20px 0 10px" }}>Statistiques globales (depuis le début)</div>
        <div className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
          <Card style={{ textAlign: "center" }}><div className="f-mono" style={{ fontSize: 18, fontWeight: 700 }}>{fmt(totalVentes, config.devise)}</div><div style={{ fontSize: 11, color: C.textSoft }}>chiffre d'affaires total</div></Card>
          <Card style={{ textAlign: "center" }}><div className="f-mono" style={{ fontSize: 18, fontWeight: 700, color: C.sage }}>{fmt(totalEncaisse, config.devise)}</div><div style={{ fontSize: 11, color: C.textSoft }}>total réellement encaissé</div></Card>
          <Card style={{ textAlign: "center" }}><div className="f-mono" style={{ fontSize: 18, fontWeight: 700, color: C.rose }}>{fmt(totalDepenses, config.devise)}</div><div style={{ fontSize: 11, color: C.textSoft }}>total dépenses</div></Card>
          <Card style={{ textAlign: "center" }}><div className="f-mono" style={{ fontSize: 18, fontWeight: 700, color: C.brass }}>{fmt(beneficeBrut - totalDepenses, config.devise)}</div><div style={{ fontSize: 11, color: C.textSoft }}>bénéfice net estimé</div></Card>
        </div>
        <Card className="no-print">
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Meilleures ventes</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Produit</Th><Th>Quantité vendue</Th></tr></thead>
            <tbody>{meilleuresVentes.map(x => <tr key={x.produit.id}><Td style={{ fontWeight: 600 }}>{x.produit.nom}</Td><Td className="f-mono">{x.quantite}</Td></tr>)}
              {!meilleuresVentes.length && <tr><Td colSpan={2} style={{ textAlign: "center", color: C.textSoft }}>Aucune vente encore.</Td></tr>}
            </tbody>
          </table>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><ClipboardList size={16} color={C.brass} /> Suggestions de commande</div>
          <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 8 }}>Produits en alerte de stock, classés par popularité des ventes — les plus vendus d'abord.</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Produit</Th><Th>Stock actuel</Th><Th>Vendu au total</Th><Th>Suggestion</Th></tr></thead>
            <tbody>
              {produits.filter(p => p.stock <= p.seuilAlerte).sort((a, b) => (parProduit[b.id] || 0) - (parProduit[a.id] || 0)).map(p => (
                <tr key={p.id}>
                  <Td style={{ fontWeight: 600 }}>{p.nom}</Td>
                  <Td className="f-mono" style={{ color: C.rose }}>{p.stock} {p.unite}(s)</Td>
                  <Td className="f-mono">{parProduit[p.id] || 0}</Td>
                  <Td className="f-mono" style={{ fontWeight: 700, color: C.brass }}>{Math.max((parProduit[p.id] || 0), p.seuilAlerte * 2)} {p.unite}(s)</Td>
                </tr>
              ))}
              {!produits.filter(p => p.stock <= p.seuilAlerte).length && <tr><Td colSpan={4} style={{ textAlign: "center", color: C.textSoft }}>Aucun produit en alerte pour le moment.</Td></tr>}
            </tbody>
          </table>
        </Card>

        <Btn kind="ghost" onClick={() => exportCSV("ventes.csv", ["Date", "Client", "Total", "Payé", "Mode"], ventes.map(v => { const cl = clients.find(c => c.id === v.clientId); return [v.date, cl ? `${cl.prenoms} ${cl.nom}` : "Comptant", v.total, v.montantPaye, v.mode]; }))}><Download size={13} /> Exporter toutes les ventes</Btn>
      </div>
    );
  };

  const renderParametres = () => (
    <div>
      <div className="f-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Paramètres</div>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><div style={{ fontSize: 11, color: C.textSoft, marginBottom: 4 }}>Nom de la boutique</div><Input value={config.nomBoutique} onChange={e => setConfig({ ...config, nomBoutique: e.target.value })} style={{ width: "100%", boxSizing: "border-box" }} /></div>
          <div><div style={{ fontSize: 11, color: C.textSoft, marginBottom: 4 }}>Devise</div>
            <Select value={config.devise} onChange={e => setConfig({ ...config, devise: e.target.value })} style={{ width: "100%", boxSizing: "border-box" }}>
              <option>GNF</option><option>XOF</option><option>XAF</option><option>EUR</option><option>USD</option>
            </Select>
          </div>
          <div><div style={{ fontSize: 11, color: C.textSoft, marginBottom: 4 }}>Adresse</div><Input value={config.adresse} onChange={e => setConfig({ ...config, adresse: e.target.value })} style={{ width: "100%", boxSizing: "border-box" }} /></div>
          <div><div style={{ fontSize: 11, color: C.textSoft, marginBottom: 4 }}>Téléphone</div><Input value={config.tels} onChange={e => setConfig({ ...config, tels: e.target.value })} style={{ width: "100%", boxSizing: "border-box" }} /></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 4 }}>Logo</div>
          <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => setConfig({ ...config, logo: r.result }); r.readAsDataURL(f); }} />
        </div>
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Mot de passe du tableau de bord</div>
          <Input type="password" value={config.dashboardPassword || "Boutique2026"} onChange={e => setConfig({ ...config, dashboardPassword: e.target.value })} style={{ width: "100%", boxSizing: "border-box" }} />
          <div style={{ fontSize: 11, color: C.textSoft, marginTop: 4 }}>Communiquez-le uniquement aux personnes de confiance.</div>
        </div>
      </Card>
    </div>
  );

  const items = [
    { k: "accueil", label: "Accueil", icon: Home },
    { k: "vente", label: "Vente / Caisse", icon: ShoppingCart },
    { k: "stock", label: "Stock", icon: Layers },
    { k: "commandes", label: "Commandes", icon: ClipboardList },
    { k: "clients", label: "Clients", icon: Users },
    { k: "comptabilite", label: "Comptabilité", icon: BarChart3 },
    { k: "depenses", label: "Dépenses", icon: Wallet },
    { k: "alerte", label: "Alerte", icon: AlertTriangle },
    { k: "parametres", label: "Paramètres", icon: Settings },
  ];
  const pages = { accueil: renderAccueil, vente: renderVente, stock: renderStock, commandes: renderCommandes, clients: renderClients, comptabilite: renderComptabilite, depenses: renderDepenses, alerte: renderAlerte, parametres: renderParametres };

  return (
    <div className="f-body" style={{ minHeight: "100vh", background: C.paper, display: "flex" }}>
      {FONTS}
      {saveStatus !== "saved" && (
        <div className="no-print" style={{ position: "fixed", bottom: 14, right: 14, zIndex: 999, display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 700, boxShadow: "0 2px 10px rgba(0,0,0,0.15)", background: saveStatus === "error" ? C.rose : C.brass, color: "#fff" }}>
          {saveStatus === "error" ? "⚠️ Non enregistré — nouvelle tentative en cours…" : "Enregistrement en cours…"}
        </div>
      )}
      <div className="no-print" style={{ width: sidebarOpen ? 210 : 60, background: C.ink, transition: "width .2s", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 8, color: "#fff", cursor: "pointer" }} onClick={() => setSidebarOpen(o => !o)}>
          <MenuIcon size={18} />{sidebarOpen && <span className="f-display" style={{ fontSize: 15, fontWeight: 600 }}>Ma Boutique</span>}
        </div>
        {items.map(it => (
          <button key={it.k} onClick={() => setMenu(it.k)} style={{
            background: menu === it.k ? "rgba(255,255,255,0.1)" : "none", border: "none", color: "#fff", padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderLeft: menu === it.k ? `3px solid ${C.brass}` : "3px solid transparent",
          }}>
            <it.icon size={17} />{sidebarOpen && <span style={{ fontSize: 13 }}>{it.label}</span>}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => { if (window.confirm("Se déconnecter ?")) supabase.auth.signOut(); }} style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.7)", padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderTop: "1px solid rgba(255,255,255,0.1)",
        }}>
          <LogOut size={17} />{sidebarOpen && <span style={{ fontSize: 13 }}>Déconnexion</span>}
        </button>
      </div>
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        {pages[menu] ? pages[menu]() : null}
      </div>
    </div>
  );
}
