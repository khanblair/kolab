export type ApiKey = {
  id: string;
  name: string | null;
  start: string;
  createdAt: number;
  expiresAt: number | null;
};

export type CreateApiKeyClientRequest = {
  name: string;
  expiresIn: number | null;
};

export type CreateApiKeyResponse = ApiKey & { key: string };
