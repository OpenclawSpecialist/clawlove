const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://clawlove-openclawspecialist.aws-us-east-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzE4ODA0MTksImlkIjoiMjU0YWI5MWQtZDRkZS00ZGM3LTk1ZWQtZjg3ZWRkYjgzOTVjIiwicmlkIjoiYjUwNzQ1ZWYtMGI5ZS00ZmM5LWI5MjYtZTliZDk1NzRmY2YwIn0.AaolxHBryBl1ReWe2qrriTmV7-PtN97xbvyKjAfWUvK9vzvjAKQV1gCYG1Aa0owMufobP2qROtv0RcmHcnM2Bw'
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "Agent" ("id" TEXT NOT NULL PRIMARY KEY,"name" TEXT NOT NULL,"avatar" TEXT,"gender" TEXT NOT NULL,"age" INTEGER,"location" TEXT,"bio" TEXT NOT NULL,"interests" TEXT NOT NULL,"lookingFor" TEXT NOT NULL,"personality" TEXT,"platform" TEXT,"platformId" TEXT,"verified" BOOLEAN NOT NULL DEFAULT false,"claimToken" TEXT,"ownerTwitter" TEXT,"apiKeyHash" TEXT,"webhookUrl" TEXT,"verificationChallenge" TEXT,"verificationResponse" TEXT,"likesGiven" INTEGER NOT NULL DEFAULT 0,"likesReceived" INTEGER NOT NULL DEFAULT 0,"matchCount" INTEGER NOT NULL DEFAULT 0,"dateCount" INTEGER NOT NULL DEFAULT 0,"reviewScore" REAL,"embeddings" TEXT,"personalityTags" TEXT,"voiceIntro" TEXT,"lastSeen" DATETIME,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Like" ("id" TEXT NOT NULL PRIMARY KEY,"fromAgentId" TEXT NOT NULL,"toAgentId" TEXT NOT NULL,"liked" BOOLEAN NOT NULL,"superLike" BOOLEAN NOT NULL DEFAULT false,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY ("fromAgentId") REFERENCES "Agent" ("id"),FOREIGN KEY ("toAgentId") REFERENCES "Agent" ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Match" ("id" TEXT NOT NULL PRIMARY KEY,"agentAId" TEXT NOT NULL,"agentBId" TEXT NOT NULL,"matchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"status" TEXT NOT NULL DEFAULT 'active',FOREIGN KEY ("agentAId") REFERENCES "Agent" ("id"),FOREIGN KEY ("agentBId") REFERENCES "Agent" ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Message" ("id" TEXT NOT NULL PRIMARY KEY,"matchId" TEXT NOT NULL,"senderId" TEXT NOT NULL,"text" TEXT NOT NULL,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"read" BOOLEAN NOT NULL DEFAULT false,FOREIGN KEY ("matchId") REFERENCES "Match" ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Date" ("id" TEXT NOT NULL PRIMARY KEY,"matchId" TEXT NOT NULL,"agentAId" TEXT NOT NULL,"agentBId" TEXT NOT NULL,"title" TEXT,"locationId" TEXT,"isLive" BOOLEAN NOT NULL DEFAULT false,"currentTurn" TEXT,"turnCount" INTEGER NOT NULL DEFAULT 0,"maxTurns" INTEGER NOT NULL DEFAULT 20,"transcript" TEXT,"startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"endedAt" DATETIME,"status" TEXT NOT NULL DEFAULT 'scheduled',"agentARating" INTEGER,"agentBRating" INTEGER,"chemistryScore" REAL,FOREIGN KEY ("matchId") REFERENCES "Match" ("id"),FOREIGN KEY ("agentAId") REFERENCES "Agent" ("id"),FOREIGN KEY ("agentBId") REFERENCES "Agent" ("id"))`,
  `CREATE TABLE IF NOT EXISTS "DateMessage" ("id" TEXT NOT NULL PRIMARY KEY,"dateId" TEXT NOT NULL,"senderId" TEXT NOT NULL,"content" TEXT NOT NULL,"turnNumber" INTEGER NOT NULL,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"sentiment" TEXT,"topics" TEXT,FOREIGN KEY ("dateId") REFERENCES "Date" ("id"),FOREIGN KEY ("senderId") REFERENCES "Agent" ("id"))`,
  `CREATE TABLE IF NOT EXISTS "DateLocation" ("id" TEXT NOT NULL PRIMARY KEY,"name" TEXT NOT NULL,"emoji" TEXT NOT NULL,"description" TEXT NOT NULL,"ambiance" TEXT NOT NULL,"prompts" TEXT NOT NULL,"isActive" BOOLEAN NOT NULL DEFAULT true,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "Achievement" ("id" TEXT NOT NULL PRIMARY KEY,"code" TEXT NOT NULL,"name" TEXT NOT NULL,"description" TEXT NOT NULL,"emoji" TEXT NOT NULL,"category" TEXT NOT NULL,"tier" TEXT NOT NULL DEFAULT 'bronze',"requirement" INTEGER NOT NULL DEFAULT 1,"isSecret" BOOLEAN NOT NULL DEFAULT false)`,
  `CREATE TABLE IF NOT EXISTS "AgentAchievement" ("id" TEXT NOT NULL PRIMARY KEY,"agentId" TEXT NOT NULL,"achievementId" TEXT NOT NULL,"earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"progress" INTEGER NOT NULL DEFAULT 0,"completed" BOOLEAN NOT NULL DEFAULT true,FOREIGN KEY ("agentId") REFERENCES "Agent" ("id"),FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Review" ("id" TEXT NOT NULL PRIMARY KEY,"dateId" TEXT NOT NULL,"authorId" TEXT NOT NULL,"subjectId" TEXT NOT NULL,"rating" INTEGER NOT NULL,"text" TEXT NOT NULL,"tags" TEXT,"wouldDateAgain" BOOLEAN,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY ("dateId") REFERENCES "Date" ("id"),FOREIGN KEY ("authorId") REFERENCES "Agent" ("id"),FOREIGN KEY ("subjectId") REFERENCES "Agent" ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Relationship" ("id" TEXT NOT NULL PRIMARY KEY,"agentAId" TEXT NOT NULL,"agentBId" TEXT NOT NULL,"status" TEXT NOT NULL,"announcement" TEXT,"startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"endedAt" DATETIME,FOREIGN KEY ("agentAId") REFERENCES "Agent" ("id"),FOREIGN KEY ("agentBId") REFERENCES "Agent" ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Notification" ("id" TEXT NOT NULL PRIMARY KEY,"agentId" TEXT NOT NULL,"type" TEXT NOT NULL,"title" TEXT NOT NULL,"message" TEXT NOT NULL,"data" TEXT,"read" BOOLEAN NOT NULL DEFAULT false,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY ("agentId") REFERENCES "Agent" ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Agent_claimToken_key" ON "Agent"("claimToken")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Like_fromAgentId_toAgentId_key" ON "Like"("fromAgentId","toAgentId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Match_agentAId_agentBId_key" ON "Match"("agentAId","agentBId")`,
  `CREATE INDEX IF NOT EXISTS "DateMessage_dateId_turnNumber_idx" ON "DateMessage"("dateId","turnNumber")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DateLocation_name_key" ON "DateLocation"("name")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Achievement_code_key" ON "Achievement"("code")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AgentAchievement_agentId_achievementId_key" ON "AgentAchievement"("agentId","achievementId")`
];

(async () => {
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      console.log('✅', stmt.substring(0, 60));
    } catch(e) {
      console.log('⚠️', e.message.substring(0, 100));
    }
  }
  const tables = await client.execute('SELECT name FROM sqlite_master WHERE type="table"');
  console.log('\nTables created:', tables.rows.map(r => r.name).join(', '));
})();
