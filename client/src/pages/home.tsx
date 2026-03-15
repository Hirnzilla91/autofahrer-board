import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trophy, Skull, ChevronRight, Car, AlertTriangle, Moon, Sun } from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import type { Plate, Comment } from "@shared/schema";

type RankedPlate = {
  plate: Plate;
  avgGrade: number;
  commentCount: number;
  latestComments: Comment[];
};

function getGradeColor(grade: number): string {
  if (grade <= 1.5) return "#22c55e";
  if (grade <= 2.5) return "#84cc16";
  if (grade <= 3.5) return "#eab308";
  if (grade <= 4.5) return "#f97316";
  if (grade <= 5.5) return "#ef4444";
  return "#991b1b";
}

function getGradeLabel(grade: number): string {
  if (grade <= 1.5) return "Vorbildlich";
  if (grade <= 2.5) return "Gut";
  if (grade <= 3.5) return "Naja";
  if (grade <= 4.5) return "Schlecht";
  if (grade <= 5.5) return "Katastrophe";
  return "Verkehrsrowdy";
}

function GradeBar({ grade }: { grade: number }) {
  const pct = ((grade - 1) / 5) * 100;
  const color = getGradeColor(grade);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums min-w-[2rem] text-right" style={{ color }}>
        {grade.toFixed(1)}
      </span>
    </div>
  );
}

