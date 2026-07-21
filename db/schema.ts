import {
  pgTable,
  text,
  integer,
  boolean,
  real,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuid } from "drizzle-orm/pg-core";

// === betterAuth Required Tables ===

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("verification_identifier_idx").on(table.identifier)],
);

// === App Tables ===

export const userStats = pgTable("userStats", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: text("userId")
    .notNull()
    .unique()
    .references(() => user.id, {
      onDelete: "cascade",
    }),

  bestWpm: integer("bestWpm").notNull().default(0),
  averageWpm: real("averageWpm").notNull().default(0),
  totalGames: integer("totalGames").notNull().default(0),
  totalWins: integer("totalWins").notNull().default(0),
});

export const matches = pgTable("matches", {
  id: uuid("id").defaultRandom().primaryKey(),

  roomCode: text("roomCode").notNull(),
  difficulty: text("difficulty").notNull(),
  timeLimit: integer("timeLimit").notNull(),
  wordsSeed: text("wordsSeed").notNull(),
  playerCount: integer("playerCount").notNull(),

  startedAt: timestamp("startedAt").notNull(),
  endedAt: timestamp("endedAt"),
});

export const matchResults = pgTable(
  "matchResults",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    matchId: uuid("matchId")
      .notNull()
      .references(() => matches.id, {
        onDelete: "cascade",
      }),

    userId: text("userId")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),

    wpm: integer("wpm").notNull(),
    rawWpm: integer("rawWpm").notNull(),
    accuracy: real("accuracy").notNull(),
    placement: integer("placement").notNull(),
  },
  (table) => ({
    resultIdx: uniqueIndex("matchResult_matchId_userId_idx").on(
      table.matchId,
      table.userId,
    ),
  }),
);

export const friendRequests = pgTable(
  "friendRequests",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    senderId: text("senderId")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),

    receiverId: text("receiverId")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),

    status: text("status").notNull().default("pending"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    requestIdx: uniqueIndex("friendRequest_senderId_receiverId_idx").on(
      table.senderId,
      table.receiverId,
    ),
  }),
);

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userAId: text("userAId")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),

    userBId: text("userBId")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    friendshipIdx: uniqueIndex("friendship_userAId_userBId_idx").on(
      table.userAId,
      table.userBId,
    ),
  }),
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  userStats: one(userStats),

  matchResults: many(matchResults),

  sentRequests: many(friendRequests, {
    relationName: "sender",
  }),

  receivedRequests: many(friendRequests, {
    relationName: "receiver",
  }),
}));
export const friendshipRelations = relations(friendships, ({ one }) => ({
  userA: one(user, {
    fields: [friendships.userAId],
    references: [user.id],
  }),

  userB: one(user, {
    fields: [friendships.userBId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(user, {
    fields: [userStats.userId],
    references: [user.id],
  }),
}));

export const matchRelations = relations(matches, ({ many }) => ({
  results: many(matchResults),
}));

export const matchResultRelations = relations(matchResults, ({ one }) => ({
  match: one(matches, {
    fields: [matchResults.matchId],
    references: [matches.id],
  }),
  user: one(user, {
    fields: [matchResults.userId],
    references: [user.id],
  }),
}));

export const friendRequestRelations = relations(friendRequests, ({ one }) => ({
  sender: one(user, {
    fields: [friendRequests.senderId],
    references: [user.id],
    relationName: "sender",
  }),
  receiver: one(user, {
    fields: [friendRequests.receiverId],
    references: [user.id],
    relationName: "receiver",
  }),
}));
