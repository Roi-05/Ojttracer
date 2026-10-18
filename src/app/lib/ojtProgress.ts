export function ojtHoursComplete(completedHours: number, requiredHours: number) {
  const done = Number(completedHours) || 0;
  const need = Number(requiredHours) || 0;
  return need > 0 && done >= need;
}

export function hoursProgressPct(completedHours: number, requiredHours: number) {
  const need = Number(requiredHours) || 0;
  if (need <= 0) return 0;
  return Math.min(100, Math.round((Number(completedHours) / need) * 100));
}
