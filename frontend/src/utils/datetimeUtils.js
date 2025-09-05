export function getEasternISO() {
  const date = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
  });

  const parts = formatter.formatToParts(date)
      .reduce((acc, part) => {
          if (part.type !== 'literal') acc[part.type] = part.value;
          return acc;
      }, {});

  const pad = (n, z = 3) => String(n).padStart(z, '0');
  const millis = pad(date.getMilliseconds());

  // Build clean date string from known components
  const easternString = `${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
  const tempDate = new Date(easternString + " UTC");

  const utcTimestamp = date.getTime();
  const easternTimestamp = tempDate.getTime();
  const offsetMinutes = Math.round((easternTimestamp - utcTimestamp) / (60 * 1000));

  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const offsetMins = String(absOffset % 60).padStart(2, '0');

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${millis}${offsetSign}${offsetHours}:${offsetMins}`;
}
