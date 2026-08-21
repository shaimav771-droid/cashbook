export const getPeriodDates = (periodVal, customStart = '', customEnd = '') => {
  const today = new Date();
  let startDate = '';
  let endDate = today.toISOString().split('T')[0];

  switch (periodVal) {
    case 'today':
      startDate = endDate;
      break;
    case 'this_week': {
      const startOfWeek = new Date(today);
      const day = today.getDay();
      startOfWeek.setDate(today.getDate() - day); // Sunday as start of week
      startDate = startOfWeek.toISOString().split('T')[0];
      break;
    }
    case 'this_month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = startOfMonth.toISOString().split('T')[0];
      break;
    }
    case 'custom':
      startDate = customStart;
      endDate = customEnd;
      break;
    case 'all':
    default:
      startDate = '';
      endDate = '';
      break;
  }
  return { startDate, endDate };
};

export const getPeriodLabel = (periodVal, customStart = '', customEnd = '') => {
  switch (periodVal) {
    case 'today': return 'Today';
    case 'this_week': return 'This Week';
    case 'this_month': return 'This Month';
    case 'all': return 'All Time';
    case 'custom': {
      if (customStart && customEnd) {
        const formatDateLabel = (str) => {
          const parts = str.split('-');
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };
        return `${formatDateLabel(customStart)} - ${formatDateLabel(customEnd)}`;
      }
      return 'Custom Range';
    }
    default: return 'This Month';
  }
};
