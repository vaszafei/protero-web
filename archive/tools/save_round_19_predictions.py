#!/usr/bin/env python3
"""
Save Round 19 Predictions to Database
"""

import subprocess
import json

def query_turso(sql):
    """Execute a query against Turso database"""
    result = subprocess.run(
        ['turso', 'db', 'shell', 'protero-football', sql],
        capture_output=True,
        text=True
    )
    return result.stdout

# Round 19 predictions from advanced model
predictions = [
    {
        'match': 'Burnley vs Newcastle',
        'home_win': 18.1, 'draw': 17.7, 'away_win': 64.1,
        'over_15': 78.8, 'over_25': 77.0, 'over_35': 72.8,
        'exp_goals': 7.02,
        'over_corners_65': 93.8, 'over_corners_75': 88.4, 'over_corners_85': 80.6,
        'exp_corners': 11.5,
        'over_cards_25': 82.9, 'over_cards_35': 66.2,
        'exp_cards': 4.5
    },
    {
        'match': 'West Ham vs Brighton',
        'home_win': 26.0, 'draw': 19.7, 'away_win': 54.3,
        'over_15': 81.6, 'over_25': 80.4, 'over_35': 77.5,
        'exp_goals': 7.64,
        'over_corners_65': 93.2, 'over_corners_75': 87.3, 'over_corners_85': 79.1,
        'exp_corners': 11.3,
        'over_cards_25': 91.0, 'over_cards_35': 79.6,
        'exp_cards': 5.5
    },
    {
        'match': 'Chelsea vs Bournemouth',
        'home_win': 71.2, 'draw': 15.1, 'away_win': 13.7,
        'over_15': 74.1, 'over_25': 72.8, 'over_35': 69.5,
        'exp_goals': 7.32,
        'over_corners_65': 84.4, 'over_corners_75': 74.3, 'over_corners_85': 62.3,
        'exp_corners': 9.6,
        'over_cards_25': 95.5, 'over_cards_35': 88.4,
        'exp_cards': 6.4
    },
    {
        'match': 'Nottingham Forest vs Everton',
        'home_win': 42.0, 'draw': 24.0, 'away_win': 34.0,
        'over_15': 73.5, 'over_25': 65.9, 'over_35': 54.4,
        'exp_goals': 4.83,
        'over_corners_65': 87.9, 'over_corners_75': 79.2, 'over_corners_85': 68.3,
        'exp_corners': 10.1,
        'over_cards_25': 86.9, 'over_cards_35': 72.5,
        'exp_cards': 4.9
    },
    {
        'match': 'Manchester United vs Wolves',
        'home_win': 83.7, 'draw': 10.3, 'away_win': 6.1,
        'over_15': 81.6, 'over_25': 81.1, 'over_35': 79.8,
        'exp_goals': 8.91,
        'over_corners_65': 69.6, 'over_corners_75': 55.8, 'over_corners_85': 41.9,
        'exp_corners': 8.1,
        'over_cards_25': 90.7, 'over_cards_35': 79.0,
        'exp_cards': 5.4
    },
    {
        'match': 'Arsenal vs Aston Villa',
        'home_win': 67.1, 'draw': 17.5, 'away_win': 15.5,
        'over_15': 80.0, 'over_25': 74.4, 'over_35': 64.7,
        'exp_goals': 5.41,
        'over_corners_65': 84.7, 'over_corners_75': 74.8, 'over_corners_85': 62.8,
        'exp_corners': 9.7,
        'over_cards_25': 77.3, 'over_cards_35': 58.2,
        'exp_cards': 4.1
    },
    {
        'match': 'Liverpool vs Leeds',
        'home_win': 64.1, 'draw': 17.2, 'away_win': 18.7,
        'over_15': 81.1, 'over_25': 80.4, 'over_35': 78.3,
        'exp_goals': 8.25,
        'over_corners_65': 67.5, 'over_corners_75': 53.4, 'over_corners_85': 39.5,
        'exp_corners': 7.9,
        'over_cards_25': 84.6, 'over_cards_35': 68.7,
        'exp_cards': 4.7
    },
    {
        'match': 'Crystal Palace vs Fulham',
        'home_win': 52.7, 'draw': 22.0, 'away_win': 25.4,
        'over_15': 76.2, 'over_25': 72.4, 'over_35': 65.4,
        'exp_goals': 5.95,
        'over_corners_65': 78.6, 'over_corners_75': 66.7, 'over_corners_85': 53.5,
        'exp_corners': 8.9,
        'over_cards_25': 79.4, 'over_cards_35': 61.1,
        'exp_cards': 4.2
    },
    {
        'match': 'Brentford vs Tottenham',
        'home_win': 42.3, 'draw': 21.3, 'away_win': 36.4,
        'over_15': 77.4, 'over_25': 75.4, 'over_35': 71.1,
        'exp_goals': 6.88,
        'over_corners_65': 91.8, 'over_corners_75': 85.2, 'over_corners_85': 76.2,
        'exp_corners': 10.9,
        'over_cards_25': 91.7, 'over_cards_35': 80.8,
        'exp_cards': 5.6
    },
    {
        'match': 'Sunderland vs Manchester City',
        'home_win': 14.3, 'draw': 16.2, 'away_win': 69.5,
        'over_15': 81.5, 'over_25': 78.3, 'over_35': 72.0,
        'exp_goals': 6.3,
        'over_corners_65': 78.2, 'over_corners_75': 66.2, 'over_corners_85': 52.9,
        'exp_corners': 8.9,
        'over_cards_25': 89.8, 'over_cards_35': 77.4,
        'exp_cards': 5.3
    }
]

