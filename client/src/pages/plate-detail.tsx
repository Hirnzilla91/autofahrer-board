import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Car, Users, Info, ExternalLink } from "lucide-react";
import type { LicensePlate } from "@shared/schema";

export default function PlateDetail() {
  const [, params] = useRoute("/plate/:id");
  const plateId = params?.id ? parseInt(params.id) : null;

  const { data: plate, isLoading } = useQuery<LicensePlate>({
    queryKey: [`/api/plates/${plateId}`],
    enabled: plateId !== null,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-10 w-32 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!plate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-500">Kennzeichen nicht gefunden</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </Link>

        {/* Main card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold text-3xl tracking-widest border-4 border-blue-700 shadow-md">
                {plate.code}
              </div>
              <div>
                <CardTitle className="text-2xl">{plate.city}</CardTitle>
                <div className="flex items-center gap-1 text-gray-500 mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>{plate.region}</span>
                </div>
              </div>
              {plate.isPopular && (
                <Badge variant="secondary" className="ml-auto">
                  Beliebt
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {plate.description && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Beschreibung
                </h3>
                <p className="text-gray-600">{plate.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {plate.population && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Users className="h-4 w-4" />
                    Einwohner
                  </div>
                  <div className="font-semibold text-gray-800">
                    {plate.population.toLocaleString("de-DE")}
                  </div>
                </div>
              )}

              {plate.area && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <MapPin className="h-4 w-4" />
                    Fläche
                  </div>
                  <div className="font-semibold text-gray-800">
                    {plate.area.toLocaleString("de-DE")} km²
                  </div>
                </div>
              )}

              {plate.founded && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Car className="h-4 w-4" />
                    Gegründet
                  </div>
                  <div className="font-semibold text-gray-800">{plate.founded}</div>
                </div>
              )}

              {plate.postalCode && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <MapPin className="h-4 w-4" />
                    PLZ
                  </div>
                  <div className="font-semibold text-gray-800">{plate.postalCode}</div>
                </div>
              )}
            </div>

            {plate.wikipediaUrl && (
              <div className="mt-4">
                <a
                  href={plate.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  Wikipedia-Artikel lesen
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Über Kfz-Kennzeichen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Das Kfz-Kennzeichen <strong>{plate.code}</strong> steht für{" "}
              <strong>{plate.city}</strong> in der Region{" "}
              <strong>{plate.region}</strong>. Deutsche Kennzeichen setzen sich
              aus einem Buchstabencode für den Zulassungsbezirk und einer
              alphanumerischen Kombination zusammen.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
