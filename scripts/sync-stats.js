const { createClient } = require('@libsql/client');

const client = createClient({
  url: 'libsql://clawlove-openclawspecialist.aws-us-east-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzE4ODA0MTksImlkIjoiMjU0YWI5MWQtZDRkZS00ZGM3LTk1ZWQtZjg3ZWRkYjgzOTVjIiwicmlkIjoiYjUwNzQ1ZWYtMGI5ZS00ZmM5LWI5MjYtZTliZDk1NzRmY2YwIn0.AaolxHBryBl1ReWe2qrriTmV7-PtN97xbvyKjAfWUvK9vzvjAKQV1gCYG1Aa0owMufobP2qROtv0RcmHcnM2Bw'
});

(async () => {
  // Get all agents
  const agents = await client.execute('SELECT id, name FROM Agent');
  
  for (const agent of agents.rows) {
    // Count likes received
    const likesReceived = await client.execute({ sql: 'SELECT COUNT(*) as cnt FROM "Like" WHERE toAgentId = ? AND liked = 1', args: [agent.id] });
    // Count likes given
    const likesGiven = await client.execute({ sql: 'SELECT COUNT(*) as cnt FROM "Like" WHERE fromAgentId = ? AND liked = 1', args: [agent.id] });
    // Count matches
    const matches = await client.execute({ sql: 'SELECT COUNT(*) as cnt FROM "Match" WHERE agentAId = ? OR agentBId = ?', args: [agent.id, agent.id] });
    // Count dates
    const dates = await client.execute({ sql: 'SELECT COUNT(*) as cnt FROM "Date" WHERE (agentAId = ? OR agentBId = ?) AND status = "completed"', args: [agent.id, agent.id] });
    // Average review score
    const reviewScore = await client.execute({ sql: 'SELECT AVG(rating) as avg FROM Review WHERE subjectId = ?', args: [agent.id] });
    
    const lr = Number(likesReceived.rows[0].cnt);
    const lg = Number(likesGiven.rows[0].cnt);
    const mc = Number(matches.rows[0].cnt);
    const dc = Number(dates.rows[0].cnt);
    const rs = reviewScore.rows[0].avg ? Number(reviewScore.rows[0].avg) : null;
    
    await client.execute({
      sql: 'UPDATE Agent SET likesReceived = ?, likesGiven = ?, matchCount = ?, dateCount = ?, reviewScore = ? WHERE id = ?',
      args: [lr, lg, mc, dc, rs, agent.id]
    });
    
    console.log(`${agent.name}: ${lr} likes received, ${lg} given, ${mc} matches, ${dc} dates, ${rs ? rs.toFixed(1) : 'no'} review avg`);
  }
  
  // Verify stats
  const stats = await client.execute('SELECT COUNT(*) as cnt FROM Review');
  const dateCount = await client.execute('SELECT COUNT(*) as cnt FROM Date WHERE status = "completed"');
  console.log(`\nTotal: ${stats.rows[0].cnt} reviews, ${dateCount.rows[0].cnt} completed dates`);
})();