function ScrollingComments({ comments }: { comments: Comment[] }) {
  if (!comments || comments.length === 0) return null;
  const duped = [...comments, ...comments];

  return (
    <div className="overflow-hidden relative h-5 mt-1">
      <div className="flex gap-6 animate-marquee whitespace-nowrap">
        {duped.map((c, i) => (
          <span key={`${c.id}-${i}`} className="text-xs text-muted-foreground">
            <span className="text-foreground/60 font-medium">{c.username}:</span>{" "}
            {c.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlateCard({ data, rank, type }: { data: RankedPlate; rank: number; type: "top" | "worst" }) {
  const isTop = type === "top";
  return (
    <Link href={`/plate/${data.plate.id}`}>
      <Card
        className="p-3 hover-elevate active-elevate-2 cursor-pointer transition-all"
        data-testid={`card-plate-${data.plate.id}`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
            isTop
              ? "bg-green-500/15 text-green-600 dark:text-green-400"
              : "bg-red-500/15 text-red-600 dark:text-red-400"
          }`}>
            {rank}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="plate-display text-sm font-bold tracking-wider bg-background border rounded px-2 py-0.5">
                {data.plate.plate}
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {data.commentCount} {data.commentCount === 1 ? "Meldung" : "Meldungen"}
              </Badge>
            </div>
            <div className="mt-1.5">
              <GradeBar grade={data.avgGrade} />
            </div>
            <ScrollingComments comments={data.latestComments} />
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </Card>
    </Link>
  );
}

function RankingSection({ title, icon: Icon, data, isLoading, type }: {
  title: string;
  icon: typeof Trophy;
  data?: RankedPlate[];
  isLoading: boolean;
  type: "top" | "worst";
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${type === "top" ? "text-green-500" : "text-red-500"}`} />
        <h2 className="font-bold text-base">{title}</h2>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data?.map((item, idx) => (
            <PlateCard key={item.plate.id} data={item} rank={idx + 1} type={type} />
          ))}
          {(!data || data.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Noch keine Einträge vorhanden.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [newPlate, setNewPlate] = useState({ city: "", letters: "", numbers: "" });
  const [isDark, setIsDark] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    if (prefersDark) document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const { data: topRated, isLoading: topLoading } = useQuery<RankedPlate[]>({
    queryKey: ["/api/rankings/top"],
  });

  const { data: worstRated, isLoading: worstLoading } = useQuery<RankedPlate[]>({
    queryKey: ["/api/rankings/worst"],
  });

  const { data: searchResults } = useQuery<Plate[]>({
    queryKey: ["/api/plates/search", `?q=${searchQuery}`],
    enabled: searchQuery.length >= 1,
  });

  const registerMutation = useMutation({
    mutationFn: async (plate: string) => {
      const res = await apiRequest("POST", "/api/plates", { plate });
      return res.json();
    },
    onSuccess: (data: Plate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rankings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plates"] });
      toast({ title: "Kennzeichen registriert", description: data.plate });
      setNewPlate({ city: "", letters: "", numbers: "" });
      setShowRegister(false);
      window.location.hash = `/plate/${data.id}`;
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const handleRegister = () => {
    const fullPlate = `${newPlate.city} ${newPlate.letters} ${newPlate.numbers}`.toUpperCase().trim();
    registerMutation.mutate(fullPlate);
  };

  const isPlateValid = newPlate.city.length >= 1 && newPlate.letters.length >= 1 && newPlate.numbers.length >= 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Kennzeichen-Brett</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Deutschlands satirisches Fahrer-Register</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-6 pb-24">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Kennzeichen suchen..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {/* Search Results */}
        {searchQuery.length >= 1 && searchResults && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {searchResults.length} Ergebnis{searchResults.length !== 1 ? "se" : ""}
            </p>
            {searchResults.map((p) => (
              <Link key={p.id} href={`/plate/${p.id}`}>
                <Card className="p-3 hover-elevate cursor-pointer" data-testid={`card-search-result-${p.id}`}>
                  <span className="plate-display font-bold text-sm tracking-wider">{p.plate}</span>
                </Card>
              </Link>
            ))}
            {searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Kein Kennzeichen gefunden.
              </p>
            )}
          </div>
        )}

        {/* Register New Plate */}
        {!searchQuery && (
          <>
            {!showRegister ? (
              <Button
                className="w-full gap-2"
                onClick={() => setShowRegister(true)}
                data-testid="button-register-plate"
              >
                <Plus className="w-4 h-4" />
                Neues Kennzeichen melden
              </Button>
            ) : (
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">Kennzeichen registrieren</h3>
                </div>

                <div className="flex gap-2 items-center">
                  {/* EU blue strip + plate fields */}
                  <div className="flex items-stretch border-2 border-foreground/20 rounded-lg overflow-hidden bg-background">
                    <div className="w-6 bg-blue-700 flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">D</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <Input
                        className="w-16 h-8 text-center font-bold uppercase border-0 bg-transparent p-0 text-sm plate-display tracking-wider focus-visible:ring-0"
                        placeholder="HH"
                        maxLength={3}
                        value={newPlate.city}
                        onChange={(e) => setNewPlate({ ...newPlate, city: e.target.value.toUpperCase().replace(/[^A-ZÄÖÜ]/g, "") })}
                        data-testid="input-plate-city"
                      />
                      <span className="text-muted-foreground text-lg font-light">|</span>
                      <Input
                        className="w-12 h-8 text-center font-bold uppercase border-0 bg-transparent p-0 text-sm plate-display tracking-wider focus-visible:ring-0"
                        placeholder="AB"
                        maxLength={2}
                        value={newPlate.letters}
                        onChange={(e) => setNewPlate({ ...newPlate, letters: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}
                        data-testid="input-plate-letters"
                      />
                      <Input
                        className="w-16 h-8 text-center font-bold border-0 bg-transparent p-0 text-sm plate-display tracking-wider focus-visible:ring-0"
                        placeholder="1234"
                        maxLength={4}
                        value={newPlate.numbers}
                        onChange={(e) => setNewPlate({ ...newPlate, numbers: e.target.value.replace(/[^0-9]/g, "") })}
                        data-testid="input-plate-numbers"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Format: 1-3 Buchstaben Stadtcode, 1-2 Buchstaben, 1-4 Ziffern
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => { setShowRegister(false); setNewPlate({ city: "", letters: "", numbers: "" }); }}
                    data-testid="button-cancel-register"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!isPlateValid || registerMutation.isPending}
                    onClick={handleRegister}
                    data-testid="button-submit-register"
                  >
                    {registerMutation.isPending ? "..." : "Registrieren"}
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Rankings */}
        {!searchQuery && (
          <>
            <RankingSection
              title="Top 10 Vorbildliche Fahrer"
              icon={Trophy}
              data={topRated}
              isLoading={topLoading}
              type="top"
            />
            <RankingSection
              title="Top 10 Verkehrsrowdys"
              icon={Skull}
              data={worstRated}
              isLoading={worstLoading}
              type="worst"
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-8">
        <div className="max-w-lg mx-auto px-4 space-y-2 text-center">
          <p className="text-[10px] text-muted-foreground">
            Satire-Projekt. Alle Einträge sind fiktiv und dienen der Unterhaltung.
          </p>
          <PerplexityAttribution />
        </div>
      </footer>
    </div>
  );
}
