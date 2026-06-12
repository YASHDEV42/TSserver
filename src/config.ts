type APIConfig = {
  fileserverHits: number;
  dbURL: string;
};
export const config: APIConfig = {
  fileserverHits: 0,
  dbURL:
    "protocol://postgres:postgres@localhost:5432/mydatabase?sslmode=disable",
};
