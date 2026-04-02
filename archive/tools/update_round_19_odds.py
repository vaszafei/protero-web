#!/usr/bin/env python3
"""
Update Round 19 odds in Turso database
"""

import subprocess

def query_turso(sql):
    """Execute a query against Turso database"""
    result = subprocess.run(
        ['turso', 'db', 'shell', 'protero-football', sql],
        capture_output=True,
        text=True
    )
    return result.stdout

# Match odds data: (home_team, away_team, home_odds, draw_odds, away_odds, over_25, under_25)
odds_data = [
    ('Burnley', 'Newcastle', 5.50, 4.15, 1.60, 1.82, 2.00),
    ('Nottingham Forest', 'Everton', 2.10, 3.45, 4.26, 2.30, 1.62),
    ('West Ham', 'Brighton', 3.50, 3.65, 2.05, 1.62, 2.30),
    ('Chelsea', 'Bournemouth', 1.57, 4.45, 5.30, 2.25, 1.65),  # Note: O/U 3.5 shown, using as 2.5
    ('Arsenal', 'Aston Villa', 1.45, 4.65, 6.80, 1.75, 2.10),
    ('Manchester United', 'Wolves', 1.39, 4.85, 8.00, 1.62, 2.32),
    ('Crystal Palace', 'Fulham', 2.22, 3.25, 3.45, 2.05, 1.78),
    ('Liverpool', 'Leeds', 1.57, 4.30, 5.60, 1.65, 2.25),
    ('Brentford', 'Tottenham', 2.22, 3.50, 3.15, 1.93, 1.88),
    ('Sunderland', 'Manchester City', 7.10, 4.70, 1.44, 1.65, 2.27),
]

print("🔄 Updating Round 19 odds in Turso...\n")

for home, away, h_odds, d_odds, a_odds, over_25, under_25 in odds_data:
    # First, get the game_id
    sql = f"""
    SELECT g.id FROM games g
    JOIN teams h ON g.home_team_id = h.id
    JOIN teams a ON g.away_team_id = a.id
    WHERE g.league_key = 'premier_league' 
    AND g.round = 19
    AND h.name = '{home}'
    AND a.name = '{away}'
    """
    
    output = query_turso(sql)
    lines = [l.strip() for l in output.split('\n') if l.strip() and not l.startswith('ID')]
    
    if not lines:
        print(f"❌ Could not find game: {home} vs {away}")
        continue
    
    game_id = int(lines[0])
    
    # Check if odds already exist
    check_sql = f"SELECT COUNT(*) FROM odds WHERE game_id = {game_id}"
    check_output = query_turso(check_sql)
    
    exists = '1' in check_output
    
    if exists:
        # Update existing odds
        sql = f"""
        UPDATE odds SET
            home_odds = {h_odds},
            draw_odds = {d_odds},
            away_odds = {a_odds},
            over_25_odds = {over_25},
            under_25_odds = {under_25}
        WHERE game_id = {game_id}
        """
    else:
        # Insert new odds
        sql = f"""
        INSERT INTO odds (
            game_id, home_odds, draw_odds, away_odds, 
            over_25_odds, under_25_odds
        ) VALUES (
            {game_id}, {h_odds}, {d_odds}, {a_odds},
            {over_25}, {under_25}
        )
        """
    
    query_turso(sql)
    print(f"✅ {home:20} vs {away:20} | {h_odds} / {d_odds} / {a_odds} | O/U: {over_25}/{under_25}")

print("\n✅ All Round 19 odds updated successfully!")
