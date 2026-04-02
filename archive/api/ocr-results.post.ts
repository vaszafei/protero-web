import { getDB } from '~/server/utils/db'
import Tesseract from 'tesseract.js'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    
    if (!formData) {
      throw createError({ statusCode: 400, message: 'No form data provided' })
    }

    const imageField = formData.find(field => field.name === 'image')
    const roundField = formData.find(field => field.name === 'round')
    const leagueKeyField = formData.find(field => field.name === 'leagueKey')

    if (!imageField || !roundField || !leagueKeyField) {
      throw createError({ statusCode: 400, message: 'Missing required fields' })
    }

    const round = roundField.data.toString()
    const leagueKey = leagueKeyField.data.toString()
    const imageBuffer = imageField.data

    console.log('Starting OCR processing for round', round, 'league', leagueKey)

    // Perform OCR on the image
    const { data: { text } } = await Tesseract.recognize(
      imageBuffer,
      'eng',
      {
        logger: (m) => console.log('OCR Progress:', m)
      }
    )

    console.log('OCR Text extracted:', text)

    // Get actual matches for this round from database
    const db = getDB()
    const gamesResult = await db.execute({
      sql: `
        SELECT 
          g.*,
          h.name as home_name,
          a.name as away_name
        FROM games g
        JOIN teams h ON g.home_team_id = h.id
        JOIN teams a ON g.away_team_id = a.id
        WHERE g.league_key = ? AND g.round = ?
        ORDER BY g.id
      `,
      args: [leagueKey, round]
    })

    // Parse OCR text to extract scores
    const results = parseOCRText(text, gamesResult.rows)

    console.log('Parsed results:', results)

    return {
      success: true,
      results,
      rawText: text
    }
  } catch (error: any) {
    console.error('OCR processing error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to process image: ' + error.message
    })
  }
})

function parseOCRText(text: string, games: any[]): any[] {
  const results = []
  const lines = text.split('\n').filter(line => line.trim())

  console.log('Parsing lines:', lines)

  // Pattern 1: Lines with team name and score separated by spaces
  // "Fulham           1"
  // "Nottingham       0"
  const teamScorePattern = /^(.+?)\s+(\d+)$/

  // Extract all team-score pairs from the text
  const teamScores: Array<{ team: string, score: number }> = []
  
  for (const line of lines) {
    const match = line.trim().match(teamScorePattern)
    if (match) {
      const teamName = match[1].trim()
      const score = parseInt(match[2])
      teamScores.push({ team: teamName, score })
      console.log('Found team-score:', teamName, score)
    }
  }

  // Now match pairs of teams to games
  // Assuming teams appear in pairs: home team, then away team
  for (let i = 0; i < teamScores.length - 1; i += 2) {
    const homeTeamScore = teamScores[i]
    const awayTeamScore = teamScores[i + 1]

    // Find matching game in database
    const matchedGame = games.find((game: any) => {
      const homeMatch = game.home_name.toLowerCase().includes(homeTeamScore.team.toLowerCase()) ||
                       homeTeamScore.team.toLowerCase().includes(game.home_name.toLowerCase())
      const awayMatch = game.away_name.toLowerCase().includes(awayTeamScore.team.toLowerCase()) ||
                       awayTeamScore.team.toLowerCase().includes(game.away_name.toLowerCase())
      return homeMatch && awayMatch
    })

    if (matchedGame) {
      results.push({
        game_id: matchedGame.id,
        home_team: matchedGame.home_name,
        away_team: matchedGame.away_name,
        home_score: homeTeamScore.score,
        away_score: awayTeamScore.score
      })
      console.log('Matched game:', matchedGame.home_name, homeTeamScore.score, '-', awayTeamScore.score, matchedGame.away_name)
    }
  }

  // Add any games that weren't matched with null scores
  for (const game of games) {
    if (!results.find(r => r.game_id === game.id)) {
      results.push({
        game_id: game.id,
        home_team: game.home_name,
        away_team: game.away_name,
        home_score: null,
        away_score: null
      })
    }
  }

  return results
}
