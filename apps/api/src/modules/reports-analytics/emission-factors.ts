// Illustrative factors (kg CO2e avoided per kg of material diverted from
// landfill into recycling/reuse) used only by the demo reports. They are
// rounded orders of magnitude from public literature, not a certified
// methodology, and the UI labels them as estimates.
export const EMISSION_FACTORS: Record<string, number> = {
  plastico: 1.5,
  metais: 4,
  'papel-papelao': 0.9,
  vidro: 0.3,
  madeira: 0.4,
  borracha: 0.6,
  organicos: 0.25,
  texteis: 2,
  eletroeletronicos: 1.8,
  'construcao-demolicao': 0.02,
  quimicos: 0.5,
  'oleo-usado': 2.5,
  'sucata-geral': 1.2,
  'residuos-perigosos': 0.5,
  outros: 0.3,
};

const MASS_UNITS: Record<string, number> = {
  kg: 1,
  kgs: 1,
  quilo: 1,
  quilos: 1,
  t: 1000,
  ton: 1000,
  tonelada: 1000,
  toneladas: 1000,
  g: 0.001,
};

/** Converts a quantity to kg when the unit is a mass unit; otherwise null. */
export function toKilograms(quantity: number, unit: string) {
  const factor = MASS_UNITS[unit.trim().toLowerCase()];
  return factor === undefined ? null : quantity * factor;
}

export function emissionFactor(categorySlug: string) {
  return EMISSION_FACTORS[categorySlug] ?? EMISSION_FACTORS.outros;
}
