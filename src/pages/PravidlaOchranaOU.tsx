import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X, Trash2, AlertTriangle, FileText, Shield, Eye } from "lucide-react";
import { LvZJContent } from "@/lib/lvzj-parser";

// Výchozí text pravidel s LvZJ formátováním
const DEFAULT_PRAVIDLA = `(nadpis)Pravidla soutěže

(oddělovač)

(boxík červeně zarovnat-na-střed)
(tučně)⚠️ DŮLEŽITÁ PODMÍNKA
Pro účast v soutěži musí být účastník zároveň registrovaným uživatelem na webu (odkaz https://www.alik.cz)alik.cz(konec odkazu)!
(konec boxíku)

(oddělovač)

(malý nadpis)1. Základní ustanovení

(seznam)
Tato pravidla upravují podmínky účasti v soutěži a způsob hodnocení účastníků.
Účastí v soutěži účastník vyjadřuje souhlas s těmito pravidly.
Organizátor si vyhrazuje právo na změnu pravidel.
(konec seznamu)

(oddělovač)

(malý nadpis)2. Podmínky účasti

Pro účast v soutěži musí účastník splňovat následující podmínky:

(číslovaný seznam)
(tučně)Registrace na soutěžním webu(konec tučně) – účastník musí mít vytvořený a aktivní účet na této platformě.
(tučně)Registrace na alik.cz(konec tučně) – účastník musí být zároveň registrovaným uživatelem na webu alik.cz.
(tučně)Jeden účet(konec tučně) – každá osoba smí mít pouze jeden soutěžní účet. Vícenásobné účty budou smazány.
(tučně)Pravdivé údaje(konec tučně) – účastník uvádí pravdivé informace o své identitě.
(konec seznamu)

(oddělovač)

(malý nadpis)3. Bodový systém

Body lze získat účastí v různých soutěžních aktivitách:

(boxík modře)
(tučně)📰 ČLÁNKOVNICE
(konec boxíku)

(seznam)
(tučně zelený)5 bodů(konec tučně) – základní odměna za publikovaný článek
(tučně zelený)0–5 bodů(konec tučně) – bonus podle průměrného hodnocení článku
(tučně zelený)1 bod za každá 2 hodnocení(konec tučně) – odměna za hodnocení článků ostatních (max. 10 bodů)
(konec seznamu)

(boxík fialově)
(tučně)🎯 TIPOVAČKY
(konec boxíku)

(seznam)
Body dle nastavení konkrétní tipovačky
Pouze jeden tip na každou hru
Správná odpověď = body pro vítěze
(konec seznamu)

(oddělovač)

(malý nadpis)4. Hodnocení článků

(seznam)
Články hodnotí ostatní účastníci na stupnici (tučně)1–10(konec tučně).
Hodnocení probíhá (tučně)po schválení(konec tučně) článku organizátorem.
(tučně červený)Vlastní článek nelze hodnotit!(konec tučně)
Každý článek lze hodnotit pouze jednou.
Hodnocení nelze měnit ani mazat.
(konec seznamu)

(oddělovač)

(malý nadpis)5. Obchůdek

(boxík oranžově)
Za nasbírané body lze nakupovat odměny v soutěžním obchůdku.
(konec boxíku)

(seznam)
Ceny zboží určuje organizátor.
Po objednání jsou body (tučně)odečteny okamžitě(konec tučně).
Nákup je (tučně červený)nevratný(konec tučně) – body nelze vrátit.
O vyřízení objednávky rozhoduje organizátor.
(konec seznamu)

(oddělovač)

(malý nadpis)6. Práva a povinnosti účastníků

Účastník soutěže je povinen:

(seznam)
Chovat se slušně a respektovat ostatní účastníky
Nepodvádět a nemanipulovat s bodovým systémem
Nepoužívat vulgární, urážlivý nebo nevhodný obsah
Respektovat autorská práva a neporušovat je
Nekopírovat cizí články ani obsah
Reagovat na výzvy organizátora
(konec seznamu)

(oddělovač)

(malý nadpis)7. Práva organizátora

Organizátor má právo:

(seznam)
Kdykoliv upravit pravidla soutěže
Vyloučit účastníka za porušení pravidel bez náhrady
Rozhodovat o sporných situacích s konečnou platností
Upravovat bodové ohodnocení aktivit
Pozastavit nebo ukončit soutěž
Odmítnout publikaci článku bez udání důvodu
(konec seznamu)

(oddělovač)

(malý nadpis)8. Průběh soutěže

(číslovaný seznam)
Soutěž probíhá kontinuálně po dobu stanovenou organizátorem.
Výsledky jsou průběžně zobrazovány na žebříčku.
Organizátor může vyhlásit speciální kola nebo soutěže.
O případných výhrách a cenách rozhoduje organizátor.
(konec seznamu)

(oddělovač)

(malý nadpis)9. Ceny a odměny

(seznam)
Hlavní ceny určuje organizátor dle svého uvážení.
Menší odměny lze získat v obchůdku za body.
Organizátor si vyhrazuje právo změnit nebo zrušit ceny.
Ceny nelze vyměnit za peníze.
(konec seznamu)

(oddělovač)

(malý nadpis)10. Závěrečná ustanovení

(boxík zeleně)
Účastí v soutěži vyjadřujete souhlas s těmito pravidly a zavazujete se je dodržovat.
(konec boxíku)

(seznam)
Tato pravidla nabývají účinnosti dnem zveřejnění.
Organizátor si vyhrazuje právo na konečný výklad pravidel.
V případě dotazů kontaktujte organizátora přes interní poštu.
(konec seznamu)`;

