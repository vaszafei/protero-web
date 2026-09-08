/**
 * Stoiximan DFS club code → local `teams.id`.
 *
 * The Stoiximan slate CSV names a club by its short code (BVB, LOSC, AEK…),
 * which is not a teams.id. This map is the one place the code resolves — the
 * same dictionary `protero-tools/bin/map-fantasy-players.js` and
 * `ml/fantasy/slate.py::CLUB` carry, so the console and the optimiser agree
 * on which club a player belongs to. Keyed on the code, never on a name.
 */
export const FANTASY_CLUB: Record<string, number> = {
  // Champions League (satellite)
  BET: 278,   // Betis
  BVB: 509,   // Borussia Dortmund
  FCP: 311,   // FC Porto
  GAL: 157,   // Galatasaray
  INT: 79,    // Inter
  LOSC: 103,  // Lille
  MCI: 22,    // Manchester City
  RMA: 42,    // Real Madrid
  VIL: 43,    // Villarreal
  // Greek Super League (freeroll)
  AEK: 276,   // AEK Athens
  ARI: 277,   // Aris Thessaloniki
  AST: 425,   // Asteras Tripolis
  KIF: 433,   // Kifisia
  KLM: 1354,  // Kalamata
  LEV: 422,   // Levadiakos
  PAN: 430,   // Panetolikos
  PAO: 424,   // Panathinaikos
  PAOK: 418,  // PAOK
  VOL: 420,   // Volos NFC
}

export function fantasyClubTeamId(clubCode: string | null | undefined): number | null {
  if (!clubCode) return null
  return FANTASY_CLUB[clubCode] ?? null
}
