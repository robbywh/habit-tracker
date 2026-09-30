// Local id generation for habits. No backend, so ids never need to be
// globally unique beyond this device's storage — a RFC4122-shaped v4 id
// generated from Math.random is sufficient and avoids depending on a
// runtime `crypto.randomUUID` implementation that may be unavailable on
// Hermes.

export function generateHabitId(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, (placeholder) => {
    if (placeholder === 'y') {
      const value = (Math.floor(Math.random() * 16) & 0x3) | 0x8;
      return value.toString(16);
    }
    return hex();
  });
}