// Výchozí text ochrany OU s LvZJ formátováním
const DEFAULT_OCHRANA_OU = `(nadpis)Ochrana osobních údajů

(oddělovač)

(boxík modře zarovnat-na-střed)
Informace o zpracování osobních údajů v souladu s (tučně)Nařízením GDPR(konec tučně)
(Nařízení Evropského parlamentu a Rady (EU) 2016/679)
(konec boxíku)

(oddělovač)

(malý nadpis)1. Správce osobních údajů

Správcem vašich osobních údajů je organizátor této soutěže. Kontaktovat jej můžete prostřednictvím interní pošty na tomto webu.

(oddělovač)

(malý nadpis)2. Zpracovávané osobní údaje

(tučně)Povinné údaje:(konec tučně)
(seznam)
E-mailová adresa (pro přihlášení a komunikaci)
Uživatelské jméno (veřejně zobrazováno v soutěži)
(konec seznamu)

(tučně)Volitelné údaje:(konec tučně)
(seznam)
Profilový obrázek (avatar)
Bio / popis profilu
(konec seznamu)

(tučně)Automaticky generované údaje:(konec tučně)
(seznam)
Datum registrace
Počet bodů a historie jejich změn
Role v systému (uživatel, pomocník, organizátor)
(konec seznamu)

(tučně)Uživatelem vytvořený obsah:(konec tučně)
(seznam)
Články a jejich hodnocení
Tipy v tipovačkách
Zprávy v interní poště
Historie nákupů v obchůdku
(konec seznamu)

(oddělovač)

(malý nadpis)3. Účel zpracování

Vaše údaje zpracováváme za následujícími účely:

(číslovaný seznam)
(tučně)Provoz soutěže(konec tučně) – umožnění účasti, počítání bodů, zobrazení na žebříčku
(tučně)Komunikace(konec tučně) – zasílání zpráv mezi účastníky a organizátory
(tučně)Moderace(konec tučně) – kontrola dodržování pravidel a kvality obsahu
(tučně)Obchůdek(konec tučně) – zpracování objednávek a sledování nákupů
(tučně)Statistiky(konec tučně) – anonymní statistiky o účasti a aktivitě
(konec seznamu)

(oddělovač)

(malý nadpis)4. Právní základ zpracování

(boxík šedě)
Zpracování osobních údajů probíhá na základě:
(seznam)
(tučně)Souhlasu(konec tučně) – vyjádřeného registrací do soutěže
(tučně)Oprávněného zájmu(konec tučně) – organizátora na řádném průběhu soutěže
(tučně)Plnění smlouvy(konec tučně) – účast v soutěži jako smluvní vztah
(konec seznamu)
(konec boxíku)

(oddělovač)

(malý nadpis)5. Doba uchování údajů

(seznam)
Údaje jsou uchovávány po dobu (tučně)trvání soutěže(konec tučně).
Po skončení soutěže jsou údaje uchovávány max. (tučně)3 roky(konec tučně) pro archivní účely.
Na vyžádání jsou údaje smazány (tučně)do 30 dnů(konec tučně) od schválení žádosti.
(konec seznamu)

(oddělovač)

(malý nadpis)6. Vaše práva

Podle GDPR máte následující práva:

(boxík zeleně)
(tučně)✓ Právo na přístup(konec tučně) – můžete požádat o kopii svých údajů
(tučně)✓ Právo na opravu(konec tučně) – můžete opravit nepřesné údaje ve svém profilu
(tučně)✓ Právo na výmaz(konec tučně) – můžete požádat o smazání všech údajů
(tučně)✓ Právo na omezení(konec tučně) – můžete požádat o omezení zpracování
(tučně)✓ Právo na přenositelnost(konec tučně) – můžete požádat o export údajů
(tučně)✓ Právo vznést námitku(konec tučně) – můžete nesouhlasit se zpracováním
(tučně)✓ Právo podat stížnost(konec tučně) – u Úřadu pro ochranu osobních údajů (ÚOOÚ)
(konec boxíku)

(oddělovač)

(malý nadpis)7. Žádost o smazání údajů

(boxík červeně)
(tučně)⚠️ UPOZORNĚNÍ(konec tučně)
Po schválení žádosti o smazání budou (tučně)nenávratně odstraněny(konec tučně):
(konec boxíku)

(spoiler Co přesně bude smazáno?)
(seznam)
Všechny vaše osobní údaje v profilu
Všechny vaše články
Všechny vaše tipy v tipovačkách
Všechna vaše hodnocení článků
Všechny vaše zprávy v poště
Kompletní historie nákupů v obchůdku
Váš uživatelský účet
(konec seznamu)

Po smazání (tučně červený)NEBUDE MOŽNÉ(konec tučně) data obnovit ani pokračovat v soutěži pod stejným účtem.
(konec spoileru)

(oddělovač)

(malý nadpis)8. Zabezpečení údajů

Vaše údaje chráníme následujícími opatřeními:

(seznam)
Data jsou uložena na zabezpečených serverech
Veškerá komunikace probíhá přes šifrované spojení (tučně)HTTPS(konec tučně)
Přístup k údajům mají pouze oprávněné osoby (organizátoři)
Hesla jsou ukládána v zašifrované podobě
Pravidelné zálohování dat
(konec seznamu)

(oddělovač)

(malý nadpis)9. Sdílení údajů s třetími stranami

(seznam)
Vaše údaje (tučně zeleně)NESDÍLÍME(konec tučně) s třetími stranami pro komerční účely.
Veřejně viditelné jsou pouze: uživatelské jméno, avatar, bio, body a vaše články.
Údaje mohou být zpřístupněny pouze na základě zákonného požadavku.
(konec seznamu)

(oddělovač)

(malý nadpis)10. Cookies a technické údaje

(seznam)
Používáme pouze (tučně)nezbytné technické cookies(konec tučně) pro fungování webu.
Nepoužíváme reklamní ani sledovací cookies.
Pro přihlášení je nutné mít cookies povoleny.
(konec seznamu)

(oddělovač)

(malý nadpis)11. Změny těchto podmínek

(seznam)
O změnách v ochraně osobních údajů budete informováni na webu.
Aktuální verze podmínek je vždy dostupná na této stránce.
Pokračováním v účasti souhlasíte s aktuálním zněním.
(konec seznamu)

(oddělovač)

(malý nadpis)12. Kontakt

(boxík modře)
V případě dotazů ohledně zpracování osobních údajů nebo pro uplatnění svých práv kontaktujte organizátora prostřednictvím (tučně)interní pošty(konec tučně) na tomto webu.
(konec boxíku)

(oddělovač)

(citace GDPR – Článek 17 autor)
„Subjekt údajů má právo na to, aby správce bez zbytečného odkladu vymazal osobní údaje, které se daného subjektu údajů týkají."
(konec citace)`;

