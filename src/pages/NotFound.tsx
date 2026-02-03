import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Award, Book } from "lucide-react";
const NotFound = () => {
  const location = useLocation();
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);
  return <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero-like 404 to match Index */}
      <section className="relative overflow-hidden bg-gradient-hero py-20 lg:py-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-[10%] w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-[15%] w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-float" style={{
          animationDelay: '1.5s'
        }} />
          <div className="absolute top-1/2 right-[30%] w-24 h-24 bg-success/20 rounded-full blur-2xl animate-pulse-slow" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-secondary-foreground">
            <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 animate-fade-in">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Lopiho Soutěž</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-display font-extrabold mb-4 animate-slide-up">
              <span className="text-primary">404</span>
            </h1>

            <p className="mb-6 text-xl text-muted-foreground">
              Oops — stránka, kterou hledáš, nebyla nalezena.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{
            animationDelay: '0.2s'
          }}>
              <Link to="/">
                <Button variant="hero" size="lg" className="gap-2">
                  Zpět na hlavní
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link to="/clankovnice">
                <Button variant="outline" size="lg" className="gap-2">
                  Projdi kategorie
                  <Book className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Suggestion card to match Index card aesthetics */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="card-hover border-0 shadow-card">
              <CardHeader>
                <CardTitle>Co můžete udělat dál</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Zkontrolujte URL adresu — možná je v ní chyba.</li>
                  <li>Vraťte se na domovskou stránku a začněte znovu.</li>
                  <li>Projděte si dostupné kategorie a zapojte se do soutěže.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>;
};
export default NotFound;