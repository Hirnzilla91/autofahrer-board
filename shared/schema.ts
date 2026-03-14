import { pgTable, text, varchar, integer, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// German license plate format: 1-3 letter city code, 1-2 letters, 1-4 digits
// Examples: HH AB 1234, B CD 567, M X 1
const GERMAN_PLATE_REGEX = /^[A-ZÄÖÜ]{1,3}\s[A-Z]{1,2}\s\d{1,4}$/;

// Valid German city/district codes (comprehensive list)
const VALID_CITY_CODES = new Set([
  // Major cities
  "B", "HH", "M", "K", "F", "S", "D", "DO", "E", "HB", "H", "N", "DD", "L", "KS",
  // A
  "A", "AA", "AB", "ABG", "ABI", "AC", "AIC", "AK", "ALF", "ALZ", "AM", "AN", "ANA", "ANG",
  "ANK", "AP", "APD", "ARN", "ART", "AS", "ASD", "ASL", "ASZ", "AT", "AU", "AUR", "AW", "AZ", "AZE",
  // B
  "BA", "BAD", "BAR", "BB", "BC", "BCH", "BD", "BED", "BER", "BF", "BGD", "BGL", "BH",
  "BI", "BIN", "BIR", "BIT", "BIW", "BK", "BKS", "BL", "BLB", "BLK", "BM", "BN", "BNA",
  "BO", "BOR", "BOT", "BR", "BRB", "BRG", "BRK", "BRL", "BS", "BT", "BTF", "BU", "BUL",
  "BW", "BWL", "BYL", "BZ",
  // C
  "C", "CA", "CAS", "CB", "CE", "CHA", "CLP", "CLZ", "CO", "COC", "COE", "CUX", "CW",
  // D
  "DA", "DAH", "DAN", "DAU", "DB", "DBR", "DE", "DEG", "DEL", "DGF", "DH", "DI",
  "DIN", "DIZ", "DKB", "DL", "DLG", "DM", "DN", "DON", "DU", "DUD", "DW", "DZ",
  // E
  "EA", "EB", "EBE", "EBN", "EBS", "ECK", "ED", "EE", "EF", "EG", "EI", "EIC",
  "EIL", "EIN", "EIS", "EL", "EM", "EMD", "EMS", "EN", "ER", "ERB", "ERH", "ERK",
  "ERZ", "ES", "ESB", "ESW", "EU", "EW",
  // F
  "FB", "FD", "FDB", "FDS", "FEU", "FF", "FFB", "FG", "FI", "FKB", "FL", "FLO",
  "FN", "FO", "FOR", "FR", "FRE", "FRG", "FRI", "FRW", "FS", "FT", "FTL", "FU", "FW",
  // G
  "GA", "GAN", "GAP", "GC", "GD", "GDB", "GE", "GEL", "GEM", "GER", "GF", "GG",
  "GHA", "GHC", "GI", "GK", "GL", "GLA", "GM", "GMN", "GN", "GNT", "GO", "GOA",
  "GOH", "GP", "GR", "GRA", "GRH", "GRI", "GRM", "GRZ", "GS", "GT", "GTH", "GU",
  "GUB", "GUN", "GV", "GW", "GZ",
  // H
  "HA", "HAB", "HAL", "HAM", "HAS", "HBN", "HBS", "HC", "HD", "HDH", "HDL", "HE",
  "HEB", "HEF", "HEI", "HER", "HET", "HF", "HG", "HGN", "HGW", "HI", "HIG", "HIP",
  "HK", "HL", "HM", "HMU", "HN", "HO", "HOG", "HOH", "HOL", "HOM", "HOR", "HOT",
  "HP", "HR", "HRO", "HS", "HSK", "HST", "HU", "HV", "HVL", "HWI", "HX", "HY", "HZ",
  // I
  "IGB", "IK", "IL", "IN", "IZ",
  // J
  "J", "JE", "JL",
  // K
  "KA", "KB", "KC", "KE", "KEH", "KEL", "KEM", "KF", "KG", "KH", "KI", "KIB",
  "KL", "KLE", "KLZ", "KM", "KN", "KO", "KOT", "KR", "KRU", "KT", "KU", "KUN", "KUS", "KW", "KY", "KYF",
  // L
  "LA", "LB", "LC", "LD", "LDK", "LDS", "LEO", "LER", "LEV", "LG", "LI", "LIB",
  "LIF", "LIP", "LL", "LM", "LN", "LO", "LOB", "LOS", "LP", "LR", "LU", "LWL",
  // M
  "MA", "MAB", "MAI", "MAK", "MAL", "MB", "MC", "MD", "ME", "MEI", "MEK", "MET",
  "MG", "MGH", "MGN", "MH", "MHL", "MI", "MIL", "MK", "MKK", "ML", "MM", "MN",
  "MO", "MOD", "MOL", "MON", "MOS", "MR", "MS", "MSE", "MSH", "MSP", "MST", "MTK",
  "MTL", "MU", "MUE", "MUR", "MW", "MY", "MYK", "MZ", "MZG",
  // N
  "NAB", "NAI", "NAU", "NB", "ND", "NDH", "NE", "NEA", "NEB", "NEC", "NEN", "NES",
  "NEW", "NF", "NH", "NI", "NK", "NM", "NMS", "NMB", "NOH", "NOL", "NOM", "NOR",
  "NP", "NR", "NRW", "NU", "NVP", "NW", "NWM", "NY", "NZ",
  // O
  "OA", "OAL", "OB", "OBG", "OC", "OCH", "OD", "OE", "OF", "OG", "OH", "OHA",
  "OHV", "OHZ", "OK", "OL", "OP", "OR", "OS", "OSL", "OVL", "OVP", "OZ",
  // P
  "P", "PA", "PAF", "PAN", "PB", "PCH", "PE", "PEG", "PF", "PI", "PIR", "PK",
  "PL", "PLO", "PM", "PN", "PR", "PRU", "PS", "PW",
  // Q
  "QFT",
  // R
  "RA", "RD", "RE", "REG", "REH", "REI", "RG", "RH", "RI", "RID", "RIE", "RL",
  "RM", "RN", "RO", "ROD", "ROF", "ROK", "ROL", "ROS", "ROT", "ROW", "RP", "RS",
  "RSL", "RT", "RU", "RUD", "RV", "RW", "RZ",
  // S
  "SAB", "SAD", "SAL", "SAN", "SAW", "SB", "SBG", "SBK", "SC", "SCZ", "SDH", "SDL",
  "SDT", "SE", "SEB", "SEE", "SEF", "SEL", "SFB", "SFT", "SG", "SGH", "SHA", "SHG",
  "SHK", "SHL", "SI", "SIG", "SIM", "SK", "SL", "SLE", "SLF", "SLK", "SLN", "SLS",
  "SLZ", "SM", "SN", "SO", "SOB", "SOG", "SOK", "SOM", "SON", "SP", "SPB", "SPN",
  "SR", "SRB", "SRO", "ST", "STA", "STB", "STD", "STE", "STL", "STO", "SU", "SUL",
  "SUM", "SUN", "SW", "SWA", "SZ", "SZB",
  // T
  "TE", "TF", "TG", "THL", "THW", "TIR", "TO", "TOL", "TP", "TR", "TS", "TST",
  "TU", "TUT",
  // U
  "UE", "UEM", "UFF", "UH", "UL", "UM", "UN", "UNA",
  // V
  "V", "VAI", "VB", "VEC", "VER", "VG", "VIB", "VIE", "VK", "VOH", "VR", "VS",
  // W
  "W", "WA", "WAF", "WAK", "WAN", "WAR", "WB", "WDA", "WE", "WEL", "WEN", "WER",
  "WES", "WF", "WI", "WIL", "WIS", "WIT", "WK", "WL", "WLG", "WM", "WMS", "WN",
  "WND", "WO", "WOB", "WOH", "WOL", "WOR", "WOS", "WR", "WRN", "WS", "WSF", "WST",
  "WSW", "WT", "WTL", "WTM", "WU", "WUG", "WUN", "WUR", "WW", "WZ", "WZL",
  // Z
  "Z", "ZE", "ZI", "ZIG", "ZP", "ZR", "ZW", "ZZ",
  // Ö, Ü
  "ÖHR",
]);

export const plates = pgTable("plates", {
  id: serial("id").primaryKey(),
  plate: varchar("plate", { length: 15 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  plateId: integer("plate_id").notNull(),
  username: varchar("username", { length: 30 }).notNull(),
  text: varchar("text", { length: 120 }).notNull(),
  grade: integer("grade").notNull(), // 1-6
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlateSchema = createInsertSchema(plates).pick({
  plate: true,
}).extend({
  plate: z.string()
    .min(4, "Kennzeichen ist zu kurz")
    .max(15, "Kennzeichen ist zu lang")
    .transform(val => val.toUpperCase().trim())
    .refine(val => GERMAN_PLATE_REGEX.test(val), {
      message: "Ungültiges deutsches Kennzeichen-Format (z.B. HH AB 1234)"
    })
    .refine(val => {
      const cityCode = val.split(" ")[0];
      return VALID_CITY_CODES.has(cityCode);
    }, {
      message: "Unbekanntes Unterscheidungszeichen (Stadtcode)"
    }),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  plateId: true,
  username: true,
  text: true,
  grade: true,
}).extend({
  username: z.string()
    .min(2, "Benutzername muss mind. 2 Zeichen haben")
    .max(30, "Benutzername darf max. 30 Zeichen haben")
    .regex(/^[a-zA-Z0-9_\-äöüÄÖÜß]+$/, "Nur Buchstaben, Zahlen, _ und - erlaubt"),
  text: z.string()
    .min(3, "Kommentar muss mind. 3 Zeichen haben")
    .max(120, "Kommentar darf max. 120 Zeichen haben"),
  grade: z.number().int().min(1).max(6),
});

export type InsertPlate = z.infer<typeof insertPlateSchema>;
export type Plate = typeof plates.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export { GERMAN_PLATE_REGEX, VALID_CITY_CODES };