const PravidlaOchranaOU = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [pravidla, setPravidla] = useState("");
  const [ochranaOU, setOchranaOU] = useState("");
  const [editingPravidla, setEditingPravidla] = useState(false);
  const [editingOchrana, setEditingOchrana] = useState(false);
  const [editedPravidla, setEditedPravidla] = useState("");
  const [editedOchrana, setEditedOchrana] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [myRequest, setMyRequest] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchContent();
    if (user) {
      fetchMyRequest();
      checkRole();
    }
  }, [user]);

  const checkRole = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id);
    
    const hasOrgRole = data?.some(r => r.role === 'organizer' || r.role === 'helper');
    setIsOrganizer(hasOrgRole || false);
  };

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from('site_content')
      .select('*');
    
    if (data) {
      const pravidlaContent = data.find(c => c.key === 'pravidla');
      const ochranaContent = data.find(c => c.key === 'ochrana_ou');
      
      // Použít výchozí texty, pokud v DB nic není
      setPravidla(pravidlaContent?.content || DEFAULT_PRAVIDLA);
      setOchranaOU(ochranaContent?.content || DEFAULT_OCHRANA_OU);
    } else {
      // Pokud selže načtení, použít výchozí
      setPravidla(DEFAULT_PRAVIDLA);
      setOchranaOU(DEFAULT_OCHRANA_OU);
    }
    setLoading(false);
  };

  const fetchMyRequest = async () => {
    const { data } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'pending')
      .maybeSingle();
    
    setMyRequest(data);
  };

  const handleSave = async (key: string, content: string) => {
    const { error } = await supabase
      .from('site_content')
      .update({ content, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('key', key);

    if (error) {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    } else {
      toast({ title: "Uloženo" });
      if (key === 'pravidla') {
        setPravidla(content);
        setEditingPravidla(false);
      } else {
        setOchranaOU(content);
        setEditingOchrana(false);
      }
    }
  };

  const handleDeleteRequest = async () => {
    if (!user) return;
    
    setSubmitting(true);
    
    // Create deletion request
    const { error: requestError } = await supabase
      .from('deletion_requests')
      .insert({
        user_id: user.id,
        reason: deleteReason || 'Bez udání důvodu'
      });

    if (requestError) {
      toast({ title: "Chyba při odesílání žádosti", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Send message to all organizers
    const { data: organizers } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'organizer');

    if (organizers) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      for (const org of organizers) {
        await supabase.from('messages').insert({
          sender_id: user.id,
          recipient_id: org.user_id,
          subject: '🗑️ Žádost o smazání údajů',
          content: `Uživatel ${profile?.username || 'Neznámý'} žádá o smazání všech svých osobních údajů.\n\nDůvod: ${deleteReason || 'Bez udání důvodu'}\n\nŽádost můžete vyřídit v administraci.`
        });
      }
    }

    toast({ title: "Žádost odeslána", description: "Organizátoři byli informováni." });
    setDeleteDialogOpen(false);
    setDeleteReason("");
    fetchMyRequest();
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Načítání...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Pravidla a ochrana osobních údajů</h1>
      
      <Tabs defaultValue="pravidla" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pravidla" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pravidla soutěže
          </TabsTrigger>
          <TabsTrigger value="ochrana" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Ochrana osobních údajů
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pravidla">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pravidla soutěže</CardTitle>
                <CardDescription>Pravidla a podmínky účasti v soutěži</CardDescription>
              </div>
              {isOrganizer && !editingPravidla && (
                <Button variant="outline" size="sm" onClick={() => {
                  setEditedPravidla(pravidla);
                  setEditingPravidla(true);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Upravit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingPravidla ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Editor (LvZJ formátování)</p>
                      <Textarea 
                        value={editedPravidla}
                        onChange={(e) => setEditedPravidla(e.target.value)}
                        className="min-h-[400px] font-mono text-sm"
                        placeholder="Napište pravidla soutěže s LvZJ formátováním..."
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Náhled
                      </p>
                      <div className="border rounded-md p-4 min-h-[400px] overflow-auto bg-muted/30">
                        <LvZJContent content={editedPravidla} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave('pravidla', editedPravidla)}>
                      <Save className="h-4 w-4 mr-2" />
                      Uložit
                    </Button>
                    <Button variant="outline" onClick={() => setEditingPravidla(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <LvZJContent content={pravidla} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ochrana">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ochrana osobních údajů</CardTitle>
                <CardDescription>Informace o zpracování osobních údajů (GDPR)</CardDescription>
              </div>
              {isOrganizer && !editingOchrana && (
                <Button variant="outline" size="sm" onClick={() => {
                  setEditedOchrana(ochranaOU);
                  setEditingOchrana(true);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Upravit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingOchrana ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Editor (LvZJ formátování)</p>
                      <Textarea 
                        value={editedOchrana}
                        onChange={(e) => setEditedOchrana(e.target.value)}
                        className="min-h-[400px] font-mono text-sm"
                        placeholder="Napište informace o ochraně osobních údajů s LvZJ formátováním..."
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Náhled
                      </p>
                      <div className="border rounded-md p-4 min-h-[400px] overflow-auto bg-muted/30">
                        <LvZJContent content={editedOchrana} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave('ochrana_ou', editedOchrana)}>
                      <Save className="h-4 w-4 mr-2" />
                      Uložit
                    </Button>
                    <Button variant="outline" onClick={() => setEditingOchrana(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <LvZJContent content={ochranaOU} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deletion request section for logged in users */}
          {user && !isOrganizer && (
            <Card className="mt-6 border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Žádost o smazání údajů
                </CardTitle>
                <CardDescription>
                  Máte právo požádat o smazání všech vašich osobních údajů
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myRequest ? (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    <p>Vaše žádost o smazání údajů čeká na vyřízení.</p>
                  </div>
                ) : (
                  <Button 
                    variant="destructive" 
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Požádat o smazání mých údajů
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete request dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Žádost o smazání údajů
            </DialogTitle>
            <DialogDescription>
              Tato akce je nevratná. Po schválení organizátorem budou smazány všechny vaše údaje včetně článků, tipů a dalších příspěvků.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Důvod žádosti (volitelné)..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Zrušit
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteRequest}
              disabled={submitting}
            >
              {submitting ? "Odesílání..." : "Odeslat žádost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PravidlaOchranaOU;
