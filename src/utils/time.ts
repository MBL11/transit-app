export function formatTime(date: Date): string {
  // Retourne "HH:MM"
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin <= 0) return 'Maintenant';
  if (diffMin < 60) return `dans ${diffMin} min`;

  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) return `dans ${hours}h`;
  return `dans ${hours}h${mins}`;
}
