const POISHA_PER_TAKA = 100;

export function toPoisha(taka: number): number {
  return Math.round(taka * POISHA_PER_TAKA);
}

export function toTaka(poisha: number): number {
  return poisha / POISHA_PER_TAKA;
}

export function formatBdt(poisha: number): string {
  const taka = toTaka(poisha);
  return `৳${taka.toLocaleString("en-BD", {
    minimumFractionDigits: poisha % POISHA_PER_TAKA === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function mulMoneyHalfUp(poisha: number, multiplier: number): number {
  return Math.round(poisha * multiplier);
}

export function pctOfHalfUp(poisha: number, pct: number): number {
  return Math.round((poisha * pct) / POISHA_PER_TAKA);
}
