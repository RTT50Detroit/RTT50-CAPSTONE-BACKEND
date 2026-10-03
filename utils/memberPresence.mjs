const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000;

export const withPresenceStatus = (member) => {
  const lastSeen = member.lastSeen ? new Date(member.lastSeen).getTime() : 0;
  const isOnline = member.isOnline === true &&
    Date.now() - lastSeen <= PRESENCE_TIMEOUT_MS;

  return { ...member, isOnline };
};
