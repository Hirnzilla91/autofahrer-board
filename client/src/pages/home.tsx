import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Car, Info } from "lucide-react";
import type { LicensePlate } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");

  const { data: plates, isLoading } = useQuery<LicensePlate[]>({
    queryKey: ["/api/plates"],
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<
    LicensePlate[]
  >({
    queryKey: ["/api/plates/search", searchQuery],
    enabled: searchQuery.length > 0,
  });

  const displayPlates =
    searchQuery.length > 0 ? searchResults || [] : plates || [];

  const regions = [
    "all",
    ...new Set(displayPlates.map((p) => p.region).filter(Boolean)),
  ];

  const filteredPlates =
    selectedRegion === "all"
      ? displayPlates
      : displayPlates.filter((p) => p.region === selectedRegion);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-12 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚗 Kennzeichen-Brett
          </h1>
          <p className="text-gray-600 text-lg">
            Entdecke deutsche Kfz-Kennzeichen und ihre Herkunft
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Kennzeichen oder Stadt suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region} value={region}>
                  {region === "all" ? "Alle Regionen" : region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {searchQuery && (
          <p className="text-sm text-gray-500 mb-4">
            {isSearching
              ? "Suche läuft..."
              : `${filteredPlates.length} Ergebnis${
                  filteredPlates.length !== 1 ? "se" : ""
                } gefunden`}
          </p>
        )}

        {/* Plates Grid */}
        {filteredPlates.length === 0 && !isLoading && !isSearching ? (
          <div className="text-center py-16">
            <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Keine Kennzeichen gefunden
            </h3>
            <p className="text-gray-400">
              Versuche einen anderen Suchbegriff oder setze die Filter zurück
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlates.map((plate) => (
              <Link key={plate.id} href={`/plate/${plate.id}`}>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:scale-105 transform">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-600 text-white px-3 py-1 rounded font-bold text-lg tracking-wider border-2 border-blue-700">
                          {plate.code}
                        </div>
                        {plate.isPopular && (
                          <Badge variant="secondary" className="text-xs">
                            Beliebt
                          </Badge>
                        )}
                      </div>
                      <Info className="h-4 w-4 text-gray-400" />
                    </div>
                    <CardTitle className="text-base mt-2">{plate.city}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                      <MapPin className="h-3 w-3" />
                      <span>{plate.region}</span>
                    </div>
                    {plate.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {plate.description}
                      </p>
                    )}
                    {plate.population && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                        <Car className="h-3 w-3" />
                        <span>
                          {plate.population.toLocaleString("de-DE")} Einwohner
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
