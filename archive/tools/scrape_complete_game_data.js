const { createClient } = require('@libsql/client')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

// Use puppeteer-extra with stealth plugin
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  intMode: 'number'
})

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  season: null,
  league: null,
  date: null
}

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--season' && args[i + 1]) {
    options.season = args[i + 1]
    i++
  } else if (args[i] === '--league' && args[i + 1]) {
    options.league = args[i + 1]
    i++
  } else if (args[i] === '--date' && args[i + 1]) {
    options.date = args[i + 1]
    i++
  }
}

async function scrapeCompleteGameData() {
  try {
    // Build WHERE clause based on filters
    let whereFilters = [
      'flashscore_url IS NOT NULL',
      'flashscore_url != \'\''
    ]
    let queryArgs = []
    
    if (options.season) {
      whereFilters.push('season = ?')
      queryArgs.push(options.season)
    }
    
    if (options.league) {
      whereFilters.push('league_key = ?')
      queryArgs.push(options.league)
    }
    
    if (options.date) {
      whereFilters.push('DATE(date) = ?')
      queryArgs.push(options.date)
    }
    
    console.log('🎯 Scraping parameters:')
    if (options.season) console.log(`   Season: ${options.season}`)
    if (options.league) console.log(`   League: ${options.league}`)
    if (options.date) console.log(`   Date: ${options.date}`)
    if (!options.season && !options.league && !options.date) console.log('   All leagues and seasons')
    console.log()
    
    // Get all games with URLs and check what data is missing
    const games = await db.execute({
      sql: `
        SELECT 
          id, 
          flashscore_url, 
          home_goals, 
          away_goals,
          referee_id,
          match_events,
          home_formation,
          home_shots,
          home_corners,
          home_fouls,
          home_yellow_cards,
          odds_home,
          league_key,
          season
        FROM games 
        WHERE ${whereFilters.join(' AND ')}
        ORDER BY id DESC
      `,
      args: queryArgs
    })
    
    if (games.rows.length === 0) {
      console.log('❌ No games with URLs found!')
      process.exit(1)
    }
    
    // Filter games that need any data
    const gamesToScrape = games.rows.filter(g => {
      const needsOdds = !g.odds_home;
      const needsFormation = !g.home_formation;
      const hasScore = g.home_goals !== null && g.away_goals !== null;
      
      // For unplayed games: try lineups, formations, odds
      if (!hasScore) {
        return needsFormation || needsOdds;
      }
      
      // For played games: check all data including game stats
      const needsGameStats = (g.home_corners === null || g.home_corners === 0) || 
                            (g.home_fouls === null || g.home_fouls === 0) ||
                            (g.home_yellow_cards === null || g.home_yellow_cards === 0);
      return !g.referee_id || !g.match_events || needsFormation || needsOdds || needsGameStats;
    });
    
    if (gamesToScrape.length === 0) {
      console.log('✅ All games already have complete data!')
      process.exit(0)
    }

    
    console.log(`📊 Stats:`)
    console.log(`   Total games with URLs: ${games.rows.length}`)
    console.log(`   Already complete: ${games.rows.length - gamesToScrape.length}`)
    console.log(`   Need scraping: ${gamesToScrape.length}`)
    console.log(`   Concurrent workers: 5`)
    console.log(`   Estimated time: ~${Math.ceil(gamesToScrape.length * 0.3 / 5)} minutes (${Math.ceil(gamesToScrape.length * 0.3)} min sequential)`)
    
    // Show breakdown by league if not filtering
    if (!options.league) {
      const leagueCounts = {}
      gamesToScrape.forEach(g => {
        leagueCounts[g.league_key] = (leagueCounts[g.league_key] || 0) + 1
      })
      console.log('\n📋 Games per league:')
      Object.entries(leagueCounts).sort((a, b) => b[1] - a[1]).forEach(([league, count]) => {
        console.log(`   ${league}: ${count} games`)
      })
    }
    console.log()
    
    const browser = await puppeteer.launch({ 
      headless: true, 
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    })
    
    let successful = 0
    let failed = 0
    let processed = 0
    
    // Parallel processing with concurrency limit
    const CONCURRENCY = 5 // Process 5 games at once
    const processGame = async (game, gameIndex) => {
      let page = null
      try {
          // Check what this game needs by examining database
          let needsReferee = !game.referee_id
          let needsEvents = !game.match_events
          let needsFormation = !game.home_formation
          const needsOdds = !game.odds_home // Check if odds are missing
          
          // Check if we already have lineups and player stats
          const lineupsCheck = await db.execute({
            sql: `SELECT 
                    COUNT(*) as total_players,
                    COUNT(rating) as players_with_rating,
                    COUNT(xg) as players_with_xg,
                    COUNT(CASE WHEN position IS NOT NULL AND position != '' THEN 1 END) as players_with_position
                  FROM lineups WHERE game_id = ?`,
            args: [game.id]
          })
          let needsLineups = lineupsCheck.rows[0].total_players === 0
          let needsPlayerStats = lineupsCheck.rows[0].players_with_rating === 0
          let needsPlayerPositions = lineupsCheck.rows[0].total_players > 0 && 
                                      lineupsCheck.rows[0].players_with_position < lineupsCheck.rows[0].total_players * 0.7
          
          // Skip if everything is already scraped
          if (!needsReferee && !needsEvents && !needsFormation && !needsLineups && !needsPlayerStats && !needsOdds && !needsPlayerPositions) {
            console.log(`    [${game.id}] ⏭️  Already complete, skipping`)
            return true
          }
          
          // Show what needs scraping
          const needed = []
          if (needsReferee) needed.push('referee')
          if (needsEvents) needed.push('events')
          if (needsFormation) needed.push('formation')
          if (needsLineups) needed.push('lineups')
          if (needsPlayerStats) needed.push('stats')
          if (needsPlayerPositions) needed.push('positions')
          if (needsOdds) needed.push('odds')
          console.log(`    [${game.id}] Needs: ${needed.join(', ')}`)
          
          page = await browser.newPage()
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
          page.setDefaultTimeout(15000)
          
          let url = game.flashscore_url
          
          // Navigate directly to lineups tab URL when needed
          if (needsLineups || needsFormation || needsPlayerStats || needsPlayerPositions || needsEvents) {
            url = url.split('#')[0] + '#/match-summary/lineups'
          } else if (!url.includes('#')) {
            url += '#/match-summary/match-statistics'
          }
          
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          let referee = null
          let matchEvents = []
          let formations = { home: null, away: null }
          let lineups = { home: [], away: [], homeSubstitutes: [], awaySubstitutes: [] }
          let matchStats = null
          let odds1x2 = null
          let oddsOU = null
          let score = { home_goals: null, away_goals: null }
          
          // STEP 0: Extract score first (if game is finished)
          try {
            score = await page.evaluate(() => {
              // Look for the main score display - FlashScore shows it prominently
              // Try multiple selectors for the score display
              
              // Method 1: Look for specific score elements (most reliable)
              const scoreElements = document.querySelectorAll('[class*="detailScore"], [class*="score"], .duelParticipant__score');
              const scoreTexts = Array.from(scoreElements)
                .map(e => e.textContent?.trim())
                .filter(t => t && /^\d{1,2}$/.test(t));
              
              if (scoreTexts.length >= 2) {
                return {
                  home_goals: parseInt(scoreTexts[0]),
                  away_goals: parseInt(scoreTexts[1])
                };
              }
              
              // Method 2: Look for the match header/status area
              const pageText = document.body.innerText;
              const lines = pageText.split('\n').map(l => l.trim());
              
              // Find lines that look like scores with dash separator
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Look for the dash separator between teams
                if (line === '-' && i > 0 && i < lines.length - 1) {
                  const before = lines[i - 1];
                  const after = lines[i + 1];
                  // Check if surrounded by single/double digit numbers (scores)
                  if (/^\d{1,2}$/.test(before) && /^\d{1,2}$/.test(after)) {
                    return {
                      home_goals: parseInt(before),
                      away_goals: parseInt(after)
                    };
                  }
                }
              }
              
              return { home_goals: null, away_goals: null };
            });
            
            if (score.home_goals !== null) {
              console.log(`    [${game.id}] Score: ${score.home_goals} - ${score.away_goals}`);
            }
          } catch (e) {
            console.log(`    [${game.id}] ⚠️  Could not extract score: ${e.message}`);
          }
          
          // Check if game has been played (has score)
          const gameIsFinished = score.home_goals !== null && score.away_goals !== null;
          
          // If game hasn't been played yet, skip stats/events/referee that don't exist yet
          // But still try lineups and formations (often available before kickoff)
          if (!gameIsFinished) {
            console.log(`    [${game.id}] ⚙️  Upcoming game - will try lineups/formations/odds only`);
            // Skip data that requires the game to be played
            if (needsReferee) needsReferee = false;
            if (needsEvents) needsEvents = false;
            if (needsPlayerStats) needsPlayerStats = false;
            if (needsPlayerPositions) needsPlayerPositions = false;
            // Keep needsLineups, needsFormation, needsOdds
          }
          
          // Load existing lineups from database if needed for event validation
          if (needsEvents && !needsLineups) {
            const existingLineups = await db.execute({
              sql: `SELECT player_name, team FROM lineups WHERE game_id = ?`,
              args: [game.id]
            })
            existingLineups.rows.forEach(row => {
              const player = { name: row.player_name }
              if (row.team === 'home') {
                lineups.home.push(player)
              } else {
                lineups.away.push(player)
              }
            })
            console.log(`    [${game.id}] Loaded ${lineups.home.length + lineups.away.length} players from DB for event validation`)
          }
          
          // STEP 1: Extract lineups FIRST (needed to validate event teams)
          if (needsLineups || needsFormation || needsPlayerStats || (needsEvents && lineups.home.length === 0)) {
            // Click the LINEUPS tab link
            const lineupsClicked = await page.evaluate(() => {
              const links = Array.from(document.querySelectorAll('a'));
              const lineupsLink = links.find(link => {
                const text = link.textContent.trim().toUpperCase();
                return text === 'LINEUPS';
              });
              
              if (lineupsLink) {
                lineupsLink.click();
                return true;
              }
              return false;
            });
            
            if (lineupsClicked) {
              // Wait for lineup content to actually load
              try {
                await page.waitForFunction(
                  () => document.body.innerText.includes('STARTING') || document.body.innerText.includes('Starting'),
                  { timeout: 5000 }
                );
                await new Promise(resolve => setTimeout(resolve, 1000));
              } catch (e) {
                console.log(`    [${game.id}] ⚠️  Lineup content didn't load, will try player stats`);
              }
            }
            
            // Extract lineup data - parse all players then split by team using visual layout info
            lineups = await page.evaluate(() => {
              const pageText = document.body.innerText;
              const lines = pageText.split('\n').map(l => l.trim()).filter(l => l);
              
              const startingIndex = lines.findIndex(l => l.includes('STARTING LINEUPS') || l.includes('Starting XI') || l.includes('STARTING XI'));
              const substitutesIndex = lines.findIndex(l => l === 'SUBSTITUTES' || l === 'Substitutes' || l.includes('SUBSTITUTES'));
              const missingPlayersIndex = lines.findIndex(l => l === 'MISSING PLAYERS' || l.includes('MISSING PLAYERS'));
              
              const result = { 
                home: [], 
                away: [], 
                homeSubstitutes: [], 
                awaySubstitutes: [],
                homeFormation: null,
                awayFormation: null,
                debug: {
                  startingIndex,
                  substitutesIndex,
                  missingPlayersIndex,
                  totalLines: lines.length,
                  firstLines: lines.slice(0, 100)
                }
              };
              
              if (startingIndex < 0 || substitutesIndex < 0) return result;
              
              // Get formations - try multiple patterns
              // Pattern 1: "4-2-3-1 FORMATION 4-2-3-1"
              let formationMatch = pageText.match(/(\d-\d-\d(?:-\d)?)\s+FORMATION\s+(\d-\d-\d(?:-\d)?)/);
              
              if (!formationMatch) {
                // Pattern 2: "4 - 2 - 3 - 1" with spaces (common format)
                // Look for two formations with spaces, typically near the top
                const topLines = lines.slice(0, Math.min(startingIndex + 10, 50));
                const formations = [];
                for (const line of topLines) {
                  const spaced = line.match(/^(\d+)\s*-\s*(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?$/);
                  if (spaced) {
                    const formation = spaced[4] 
                      ? `${spaced[1]}-${spaced[2]}-${spaced[3]}-${spaced[4]}`
                      : `${spaced[1]}-${spaced[2]}-${spaced[3]}`;
                    formations.push(formation);
                  }
                }
                if (formations.length >= 2) {
                  result.homeFormation = formations[0];
                  result.awayFormation = formations[1];
                } else if (formations.length === 1) {
                  // Sometimes same formation for both teams
                  result.homeFormation = formations[0];
                  result.awayFormation = formations[0];
                }
              }
              
              if (!formationMatch && !result.homeFormation) {
                // Pattern 3: Look near STARTING LINEUPS section
                const formationLines = lines.slice(Math.max(0, startingIndex - 10), startingIndex + 5);
                for (const line of formationLines) {
                  const compact = line.match(/(\d-\d-\d(?:-\d)?)/g);
                  if (compact && compact.length >= 2) {
                    result.homeFormation = compact[0];
                    result.awayFormation = compact[1];
                    break;
                  }
                }
              }
              
              if (formationMatch && !result.homeFormation) {
                result.homeFormation = formationMatch[1].replace(/\s/g, '');
                result.awayFormation = formationMatch[2].replace(/\s/g, '');
              }
              
              // Parse starters - collect all first, then split
              const startersLines = lines.slice(startingIndex + 1, substitutesIndex);
              const starters = [];
              let player = {};
              
              for (let i = 0; i < startersLines.length; i++) {
                const line = startersLines[i];
                
                if (/^\d+$/.test(line) && !player.jersey) {
                  player.jersey = parseInt(line);
                }
                else if (/[A-Z][a-z]/.test(line) && player.jersey && !player.name) {
                  player.name = line;
                  const nextLine = startersLines[i + 1];
                  if (nextLine && (nextLine === '(G)' || nextLine === '(C)')) {
                    player.position = nextLine.replace(/[()]/g, '');
                    i++;
                  }
                  starters.push(player);
                  player = {};
                }
              }
              
              // Split starters: first 11 = home, next 11 = away
              result.home = starters.slice(0, 11);
              result.away = starters.slice(11, 22);
              
              // Parse subs - stop at MISSING PLAYERS if it exists
              const subsEndIndex = missingPlayersIndex > substitutesIndex ? missingPlayersIndex : substitutesIndex + 50;
              const subsLines = lines.slice(substitutesIndex + 1, subsEndIndex);
              const subs = [];
              player = {};
              
              for (let i = 0; i < subsLines.length; i++) {
                const line = subsLines[i];
                
                // Stop if we hit MISSING PLAYERS or other sections
                if (line === 'MISSING PLAYERS' || line === 'FORMATION' || line === 'COACH') break;
                
                if (/^\d+$/.test(line) && !player.jersey) {
                  player.jersey = parseInt(line);
                }
                else if (/[A-Z][a-z]/.test(line) && player.jersey && !player.name) {
                  player.name = line;
                  const nextLine = subsLines[i + 1];
                  if (nextLine && (nextLine === '(G)' || nextLine === '(C)')) {
                    player.position = nextLine.replace(/[()]/g, '');
                    i++;
                  }
                  subs.push(player);
                  player = {};
                }
              }
              
              // Split subs evenly
              const halfSubs = Math.ceil(subs.length / 2);
              result.homeSubstitutes = subs.slice(0, halfSubs);
              result.awaySubstitutes = subs.slice(halfSubs);
              
              return result;
            });
            
            if (needsLineups && lineups.debug) {
              console.log(`    [${game.id}] DEBUG: Found ${lineups.debug.totalLines} lines, starting at ${lineups.debug.startingIndex}, subs at ${lineups.debug.substitutesIndex}`);
              if (lineups.debug.startingIndex === -1) {
                console.log(`    [${game.id}] DEBUG: First 50 lines:`, lineups.debug.firstLines.slice(0, 50).join(' | '));
              }
              delete lineups.debug;
            }
            
            if (needsLineups) {
              const totalPlayers = lineups.home.length + lineups.away.length;
              console.log(`    [${game.id}] Lineups: ${totalPlayers} players (${lineups.home.length}+${lineups.away.length})`);
            }
            
            if (needsFormation && lineups.homeFormation) formations.home = lineups.homeFormation;
            if (needsFormation && lineups.awayFormation) formations.away = lineups.awayFormation;
            if (needsFormation) {
              console.log(`    [${game.id}] Formations: ${formations.home || 'none'} vs ${formations.away || 'none'}`);
            }
          }
          
          // STEP 2: Scrape referee (need to navigate back to match stats)
          if (needsReferee) {
            const statsClicked = await page.evaluate(() => {
              const links = Array.from(document.querySelectorAll('a'));
              const statsLink = links.find(link => {
                const text = link.textContent.trim().toUpperCase();
                return text === 'MATCH STATISTICS' || text === 'STATISTICS';
              });
              if (statsLink) {
                statsLink.click();
                return true;
              }
              return false;
            });
            
            if (statsClicked) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            referee = await page.evaluate(() => {
              const pageText = document.body.innerText
              const lines = pageText.split('\n').map(l => l.trim()).filter(l => l)
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                if (line.toUpperCase() === 'REFEREE:' || line.toLowerCase() === 'referee:') {
                  const nextLine = lines[i + 1]
                  if (nextLine && nextLine.length > 2 && nextLine.length < 40 && !nextLine.includes(':')) {
                    return nextLine
                  }
                }
                if (line.toLowerCase().startsWith('referee:')) {
                  const name = line.substring(8).trim()
                  if (name && name.length > 2) {
                    return name
                  }
                }
              }
              return null
            })
            console.log(`    [${game.id}] Referee scraped: ${referee || 'NOT FOUND'}`)
          }
          
          // STEP 3: Scrape events and validate teams using lineup data
          if (needsEvents) {
            // Navigate back to match statistics tab for events
            const statsClicked = await page.evaluate(() => {
              const links = Array.from(document.querySelectorAll('a'));
              const statsLink = links.find(link => {
                const text = link.textContent.trim().toUpperCase();
                return text === 'MATCH STATISTICS' || text === 'STATISTICS';
              });
              if (statsLink) {
                statsLink.click();
                return true;
              }
              return false;
            });
            
            if (statsClicked) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Create player lookup for team validation
            const allHomePlayers = [...lineups.home, ...lineups.homeSubstitutes].map(p => 
              p.name.toLowerCase().replace(/[^\w\s]/g, '').trim()
            );
            const allAwayPlayers = [...lineups.away, ...lineups.awaySubstitutes].map(p => 
              p.name.toLowerCase().replace(/[^\w\s]/g, '').trim()
            );
            
            matchEvents = await page.evaluate((homePlayers, awayPlayers) => {
              const events = []
              const pageText = document.body.innerText
              const lines = pageText.split('\n').map(l => l.trim()).filter(l => l)
              
              // Helper to validate player team
              const getPlayerTeam = (playerName) => {
                const normalized = playerName.toLowerCase().replace(/[^\w\s]/g, '').trim();
                
                // Check home team
                for (const homePlayer of homePlayers) {
                  if (homePlayer.includes(normalized) || normalized.includes(homePlayer)) {
                    return 'home';
                  }
                }
                
                // Check away team
                for (const awayPlayer of awayPlayers) {
                  if (awayPlayer.includes(normalized) || normalized.includes(awayPlayer)) {
                    return 'away';
                  }
                }
                
                return null; // Unknown
              };
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                const minuteMatch = line.match(/^(\d+)(?:\+(\d+))?'$/)
                
                if (minuteMatch) {
                  const minute = parseInt(minuteMatch[1]) + (parseInt(minuteMatch[2] || '0'))
                  const nextLine = i + 1 < lines.length ? lines[i + 1] : ''
                  const lineAfter = i + 2 < lines.length ? lines[i + 2] : ''
                  
                  // Goal format: "45'" then "0 - 1" then "Player Name"
                  if (nextLine.match(/^\d+\s*-\s*\d+$/)) {
                    const playerLine = lineAfter
                    if (playerLine && playerLine.length > 2) {
                      const player = playerLine.replace(/\(.*\)/, '').trim()
                      const team = getPlayerTeam(player) || 'home'; // fallback
                      
                      events.push({
                        minute,
                        type: 'goal',
                        team,
                        player: player.substring(0, 30),
                        detail: playerLine.toLowerCase().includes('penalty') ? 'penalty' : undefined
                      })
                    }
                  }
                  
                  // Card or foul
                  else if (nextLine && !nextLine.includes('-') && lineAfter) {
                    const player = nextLine
                    const detail = lineAfter.toLowerCase()
                    const team = getPlayerTeam(player) || 'home'; // fallback
                    
                    if (detail.includes('yellow') || detail.includes('booking')) {
                      events.push({
                        minute,
                        type: 'yellow_card',
                        team,
                        player: player.substring(0, 30)
                      })
                    }
                    
                    if (detail.includes('red card')) {
                      events.push({
                        minute,
                        type: 'red_card',
                        team,
                        player: player.substring(0, 30),
                        detail: detail.includes('2nd') ? '2nd yellow' : 'straight red'
                      })
                    }
                  }
                  
                  // Substitution
                  if (i + 2 < lines.length && !nextLine.match(/^\d+\s*-\s*\d+$/) && lineAfter && !lineAfter.startsWith('(')) {
                    const playerIn = nextLine;
                    const team = getPlayerTeam(playerIn) || 'home'; // fallback
                    
                    events.push({
                      minute,
                      type: 'substitution',
                      team,
                      player: playerIn.substring(0, 30),
                      detail: `${lineAfter.substring(0, 20)} out`
                    })
                  }
                }
              }
              
              return events
            }, allHomePlayers, allAwayPlayers)
            
            console.log(`    [${game.id}] Events scraped: ${matchEvents.length}`)
          }
          
          // STEP 4: Extract player stats if needed (includes positions)
          if (needsPlayerStats || needsPlayerPositions) {
            const playerStatsClicked = await page.evaluate(() => {
                  const links = Array.from(document.querySelectorAll('a'));
                  const playerStatsLink = links.find(link => {
                    const text = link.textContent.trim().toUpperCase();
                    return text === 'PLAYER STATS';
                  });
                  
                  if (playerStatsLink) {
                    playerStatsLink.click();
                    return true;
                  }
                  return false;
                });
                
                if (playerStatsClicked) {
                  console.log(`    [${game.id}] Extracting player stats...`);
                  
                  // Wait for player stats table to load
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  // Extract comprehensive player stats
                  const playerStats = await page.evaluate(() => {
                    const pageText = document.body.innerText;
                    const lines = pageText.split('\n').map(l => l.trim()).filter(l => l);
                    
                    const stats = [];
                    const ratingPattern = /^\d\.\d$/;
                    
                    // Pattern: Player name -> Position -> Rating -> Stats (7 values)
                    // Find ratings first, then extract the full row
                    for (let i = 0; i < lines.length; i++) {
                      if (ratingPattern.test(lines[i])) {
                        // Look back for player name (2-3 lines before rating)
                        let playerName = '';
                        let position = '';
                        
                        for (let j = Math.max(0, i - 3); j < i; j++) {
                          const line = lines[j];
                          // Player name: starts with capital, has letters
                          if (/^[A-Z][a-z]+/.test(line) && line.length > 3 && line.length < 40 && !line.includes('%')) {
                            // Check if next line is position (Midfielder, Forward, Defender, Goalkeeper)
                            if (j + 1 < i && /^(Midfielder|Forward|Defender|Goalkeeper)$/.test(lines[j + 1])) {
                              playerName = line;
                              position = lines[j + 1];
                              break;
                            }
                          }
                        }
                        
                        if (playerName) {
                          const rating = parseFloat(lines[i]);
                          
                          // Extract next 7 stats after rating
                          const totalShots = lines[i + 1] || '-';
                          const xG = lines[i + 2] || '-';
                          const accuratePasses = lines[i + 3] || '-';
                          const touches = lines[i + 4] || '-';
                          const touchesInBox = lines[i + 5] || '-';
                          const dribbles = lines[i + 6] || '-';
                          const duels = lines[i + 7] || '-';
                          
                          stats.push({
                            name: playerName,
                            position: position,
                            rating: rating,
                            total_shots: totalShots === '-' ? null : parseInt(totalShots),
                            xg: xG === '-' ? null : parseFloat(xG),
                            accurate_passes: accuratePasses,
                            touches: touches === '-' ? null : parseInt(touches),
                            touches_in_box: touchesInBox === '-' ? null : parseInt(touchesInBox),
                            dribbles: dribbles,
                            duels: duels === '-' ? null : parseInt(duels)
                          });
                        }
                      }
                    }
                    
                    return stats;
                  });
                  
                  console.log(`    [${game.id}] Player stats: ${playerStats.length} players`);
                  
                  // If we don't have lineups yet, build them from player stats (first ~11-12 of each position group)
                  if (lineups.home.length === 0 && lineups.away.length === 0 && playerStats.length > 0) {
                    // Split players by assuming first half are home, second half are away
                    const midpoint = Math.floor(playerStats.length / 2);
                    lineups.home = playerStats.slice(0, midpoint).map(p => ({ name: p.name, jersey: 0 }));
                    lineups.away = playerStats.slice(midpoint).map(p => ({ name: p.name, jersey: 0 }));
                    console.log(`    [${game.id}] Built lineups from player stats: ${lineups.home.length}+${lineups.away.length}`);
                  }
                  
                  // Match stats with lineup players and merge position data
                  [...lineups.home, ...lineups.away, ...lineups.homeSubstitutes, ...lineups.awaySubstitutes].forEach(player => {
                    const stat = playerStats.find(s => {
                      return s.name === player.name || 
                             player.name.includes(s.name) || 
                             s.name.includes(player.name);
                    });
                    if (stat) {
                      // Merge all stats
                      player.rating = stat.rating;
                      player.total_shots = stat.total_shots;
                      player.xg = stat.xg;
                      player.accurate_passes = stat.accurate_passes;
                      player.touches = stat.touches;
                      player.touches_in_box = stat.touches_in_box;
                      player.dribbles = stat.dribbles;
                      player.duels = stat.duels;
                      
                      // Use detailed position from Player Stats (Midfielder, Forward, Defender, Goalkeeper)
                      // Override simple positions like G (goalkeeper) or C (captain)
                      if (stat.position && (stat.position === 'Midfielder' || stat.position === 'Forward' || 
                          stat.position === 'Defender' || stat.position === 'Goalkeeper')) {
                        player.position = stat.position;
                      }
                    }
                  });
                  
                  // Count positions for logging
                  const allPlayers = [...lineups.home, ...lineups.away, ...lineups.homeSubstitutes, ...lineups.awaySubstitutes];
                  const withDetailedPosition = allPlayers.filter(p => 
                    p.position && ['Midfielder', 'Forward', 'Defender', 'Goalkeeper'].includes(p.position)
                  ).length;
                  console.log(`    [${game.id}] Positions: ${withDetailedPosition}/${allPlayers.length} players`);
                  
                } else {
                  console.log(`    [${game.id}] ⚠️  PLAYER STATS tab not found`)
                }
          }
          
          // STEP 5: Scrape match statistics (shots, possession, corners, etc.) - only for finished games
          const needsMatchStats = ((game.home_shots === null || game.home_shots === 0) || 
                                    (game.home_corners === null || game.home_corners === 0)) && gameIsFinished;
          if (needsMatchStats) {
            console.log(`    [${game.id}] Extracting match statistics...`)
            const statsUrl = game.flashscore_url.split('#')[0] + '#/match-summary/match-statistics'
            await page.goto(statsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // Try clicking any expandable sections or "Show more" buttons
            await page.evaluate(() => {
              // Click all potential expandable elements
              const clickableElements = Array.from(document.querySelectorAll('*')).filter(el => {
                const text = el.textContent?.trim().toLowerCase() || '';
                return text.includes('show') || text.includes('more') || text.includes('statistics') || 
                       text.includes('stats') || text.includes('expand') || el.classList.contains('expandable');
              });
              clickableElements.forEach(el => {
                try { el.click(); } catch(e) {}
              });
            }).catch(() => {});
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
          
          if (needsMatchStats) {
            matchStats = await page.evaluate(() => {
            const result = {
              home_shots: 0,
              away_shots: 0,
              home_shots_on_target: 0,
              away_shots_on_target: 0,
              home_possession_pct: 50,
              away_possession_pct: 50,
              home_corners: 0,
              away_corners: 0,
              home_fouls: 0,
              away_fouls: 0,
              home_yellow_cards: 0,
              away_yellow_cards: 0,
              home_offsides: 0,
              away_offsides: 0
            }
            
            const pageText = document.body.innerText
            const lines = pageText.split('\n').map(l => l.trim()).filter(l => l)
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].toLowerCase()
              const prevLine = lines[i-1] || ''
              const nextLine = lines[i+1] || ''
              
              if (line.includes('ball possession')) {
                const homeMatch = prevLine.match(/(\d+)%/)
                const awayMatch = nextLine.match(/(\d+)%/)
                if (homeMatch) result.home_possession_pct = parseInt(homeMatch[1])
                if (awayMatch) result.away_possession_pct = parseInt(awayMatch[1])
              }
              
              if (line.includes('total shots') || line === 'total shots') {
                const homeNum = parseInt(prevLine)
                const awayNum = parseInt(nextLine)
                if (!isNaN(homeNum) && homeNum < 50) result.home_shots = homeNum
                if (!isNaN(awayNum) && awayNum < 50) result.away_shots = awayNum
              }
              
              if (line.includes('shots on target')) {
                const homeNum = parseInt(prevLine)
                const awayNum = parseInt(nextLine)
                if (!isNaN(homeNum) && homeNum < 50) result.home_shots_on_target = homeNum
                if (!isNaN(awayNum) && awayNum < 50) result.away_shots_on_target = awayNum
              }
              
              if (line.includes('corner kicks') || line === 'corners' || line === 'corner kicks') {
                const homeNum = parseInt(prevLine)
                const awayNum = parseInt(nextLine)
                if (!isNaN(homeNum) && homeNum < 30) result.home_corners = homeNum
                if (!isNaN(awayNum) && awayNum < 30) result.away_corners = awayNum
              }
              
              if (line === 'fouls') {
                const homeNum = parseInt(prevLine)
                const awayNum = parseInt(nextLine)
                if (!isNaN(homeNum) && homeNum < 50) result.home_fouls = homeNum
                if (!isNaN(awayNum) && awayNum < 50) result.away_fouls = awayNum
              }
              
              if (line.includes('yellow cards') || line === 'yellow cards') {
                const homeNum = parseInt(prevLine)
                const awayNum = parseInt(nextLine)
                if (!isNaN(homeNum) && homeNum < 20) result.home_yellow_cards = homeNum
                if (!isNaN(awayNum) && awayNum < 20) result.away_yellow_cards = awayNum
              }
              
              if (line.includes('red cards') || line === 'red cards') {
                const homeNum = parseInt(prevLine)
                const awayNum = parseInt(nextLine)
                if (!isNaN(homeNum) && homeNum < 10) result.home_red_cards = homeNum
                if (!isNaN(awayNum) && awayNum < 10) result.away_red_cards = awayNum
              }
              
              if (line === 'offsides') {
                const homeNum = parseInt(prevLine)
                const awayNum = parseInt(nextLine)
                if (!isNaN(homeNum) && homeNum < 20) result.home_offsides = homeNum
                if (!isNaN(awayNum) && awayNum < 20) result.away_offsides = awayNum
              }
            }
            
            return result
          })}
          
          if (matchStats) {
            console.log(`    [${game.id}] Stats: ${matchStats.home_shots}-${matchStats.away_shots} shots, ${matchStats.home_possession_pct}%-${matchStats.away_possession_pct} possession, ${matchStats.home_corners}-${matchStats.away_corners} corners, ${matchStats.home_fouls}-${matchStats.away_fouls} fouls, ${matchStats.home_yellow_cards}-${matchStats.away_yellow_cards} yellows`)
          }
          
          // STEP 6: Scrape 1X2 odds - only if needed
          if (needsOdds) {
            console.log(`    [${game.id}] Extracting 1X2 odds...`)
            const odds1x2Url = game.flashscore_url.split('#')[0] + '#/odds-comparison/1x2-odds/full-time'
            await page.goto(odds1x2Url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
            await new Promise(resolve => setTimeout(resolve, 3000))
          
            odds1x2 = await page.evaluate(() => {
            const result = { home_odds: null, draw_odds: null, away_odds: null }
            const pageText = document.body.innerText
            const lines = pageText.split('\n').map(l => l.trim()).filter(l => l)
            const oddsPattern = /^\d+\.\d{2}$/
            const isValidOdds = (val) => val >= 1.01 && val <= 50.00
            
            // Try multiple bookmakers
            const bookmakers = ['stoiximan', 'bet365', 'pinnacle', 'betfair', 'william hill', 'unibet', '1xbet', 'bwin', 'betway']
            
            for (const bookmaker of bookmakers) {
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].toLowerCase()
                if (line.includes(bookmaker)) {
                  const oddsFound = []
                  for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
                    if (oddsPattern.test(lines[j])) {
                      const val = parseFloat(lines[j])
                      if (isValidOdds(val)) {
                        oddsFound.push(val)
                        if (oddsFound.length >= 3) break
                      }
                    }
                  }
                  if (oddsFound.length >= 3) {
                    result.home_odds = oddsFound[0]
                    result.draw_odds = oddsFound[1]
                    result.away_odds = oddsFound[2]
                    return result
                  }
                }
              }
            }
            
            // Fallback: Look for any 3 consecutive valid odds near each other
            if (!result.home_odds) {
              const allOdds = []
              for (let i = 0; i < lines.length; i++) {
                if (oddsPattern.test(lines[i])) {
                  const val = parseFloat(lines[i])
                  if (isValidOdds(val)) {
                    allOdds.push({ val, index: i })
                  }
                }
              }
              
              // Find 3 odds within 10 lines of each other
              for (let i = 0; i < allOdds.length - 2; i++) {
                if (allOdds[i + 2].index - allOdds[i].index < 10) {
                  result.home_odds = allOdds[i].val
                  result.draw_odds = allOdds[i + 1].val
                  result.away_odds = allOdds[i + 2].val
                  break
                }
              }
            }
            
            return result
          })}
          
          if (odds1x2 && odds1x2.home_odds) {
            console.log(`    [${game.id}] 1X2: ${odds1x2.home_odds} / ${odds1x2.draw_odds} / ${odds1x2.away_odds}`)
          }
          
          // STEP 7: Scrape Over/Under odds - only if needed
          if (needsOdds) {
            console.log(`    [${game.id}] Extracting O/U odds...`)
            const oddsOUUrl = game.flashscore_url.split('#')[0] + '#/odds-comparison/over-under/full-time'
            await page.goto(oddsOUUrl, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
            await new Promise(resolve => setTimeout(resolve, 3000))
            
            oddsOU = await page.evaluate(() => {
            const result = {
              over_15_odds: null, under_15_odds: null,
              over_25_odds: null, under_25_odds: null,
              over_35_odds: null, under_35_odds: null
            }
            const isValidOdds = (val) => val >= 1.01 && val <= 15.00
            const pageText = document.body.innerText
            const lines = pageText.split('\n').map(l => l.trim()).filter(l => l)
            
            const goalLines = [
              { value: '1.5', overKey: 'over_15_odds', underKey: 'under_15_odds' },
              { value: '2.5', overKey: 'over_25_odds', underKey: 'under_25_odds' },
              { value: '3.5', overKey: 'over_35_odds', underKey: 'under_35_odds' }
            ]
            
            const bookmakers = ['stoiximan', 'bet365', 'pinnacle', 'betfair', 'william hill', 'unibet', '1xbet', 'bwin', 'betway']
            
            for (const gl of goalLines) {
              if (result[gl.overKey]) continue
              
              for (const bookmaker of bookmakers) {
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i].toLowerCase()
                  if (line.includes(bookmaker)) {
                  for (let j = i; j < Math.min(i + 5, lines.length); j++) {
                    if (lines[j] === gl.value) {
                      const oddsFound = []
                      for (let k = j + 1; k < Math.min(j + 10, lines.length); k++) {
                        if (/^\d+\.\d{2}$/.test(lines[k])) {
                          const val = parseFloat(lines[k])
                          if (!['0.50', '1.50', '2.50', '3.50'].includes(lines[k]) && isValidOdds(val)) {
                            oddsFound.push(val)
                            if (oddsFound.length >= 2) break
                          }
                        }
                      }
                      if (oddsFound.length >= 2) {
                        result[gl.overKey] = oddsFound[0]
                        result[gl.underKey] = oddsFound[1]
                        break
                      }
                    }
                  }
                  if (result[gl.overKey]) break
                }
              }
              if (result[gl.overKey]) break
              }
            }
            return result
          })}
          
          if (oddsOU && oddsOU.over_25_odds) {
            console.log(`    [${game.id}] O/U 2.5: ${oddsOU.over_25_odds} / ${oddsOU.under_25_odds}`)
          }
          
          // Calculate total lineups players
          const totalLineupsPlayers = lineups.home.length + lineups.away.length + 
                                       lineups.homeSubstitutes.length + lineups.awaySubstitutes.length;
          
          // Delete existing lineups for this game before inserting new ones (only if we scraped new lineups)
          if (totalLineupsPlayers > 0 && needsLineups) {
            await db.execute({
              sql: 'DELETE FROM lineups WHERE game_id = ?',
              args: [game.id]
            });
          }
          
          // Build updates and save to database
          let refereeId = null
          if (referee && needsReferee) {
            // Get or create referee
            const existingRef = await db.execute({
              sql: 'SELECT id FROM referees WHERE name = ?',
              args: [referee]
            })
            
            if (existingRef.rows.length > 0) {
              refereeId = existingRef.rows[0].id
            } else {
              const result = await db.execute({
                sql: 'INSERT INTO referees (name) VALUES (?) RETURNING id',
                args: [referee]
              })
              refereeId = result.rows[0].id
            }
          }
          
          // Build updates based on what was scraped
          const updates = []
          const args = []
          
          // Add score if extracted
          if (score.home_goals !== null && score.away_goals !== null) {
            updates.push('home_goals = ?, away_goals = ?')
            args.push(score.home_goals, score.away_goals)
          }
          
          if (refereeId) {
            updates.push('referee_id = ?')
            args.push(refereeId)
          }
          
          if (matchEvents.length > 0) {
            updates.push('match_events = ?')
            args.push(JSON.stringify(matchEvents))
          }
          
          if (formations.home) {
            updates.push('home_formation = ?')
            args.push(formations.home)
          }
          
          if (formations.away) {
            updates.push('away_formation = ?')
            args.push(formations.away)
          }
          
          // Add match statistics
          if (matchStats) {
            updates.push('home_shots = ?, away_shots = ?, home_shots_on_target = ?, away_shots_on_target = ?')
            args.push(matchStats.home_shots, matchStats.away_shots, matchStats.home_shots_on_target, matchStats.away_shots_on_target)
            
            updates.push('home_possession_pct = ?, away_possession_pct = ?')
            args.push(matchStats.home_possession_pct, matchStats.away_possession_pct)
            
            updates.push('home_corners = ?, away_corners = ?')
            args.push(matchStats.home_corners, matchStats.away_corners)
            
            updates.push('home_fouls = ?, away_fouls = ?')
            args.push(matchStats.home_fouls, matchStats.away_fouls)
            
            updates.push('home_yellow_cards = ?, away_yellow_cards = ?')
            args.push(matchStats.home_yellow_cards, matchStats.away_yellow_cards)
            
            updates.push('home_offsides = ?, away_offsides = ?')
            args.push(matchStats.home_offsides, matchStats.away_offsides)
          }
          
          // Add 1X2 odds
          if (odds1x2 && odds1x2.home_odds) {
            updates.push('odds_home = ?, odds_draw = ?, odds_away = ?')
            args.push(odds1x2.home_odds, odds1x2.draw_odds, odds1x2.away_odds)
          }
          
          // Add Over/Under odds (all three lines: 1.5, 2.5, 3.5)
          if (oddsOU) {
            if (oddsOU.over_15_odds) {
              updates.push('odds_over_15 = ?, odds_under_15 = ?')
              args.push(oddsOU.over_15_odds, oddsOU.under_15_odds)
            }
            if (oddsOU.over_25_odds) {
              updates.push('odds_over_25 = ?, odds_under_25 = ?')
              args.push(oddsOU.over_25_odds, oddsOU.under_25_odds)
            }
            if (oddsOU.over_35_odds) {
              updates.push('odds_over_35 = ?, odds_under_35 = ?')
              args.push(oddsOU.over_35_odds, oddsOU.under_35_odds)
            }
          }
          
          if (updates.length > 0) {
            updates.push('updated_at = CURRENT_TIMESTAMP')
            args.push(game.id)
            
            await db.execute({
              sql: `UPDATE games SET ${updates.join(', ')} WHERE id = ?`,
              args
            })
          }
            
          // Save lineups to database if we have them (independent of game updates)
          if (totalLineupsPlayers > 0) {
            const allPlayers = [
              ...lineups.home.map(p => ({ ...p, team: 'home', starter: true })),
              ...lineups.away.map(p => ({ ...p, team: 'away', starter: true })),
              ...lineups.homeSubstitutes.map(p => ({ ...p, team: 'home', starter: false })),
              ...lineups.awaySubstitutes.map(p => ({ ...p, team: 'away', starter: false }))
            ];
            
            for (const player of allPlayers) {
                try {
                  // Parse passes and dribbles data (format: "20/27 (74%)" or "0/2 (0%)")
                  let passesCompleted = null, passesAttempted = null, passAccuracy = null;
                  if (player.accurate_passes && player.accurate_passes !== '-') {
                    const passMatch = player.accurate_passes.match(/(\d+)\/(\d+)\s*\((\d+)%\)/);
                    if (passMatch) {
                      passesCompleted = parseInt(passMatch[1]);
                      passesAttempted = parseInt(passMatch[2]);
                      passAccuracy = parseFloat(passMatch[3]);
                    }
                  }
                  
                  let dribblesSuccessful = null, dribblesAttempted = null;
                  if (player.dribbles && player.dribbles !== '-') {
                    const dribbleMatch = player.dribbles.match(/(\d+)\/(\d+)/);
                    if (dribbleMatch) {
                      dribblesSuccessful = parseInt(dribbleMatch[1]);
                      dribblesAttempted = parseInt(dribbleMatch[2]);
                    }
                  }
                  
                  // Use INSERT OR REPLACE for updates (when only adding positions/stats to existing lineups)
                  if (needsLineups) {
                    // Full insert for new lineups
                    await db.execute({
                      sql: `INSERT INTO lineups (
                              game_id, team, player_name, jersey_number, position, starter, rating,
                              shots_total, xg, passes, pass_accuracy, touches, touches_in_box, 
                              dribbles_successful, dribbles_attempted, duels
                            ) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      args: [
                        game.id, 
                        player.team, 
                        player.name, 
                        player.jersey, 
                        player.position || null, 
                        player.starter ? 1 : 0,
                        player.rating || null,
                        player.total_shots || null,
                        player.xg || null,
                        passesAttempted,
                        passAccuracy,
                        player.touches || null,
                        player.touches_in_box || null,
                        dribblesSuccessful,
                        dribblesAttempted,
                        player.duels || null
                      ]
                    });
                  } else if (needsPlayerStats || needsPlayerPositions) {
                    // Update existing lineups with new data
                    const updates = [];
                    const args = [];
                    
                    if (player.position && needsPlayerPositions) {
                      updates.push('position = ?');
                      args.push(player.position);
                    }
                    if (player.rating !== undefined && needsPlayerStats) {
                      updates.push('rating = ?');
                      args.push(player.rating);
                    }
                    if (player.total_shots !== undefined && needsPlayerStats) {
                      updates.push('shots_total = ?');
                      args.push(player.total_shots);
                    }
                    if (player.xg !== undefined && needsPlayerStats) {
                      updates.push('xg = ?');
                      args.push(player.xg);
                    }
                    if (passesAttempted !== null && needsPlayerStats) {
                      updates.push('passes = ?, pass_accuracy = ?');
                      args.push(passesAttempted, passAccuracy);
                    }
                    if (player.touches !== undefined && needsPlayerStats) {
                      updates.push('touches = ?');
                      args.push(player.touches);
                    }
                    if (player.touches_in_box !== undefined && needsPlayerStats) {
                      updates.push('touches_in_box = ?');
                      args.push(player.touches_in_box);
                    }
                    if (dribblesSuccessful !== null && needsPlayerStats) {
                      updates.push('dribbles_successful = ?, dribbles_attempted = ?');
                      args.push(dribblesSuccessful, dribblesAttempted);
                    }
                    if (player.duels !== undefined && needsPlayerStats) {
                      updates.push('duels = ?');
                      args.push(player.duels);
                    }
                    
                    if (updates.length > 0) {
                      args.push(game.id, player.name);
                      await db.execute({
                        sql: `UPDATE lineups SET ${updates.join(', ')} WHERE game_id = ? AND player_name = ?`,
                        args
                      });
                    }
                  }
                } catch (e) {
                  console.log(`    [${game.id}] ⚠️  Failed to insert ${player.name}: ${e.message}`);
                }
              }
            }
            
          // Report what was scraped
          const scraped = []
          if (referee) scraped.push(`Ref: ${referee}`)
          if (matchEvents.length > 0) scraped.push(`${matchEvents.length} events`)
          if (formations.home && formations.away) {
            scraped.push(`Form: ${formations.home} vs ${formations.away}`);
          } else if (formations.home || formations.away) {
            scraped.push(`Form: ${formations.home || '?'}-${formations.away || '?'}`);
          }
          if (totalLineupsPlayers > 0) {
            const allPlayers = [...lineups.home, ...lineups.away, ...lineups.homeSubstitutes, ...lineups.awaySubstitutes];
            const withPosition = allPlayers.filter(p => 
              p.position && ['Midfielder', 'Forward', 'Defender', 'Goalkeeper'].includes(p.position)
            ).length;
            scraped.push(`${totalLineupsPlayers} players (${withPosition} with positions)`);
          }
          if (matchStats && matchStats.home_shots > 0) {
            scraped.push(`Stats: ${matchStats.home_shots}-${matchStats.away_shots} shots`)
          }
          if (odds1x2 && odds1x2.home_odds) {
            scraped.push(`1X2: ${odds1x2.home_odds}/${odds1x2.draw_odds}/${odds1x2.away_odds}`)
          }
          if (oddsOU && oddsOU.over_25_odds) {
            scraped.push(`O/U: ${oddsOU.over_25_odds}/${oddsOU.under_25_odds}`)
          }
          
          if (scraped.length > 0) {
            console.log(`  ✅ [${++processed}/${gamesToScrape.length}] Game ${game.id}: ${scraped.join(', ')}`)
            successful++
          } else {
            console.log(`  ⚠️  [${++processed}/${gamesToScrape.length}] Game ${game.id}: No new data`)
            failed++
          }
          
          return true
        } catch (err) {
          console.log(`  ❌ [${++processed}/${gamesToScrape.length}] Game ${game.id}: ${err.message}`)
          failed++
          return false
        } finally {
          if (page) {
            try {
              await page.close()
            } catch (e) {
              // Ignore page close errors
            }
          }
        }
    }
    
    // Process games in parallel with concurrency limit
    console.log(`\n🚀 Processing ${gamesToScrape.length} games with ${CONCURRENCY} concurrent workers...\n`)
    
    for (let i = 0; i < gamesToScrape.length; i += CONCURRENCY) {
      const batch = gamesToScrape.slice(i, i + CONCURRENCY)
      const batchNum = Math.floor(i/CONCURRENCY) + 1
      const totalBatches = Math.ceil(gamesToScrape.length/CONCURRENCY)
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (Games ${i + 1}-${Math.min(i + CONCURRENCY, gamesToScrape.length)})`)
      
      // Process batch in parallel
      await Promise.all(batch.map((game, idx) => processGame(game, i + idx)))
      
      // Small delay between batches to avoid rate limiting
      if (i + CONCURRENCY < gamesToScrape.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    await browser.close()
    
    console.log(`\n✅ Complete!`)
    console.log(`   Successful: ${successful}`)
    console.log(`   Failed: ${failed}`)
    console.log(`   Total: ${gamesToScrape.length}`)
    
    // Now update referee statistics
    console.log(`\n📊 Updating referee statistics...`)
    const { execSync } = require('child_process')
    try {
      execSync('node update_referee_stats.js', { stdio: 'inherit', cwd: __dirname })
    } catch (err) {
      console.log(`⚠️  Referee stats update skipped: ${err.message}`)
    }
    
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

// Show usage if --help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📖 Usage: node scrape_complete_game_data.js [options]

Options:
  --season <year>     Filter by season (e.g., 2024, 2025)
  --league <key>      Filter by league key (e.g., superleague-greece, premier-league)
  --help, -h          Show this help message

Examples:
  # Scrape all games
  node scrape_complete_game_data.js

  # Scrape only 2024/2025 season
  node scrape_complete_game_data.js --season 2024

  # Scrape only Greek Super League
  node scrape_complete_game_data.js --league superleague-greece

  # Scrape specific league and season
  node scrape_complete_game_data.js --season 2024 --league superleague-greece

Scrapes COMPLETE data for games with FlashScore URLs:
  ✅ Lineups (starting 11 + substitutes)
  ✅ Formations (e.g., 4-2-3-1 vs 4-4-2)
  ✅ Player positions (Midfielder, Forward, Defender, Goalkeeper)
  ✅ Referees
  ✅ Match events (goals, cards, substitutions timeline)
  ✅ Player statistics (ratings, shots, passes, xG, etc.)
  ✅ Match statistics (shots, possession, corners, fouls, cards)
  ✅ Betting odds (1X2 and Over/Under)
  `)
  process.exit(0)
}

scrapeCompleteGameData()
