import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, User, Clock, Moon, Sun } from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import type { Plate, Comment } from "@shared/schema";

function getGradeColor(grade: number): string {
  if (grade <= 1.5) return "#22c55e";
  if (grade <= 2.5) return "#84cc16";
  if (grade <= 3.5) return "#eab308";
  if (grade <= 4.5) return "#f97316";
  if (grade <= 5.5) return "#ef4444";
  return "#991b1b";
}

function getGradeEmoji(grade: number): string {
  if (grade === 1) return "1";
  if (grade === 2) return "2";
  if (grade === 3) return "3";
  if (grade === 4) return "4";
  if (grade === 5) return "5";
  return "6";
}

function getGradeLabel(grade: number): string {
  const labels: Record<number, string> = {
    1: "Sehr gut",
    2: "Gut",
    3: "Befriedigend",
    4: "Ausreichend",
    5: "Mangelhaft",
    6: "Ungenügend",
  };
  return labels[grade] || "";
}

function GradeScale({ avgGrade, totalComments }: { avgGrade: number; totalComments: number }) {
  const segments = [1, 2, 3, 4, 5, 6];
  const colors = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444", "#991b1b"];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Durchschnittsnote</span>
        <span
          className="text-lg font-bold tabular-nums"
          style={{ color: getGradeColor(avgGrade) }}
        >
          {avgGrade.toFixed(1)}
        </span>
      </div>
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
        {segments.map((seg, i) => (
          <div
            key={seg}
            className="flex-1 transition-opacity duration-300"
            style={{
              backgroundColor: colors[i],
              opacity: Math.abs(avgGrade - seg) < 0.8 ? 1 : 0.2,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] text-green-500 font-medium">1 Sehr gut</span>
        <span className="text-[10px] text-red-700 dark:text-red-400 font-medium">6 Ungenügend</span>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Basierend auf {totalComments} {totalComments === 1 ? "Bewertung" : "Bewertungen"}
      </p>
    </div>
  );
}

function GradeSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const grades = [1, 2, 3, 4, 5, 6];
  const colors = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444", "#991b1b"];

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground font-medium">Note vergeben</label>
      <div className="flex gap-1.5">
        {grades.map((g, i) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange(g)}
            className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all border-2 ${
              value === g
                ? "scale-105 border-foreground/30"
                : "border-transparent opacity-50 hover:opacity-80"
            }`}
            style={{
              backgroundColor: colors[i],
              color: g <= 3 ? "#000" : "#fff",
            }}
            data-testid={`button-grade-${g}`}
          >
            {g}
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-xs text-center font-medium" style={{ color: colors[value - 1] }}>
          {getGradeLabel(value)}
        </p>
      )}
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const gradeColor = getGradeColor(comment.grade);
  const timeAgo = getTimeAgo(new Date(comment.createdAt));

  return (
    <div className="flex gap-3 py-3 border-b last:border-0" data-testid={`comment-${comment.id}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: gradeColor, color: comment.grade <= 3 ? "#000" : "#fff" }}
      >
        {comment.grade}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{comment.username}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {timeAgo}
          </span>
        </div>
        <p className="text-sm text-foreground/80 mt-0.5 break-words">{comment.text}</p>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes}m`;
  if (hours < 24) return `vor ${hours}h`;
  if (days < 30) return `vor ${days}d`;
  return date.toLocaleDateString("de-DE");
}

export default function PlateDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [commentText, setCommentText] = useState("");
  const [grade, setGrade] = useState(0);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const { data: plate, isLoading: plateLoading } = useQuery<Plate>({
    queryKey: ["/api/plates", id.toString()],
    enabled: id > 0,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: ["/api/plates", id.toString(), "comments"],
    enabled: id > 0,
  });

  const commentMutation = useMutation({
    mutationFn: async (data: { username: string; text: string; grade: number }) => {
      const res = await apiRequest("POST", `/api/plates/${id}/comments`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plates", id.toString(), "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rankings"] });
      toast({ title: "Kommentar hinzugefügt" });
      setCommentText("");
      setGrade(0);
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmitComment = () => {
    if (!username.trim() || !commentText.trim() || grade === 0) return;
    commentMutation.mutate({
      username: username.trim(),
      text: commentText.trim(),
      grade,
    });
  };

  const avgGrade = comments && comments.length > 0
    ? comments.reduce((sum, c) => sum + c.grade, 0) / comments.length
    : 0;

  const isFormValid = username.trim().length >= 2 && commentText.trim().length >= 3 && grade > 0;

  if (plateLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!plate) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">Kennzeichen nicht gefunden</p>
        <Link href="/">
          <Button variant="secondary">Zurück zur Startseite</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-sm font-bold">Fahrerprofil</h1>
          </div>
          <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle-detail">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Plate Display */}
        <Card className="p-4">
          <div className="flex items-stretch border-2 border-foreground/20 rounded-lg overflow-hidden bg-background mx-auto w-fit">
            <div className="w-8 bg-blue-700 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">D</span>
            </div>
            <div className="px-4 py-2 flex items-center">
              <span className="plate-display text-xl font-bold tracking-[0.15em]">
                {plate.plate}
              </span>
            </div>
          </div>

          {/* Grade Scale */}
          {comments && comments.length > 0 && (
            <div className="mt-4">
              <GradeScale avgGrade={avgGrade} totalComments={comments.length} />
            </div>
          )}
          {comments && comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-3">
              Noch keine Bewertungen vorhanden.
            </p>
          )}
        </Card>

        {/* Add Comment */}
        <Card className="p-4 space-y-3">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Bewertung abgeben
          </h2>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Benutzername</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Dein Name"
                maxLength={30}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_\-äöüÄÖÜß]/g, ""))}
                data-testid="input-username"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Nur Buchstaben, Zahlen, _ und - erlaubt
            </p>
          </div>

          <GradeSelector value={grade} onChange={setGrade} />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground font-medium">Kommentar</label>
              <span className={`text-[10px] tabular-nums ${commentText.length > 110 ? "text-red-500" : "text-muted-foreground"}`}>
                {commentText.length}/120
              </span>
            </div>
            <Textarea
              placeholder="Was ist dir aufgefallen?"
              maxLength={120}
              rows={2}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="resize-none text-sm"
              data-testid="input-comment"
            />
          </div>

          <Button
            className="w-full gap-2"
            disabled={!isFormValid || commentMutation.isPending}
            onClick={handleSubmitComment}
            data-testid="button-submit-comment"
          >
            <Send className="w-3.5 h-3.5" />
            {commentMutation.isPending ? "Wird gesendet..." : "Absenden"}
          </Button>
        </Card>

        {/* Comments List */}
        <section className="space-y-1">
          <h2 className="font-bold text-sm px-1">
            Kommentare {comments ? `(${comments.length})` : ""}
          </h2>
          <Card className="px-4">
            {commentsLoading ? (
              <div className="space-y-3 py-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments && comments.length > 0 ? (
              comments.map((c) => <CommentItem key={c.id} comment={c} />)
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Noch keine Kommentare</p>
                <p className="text-xs text-muted-foreground mt-1">Sei der Erste!</p>
              </div>
            )}
          </Card>
        </section>
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
