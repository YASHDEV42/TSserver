import express from "express";
import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser, deleteAllUsers } from "./db/queries/users.js";
import { db } from "./db/index.js";
import {
  createChirp,
  getAllChirps,
  getChirpById,
} from "./db/queries/chirps.js";

const app = express();

class BadRequestError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
  }
}

class UnauthorizedError extends Error {
  statusCode = 401;

  constructor(message: string) {
    super(message);
  }
}

class ForbiddenError extends Error {
  statusCode = 403;

  constructor(message: string) {
    super(message);
  }
}

class NotFoundError extends Error {
  statusCode = 404;

  constructor(message: string) {
    super(message);
  }
}

const middlewareLogResponses = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.on("finish", () => {
    const statusCode = res.statusCode;

    if (statusCode >= 400) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
    }
  });

  next();
};

process.loadEnvFile();
const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);
function middlewareMetricsInc(_: Request, __: Response, next: NextFunction) {
  config.fileserverHits++;
  next();
}

app.use(express.json());
app.use(middlewareLogResponses);

app.use("/app", middlewareMetricsInc, express.static("./src/app"));

app.get("/api/healthz", (_: Request, res: Response) => {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("OK");
});

app.get("/admin/metrics", (_: Request, res: Response) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`
    <html>
      <body>
        <h1>Welcome, Chirpy Admin</h1>
        <p>Chirpy has been visited ${config.fileserverHits} times!</p>
      </body>
    </html>
  `);
});

app.post("/admin/reset", async (_: Request, res: Response) => {
  if (config.PLATFORM !== "dev") {
    res.status(403).send("Forbidden");
    return;
  }

  await deleteAllUsers();

  config.fileserverHits = 0;

  res.set("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send("OK");
});

app.post("/api/chirps", async (req: Request, res: Response) => {
  const { body, userId } = req.body;

  if (!body || typeof body !== "string") {
    throw new BadRequestError("Chirp body is required");
  }

  if (!userId || typeof userId !== "string") {
    throw new BadRequestError("User ID is required");
  }

  if (body.length > 140) {
    throw new BadRequestError("Chirp is too long. Max length is 140");
  }

  const profaneWords = ["kerfuffle", "sharbert", "fornax"];

  const cleanedBody = body
    .split(" ")
    .map((word: string) => {
      if (profaneWords.includes(word.toLowerCase())) {
        return "****";
      }

      return word;
    })
    .join(" ");

  const chirp = await createChirp({
    body: cleanedBody,
    userId,
  });

  res.status(201).json(chirp);
});

app.post("/api/users", async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await createUser({
    email,
  });

  res.status(201).json(user);
});
app.get("/api/chirps", async (_req: Request, res: Response) => {
  const chirps = await getAllChirps();

  res.status(200).json(chirps);
});
app.get("/api/chirps/:chirpId", async (req: Request, res: Response) => {
  const { chirpId } = req.params;

  const chirp = await getChirpById(chirpId as string);

  if (!chirp) {
    res.status(404).json({
      error: "Chirp not found",
    });
    return;
  }

  res.status(200).json(chirp);
});

function errorHandler(err: Error, _: Request, res: Response, __: NextFunction) {
  console.log(err);

  if (
    err instanceof BadRequestError ||
    err instanceof UnauthorizedError ||
    err instanceof ForbiddenError ||
    err instanceof NotFoundError
  ) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  res.status(500).json({
    error: "Something went wrong on our end",
  });
}

app.use(errorHandler);

app.listen(8080);
