import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: Trigger Scraper
 * 
 * Finds games that need scraping and sends webhook to your local machine
 * 
 * Usage:
 * POST https://your-project.supabase.co/functions/v1/trigger-scraper
 * Body: { "league": "premier_league", "limit": 10 }
 */

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get webhook URL for your local scraper
    const webhookUrl = Deno.env.get('SCRAPER_WEBHOOK_URL')
    
    // Parse request
    const { league, limit = 10 } = await req.json()
    
    console.log(`Finding games to scrape for ${league || 'all leagues'}`)
    
    // Build query
    let query = supabase
      .from('games')
      .select(`
        id,
        flashscore_url,
        date,
        league_key,
        home_team:home_team_id(name),
        away_team:away_team_id(name),
        status
      `)
      .eq('is_scraped', false)
      .not('flashscore_url', 'is', null)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(limit)
    
    // Filter by league if specified
    if (league) {
      query = query.eq('league_key', league)
    }
    
    const { data: games, error } = await query
    
    if (error) {
      throw error
    }
    
    if (!games || games.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No games need scraping',
          games: []
        }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }
    
    console.log(`Found ${games.length} games to scrape`)
    
    // Prepare webhook payload
    const payload = {
      timestamp: new Date().toISOString(),
      source: 'supabase-edge-function',
      games: games.map(game => ({
        id: game.id,
        url: game.flashscore_url,
        league: game.league_key,
        home_team: game.home_team?.name,
        away_team: game.away_team?.name,
        date: game.date
      }))
    }
    
    // Send webhook if URL is configured
    let webhookSent = false
    if (webhookUrl) {
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Supabase-Signature': 'your-secret-key' // Optional: for security
          },
          body: JSON.stringify(payload)
        })
        
        webhookSent = webhookResponse.ok
        console.log(`Webhook sent: ${webhookSent}`)
      } catch (webhookError) {
        console.error('Webhook error:', webhookError)
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        games_found: games.length,
        webhook_sent: webhookSent,
        webhook_url: webhookUrl ? 'configured' : 'not configured',
        games: payload.games
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
    
  } catch (error) {
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
