export function reminderDate(deadline:string,daysBefore=7){const d=new Date(deadline+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-daysBefore);return d.toISOString()}
export function shouldSendDeadlineReminder(deadline:string,now=new Date(),daysBefore=7){const at=new Date(reminderDate(deadline,daysBefore));const end=new Date(deadline+'T23:59:59Z');return now>=at&&now<=end}
