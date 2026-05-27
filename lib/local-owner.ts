/**
 * Local-owner constants — safe to import from both client and server
 * because this module has zero Node-only dependencies.
 */

export const LOCAL_OWNER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "zc63463@gmail.com",
  app_metadata: {},
  user_metadata: { name: "Owner" },
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
  role: "authenticated",
};

export type User = typeof LOCAL_OWNER;
