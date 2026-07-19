const DEFAULT_SOCKET_SERVER_URL = 'http://localhost:4000';

export function getAdminBridgeSecret(): string {
  return process.env.ADMIN_API_KEY || process.env.NEXTAUTH_SECRET || '';
}

export function getSocketServerAdminUrl(): string {
  return (
    process.env.SOCKET_SERVER_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    DEFAULT_SOCKET_SERVER_URL
  );
}
