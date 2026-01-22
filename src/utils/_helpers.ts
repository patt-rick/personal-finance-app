

export const getTimeAgo = (dateStr: string | undefined) => {
  if (!dateStr) return 'just now';
  const now = new Date();
  const past = new Date(dateStr);
  if (isNaN(past.getTime())) return 'just now';
  
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return past.toLocaleDateString();
};

export const getCurrencySymbol = (code: string | undefined) => {
    switch (code) {
        case 'GHS': return '₵';
        case 'EUR': return '€';
        case 'GBP': return '£';
        default: return '$';
    }
}