print("\n" + "="*90)
print("SAVING ROUND 19 PREDICTIONS TO DATABASE")
print("="*90 + "\n")

# Get game IDs for Round 19
sql = """
SELECT g.id, h.name || ' vs ' || a.name as match
FROM games g
JOIN teams h ON g.home_team_id = h.id
JOIN teams a ON g.away_team_id = a.id
WHERE g.league_key = 'premier_league' AND g.round = 19
ORDER BY g.id
"""

output = query_turso(sql)
lines = output.split('\n')

game_mapping = {}
for line in lines[1:]:
    if not line.strip() or 'ID' in line:
        continue
    parts = line.split()
    if len(parts) >= 2:
        try:
            game_id = int(parts[0])
            match_name = ' '.join(parts[1:])
            game_mapping[match_name] = game_id
        except:
            continue

print(f"📋 Found {len(game_mapping)} Round 19 matches in database\n")

saved_count = 0

for pred in predictions:
    match_key = pred['match']
    
    if match_key not in game_mapping:
        print(f"⚠️  Could not find game ID for: {match_key}")
        continue
    
    game_id = game_mapping[match_key]
    
    # Determine predicted outcome
    max_prob = max(pred['home_win'], pred['draw'], pred['away_win'])
    if pred['home_win'] == max_prob:
        outcome = 'HOME'
    elif pred['away_win'] == max_prob:
        outcome = 'AWAY'
    else:
        outcome = 'DRAW'
    
    confidence = int(max_prob)
    
    # Create JSON with all predictions
    details = {
        'model': 'Dixon-Coles Advanced + Hybrid',
        'probabilities': {
            'home': pred['home_win'],
            'draw': pred['draw'],
            'away': pred['away_win']
        },
        'goals': {
            'expected': pred['exp_goals'],
            'over_15': pred['over_15'],
            'over_25': pred['over_25'],
            'over_35': pred['over_35']
        },
        'corners': {
            'expected': pred['exp_corners'],
            'over_65': pred['over_corners_65'],
            'over_75': pred['over_corners_75'],
            'over_85': pred['over_corners_85']
        },
        'cards': {
            'expected': pred['exp_cards'],
            'over_25': pred['over_cards_25'],
            'over_cards_35': pred['over_cards_35']
        },
        'recommended_bets': []
    }
    
    # Add high-confidence bets
    if pred['home_win'] > 70 or pred['away_win'] > 70:
        details['recommended_bets'].append(f"1X2: {outcome} ({max_prob:.1f}%)")
    
    if pred['over_25'] > 75:
        details['recommended_bets'].append(f"Over 2.5 goals ({pred['over_25']:.1f}%)")
    
    if pred['over_corners_85'] > 75:
        details['recommended_bets'].append(f"Over 8.5 corners ({pred['over_corners_85']:.1f}%)")
    
    if pred['over_cards_35'] > 75:
        details['recommended_bets'].append(f"Over 3.5 cards ({pred['over_cards_35']:.1f}%)")
    
    explanation = json.dumps(details)
    
    # Check if prediction already exists
    check_sql = f"SELECT COUNT(*) FROM predictions WHERE game_id = {game_id}"
    check_output = query_turso(check_sql)
    exists = '1' in check_output or '2' in check_output
    
    if exists:
        # Update existing
        sql = f"""
        UPDATE predictions SET
            prediction = '{outcome}',
            confidence = {confidence},
            recommended_bet = '{details['recommended_bets'][0] if details['recommended_bets'] else 'None'}',
            explanation = '{explanation.replace("'", "''")}'
        WHERE game_id = {game_id}
        """
    else:
        # Insert new
        sql = f"""
        INSERT INTO predictions (game_id, prediction, confidence, recommended_bet, explanation)
        VALUES ({game_id}, '{outcome}', {confidence}, '{details['recommended_bets'][0] if details['recommended_bets'] else 'None'}', '{explanation.replace("'", "''")}')
        """
    
    try:
        query_turso(sql)
        print(f"✅ {match_key:<40} | {outcome:5} {confidence}% | {len(details['recommended_bets'])} bets")
        saved_count += 1
    except Exception as e:
        print(f"❌ Error saving {match_key}: {e}")

print(f"\n{'='*90}")
print(f"✅ Saved {saved_count}/10 predictions to database")
print(f"{'='*90}\n")

print("📊 Next Steps:")
print("   1. ✅ Predictions saved to database")
print("   2. 🎯 Frontend can now display predictions")
print("   3. ⏱️  Wait for Round 19 to complete")
print("   4. 📈 Calculate actual accuracy and update model")
