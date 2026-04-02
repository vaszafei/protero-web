import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { league, matchIndex, matchData } = body

    if (!league || matchIndex === undefined || !matchData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    // Construct the file path
    const filePath = join(process.cwd(), 'public', 'data', 'leagues', `${league}.json`)

    // Read the current data
    const fileContent = await readFile(filePath, 'utf-8')
    const jsonData = JSON.parse(fileContent)

    // Update the specific match
    if (!jsonData.games || !jsonData.games[matchIndex]) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Match not found'
      })
    }

    jsonData.games[matchIndex] = matchData

    // Write back to file with proper formatting
    await writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8')

    return {
      success: true,
      message: 'Match updated successfully'
    }
  } catch (error) {
    console.error('Error updating match:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update match'
    })
  }
})
