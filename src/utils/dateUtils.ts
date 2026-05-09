export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMins < 1) return 'الآن';
  if (diffInMins < 60) return `منذ ${diffInMins} دقيقة`;
  if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
  if (diffInDays === 1) return 'أمس';
  if (diffInDays === 2) return 'أول أمس';
  if (diffInDays < 7) return `منذ ${diffInDays} أيام`;
  
  return date.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatMessageTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
};
