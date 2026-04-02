#!/usr/bin/env python3
"""
Predict Premier League Round 19 matches using the improved Dixon-Coles model
"""

import subprocess
import math
from collections import defaultdict
from datetime import datetime

def query_turso(sql):
    """Execute a query against Turso database"""
    result = subprocess.run(
        ['turso', 'db', 'shell', 'protero-football', sql],
        capture_output=True,
        text=True
    )
    return result.stdout

def fetch_all_matches():
    """Fetch all Premier League matches with complete stats (rounds 1-18)"""
    sql = """
    SELECT 
        g.id || '|' || g.round || '|' ||
        g.home_team_id || '|' || g.away_team_id || '|' ||
        h.name || '|' || a.name || '|' ||
        g.home_goals || '|' || g.away_goals || '|' ||
        COALESCE(g.home_shots, 0) || '|' || COALESCE(g.away_shots, 0) || '|' ||
        COALESCE(g.home_shots_on_target, 0) || '|' || COALESCE(g.away_shots_on_target, 0) || '|' ||
        COALESCE(g.home_possession_pct, 50) || '|' || COALESCE(g.away_possession_pct, 50) || '|' ||
        COALESCE(g.home_corners, 0) || '|' || COALESCE(g.away_corners, 0) || '|' ||
        COALESCE(g.home_fouls, 0) || '|' || COALESCE(g.away_fouls, 0) as data
    FROM games g
    JOIN teams h ON g.home_team_id = h.id
    JOIN teams a ON g.away_team_id = a.id
    WHERE g.league_key = 'premier_league' 
    AND g.status = 'completed'
    ORDER BY g.round, g.id
    """
    
    output = query_turso(sql)
    lines = output.split('\n')
    
    matches = []
    for line in lines[1:]:
        if not line.strip() or 'DATA' in line:
            continue
        
        parts = line.strip().split('|')
        if len(parts) < 17:
            continue
        
        try:
            matches.append({
                'id': int(parts[0]),
                'round': int(parts[1]),
                'home_team_id': int(parts[2]),
                'away_team_id': int(parts[3]),
                'home_name': parts[4],
                'away_name': parts[5],
                'home_goals': int(parts[6]),
                'away_goals': int(parts[7]),
                'home_shots': int(parts[8]),
                'away_shots': int(parts[9]),
                'home_shots_on_target': int(parts[10]),
                'away_shots_on_target': int(parts[11]),
                'home_possession': int(parts[12]),
                'away_possession': int(parts[13]),
                'home_corners': int(parts[14]),
                'away_corners': int(parts[15]),
                'home_fouls': int(parts[16]),
                'away_fouls': int(parts[17]),
            })
        except (ValueError, IndexError) as e:
            print(f"Error parsing line: {line[:50]}... - {e}")
            continue
    
    return matches

def fetch_round_19_fixtures():
    """Fetch round 19 fixtures"""
    sql = """
    SELECT 
        g.id || '|' || g.round || '|' ||
        g.home_team_id || '|' || g.away_team_id || '|' ||
        h.name || '|' || a.name as data
    FROM games g
    JOIN teams h ON g.home_team_id = h.id
    JOIN teams a ON g.away_team_id = a.id
    WHERE g.league_key = 'premier_league' 
    AND g.round = 19
    ORDER BY g.id
    """
    
    output = query_turso(sql)
    lines = output.split('\n')
    
    fixtures = []
    for line in lines[1:]:
        if not line.strip() or 'DATA' in line:
            continue
        
        parts = line.strip().split('|')
        if len(parts) < 6:
            continue
        
        try:
            fixtures.append({
                'id': int(parts[0]),
                'round': int(parts[1]),
                'home_team_id': int(parts[2]),
                'away_team_id': int(parts[3]),
                'home_name': parts[4],
                'away_name': parts[5]
            })
        except (ValueError, IndexError) as e:
            print(f"Error parsing fixture: {line[:50]}... - {e}")
            continue
    
    return fixtures

def calculate_team_metrics(matches, team_id, before_round, last_n=None):
    """Calculate comprehensive team metrics"""
    metrics = {
        'matches': 0,
        'goals_for': 0,
        'goals_against': 0,
        'home_goals_for': 0,
        'away_goals_for': 0,
        'shots_for': 0,
        'shots_against': 0,
        'shots_on_target_for': 0,
        'shots_on_target_against': 0,
        'possession_avg': 0,
        'corners_for': 0,
        'corners_against': 0,
        'wins': 0,
        'draws': 0,
        'losses': 0,
        'points': 0
    }
    
    team_matches = []
    for m in matches:
        if m['round'] >= before_round:
            continue
        if m['home_team_id'] == team_id or m['away_team_id'] == team_id:
            team_matches.append(m)
    
    if last_n:
        team_matches = team_matches[-last_n:]
    
    for m in team_matches:
        if m['home_team_id'] == team_id:
            metrics['goals_for'] += m['home_goals']
            metrics['goals_against'] += m['away_goals']
            metrics['home_goals_for'] += m['home_goals']
            metrics['shots_for'] += m['home_shots']
            metrics['shots_against'] += m['away_shots']
            metrics['shots_on_target_for'] += m['home_shots_on_target']
            metrics['shots_on_target_against'] += m['away_shots_on_target']
            metrics['possession_avg'] += m['home_possession']
            metrics['corners_for'] += m['home_corners']
            metrics['corners_against'] += m['away_corners']
            
            if m['home_goals'] > m['away_goals']:
                metrics['wins'] += 1
                metrics['points'] += 3
            elif m['home_goals'] == m['away_goals']:
                metrics['draws'] += 1
                metrics['points'] += 1
            else:
                metrics['losses'] += 1
        else:
            metrics['goals_for'] += m['away_goals']
            metrics['goals_against'] += m['home_goals']
            metrics['away_goals_for'] += m['away_goals']
            metrics['shots_for'] += m['away_shots']
            metrics['shots_against'] += m['home_shots']
            metrics['shots_on_target_for'] += m['away_shots_on_target']
            metrics['shots_on_target_against'] += m['home_shots_on_target']
            metrics['possession_avg'] += m['away_possession']
            metrics['corners_for'] += m['away_corners']
            metrics['corners_against'] += m['home_corners']
            
            if m['away_goals'] > m['home_goals']:
                metrics['wins'] += 1
                metrics['points'] += 3
            elif m['away_goals'] == m['home_goals']:
                metrics['draws'] += 1
                metrics['points'] += 1
            else:
                metrics['losses'] += 1
        
        metrics['matches'] += 1
    
    if metrics['matches'] > 0:
        metrics['possession_avg'] /= metrics['matches']
        metrics['goals_for_avg'] = metrics['goals_for'] / metrics['matches']
        metrics['goals_against_avg'] = metrics['goals_against'] / metrics['matches']
        metrics['shots_for_avg'] = metrics['shots_for'] / metrics['matches']
        metrics['shots_on_target_pct'] = (metrics['shots_on_target_for'] / metrics['shots_for'] * 100) if metrics['shots_for'] > 0 else 0
        metrics['conversion_rate'] = (metrics['goals_for'] / metrics['shots_on_target_for'] * 100) if metrics['shots_on_target_for'] > 0 else 0
    
    return metrics

def predict_match(fixture, historical_matches):
    """Predict a single match using Dixon-Coles model"""
    home_id = fixture['home_team_id']
    away_id = fixture['away_team_id']
    
    # Calculate season-long metrics (rounds 1-18)
    home_season = calculate_team_metrics(historical_matches, home_id, 19)
    away_season = calculate_team_metrics(historical_matches, away_id, 19)
    
    # Calculate recent form (last 5 matches)
    home_form = calculate_team_metrics(historical_matches, home_id, 19, last_n=5)
    away_form = calculate_team_metrics(historical_matches, away_id, 19, last_n=5)
    
    if home_season['matches'] < 3 or away_season['matches'] < 3:
        return None
    
    # Form weighting: 70% season, 30% recent form
    home_attack = (0.7 * home_season['goals_for_avg'] + 0.3 * (home_form['goals_for_avg'] if home_form['matches'] > 0 else home_season['goals_for_avg']))
    home_defense = (0.7 * home_season['goals_against_avg'] + 0.3 * (home_form['goals_against_avg'] if home_form['matches'] > 0 else home_season['goals_against_avg']))
    away_attack = (0.7 * away_season['goals_for_avg'] + 0.3 * (away_form['goals_for_avg'] if away_form['matches'] > 0 else away_season['goals_for_avg']))
    away_defense = (0.7 * away_season['goals_against_avg'] + 0.3 * (away_form['goals_against_avg'] if away_form['matches'] > 0 else away_season['goals_against_avg']))
    
    # Shot quality factor
    home_shot_quality = home_season['shots_on_target_pct'] / 100 if home_season['shots_on_target_pct'] > 0 else 0.3
    away_shot_quality = away_season['shots_on_target_pct'] / 100 if away_season['shots_on_target_pct'] > 0 else 0.3
    
    home_attack *= (1 + home_shot_quality * 0.2)
    away_attack *= (1 + away_shot_quality * 0.2)
    
    # Home advantage
    HOME_ADVANTAGE = 1.15
    home_attack *= HOME_ADVANTAGE
    
    # Expected goals using Dixon-Coles
    league_avg_goals = sum(m['home_goals'] + m['away_goals'] for m in historical_matches) / len(historical_matches)
    
    exp_home_goals = home_attack * away_defense * (league_avg_goals / 2)
    exp_away_goals = away_attack * home_defense * (league_avg_goals / 2)
    
    # Calculate probabilities using Poisson
    def poisson_prob(k, lam):
        return (lam ** k) * math.exp(-lam) / math.factorial(k)
    
    # Calculate match outcome probabilities
    home_win_prob = 0
    away_win_prob = 0
    draw_prob = 0
    
    for home_goals in range(0, 8):
        for away_goals in range(0, 8):
            prob = poisson_prob(home_goals, exp_home_goals) * poisson_prob(away_goals, exp_away_goals)
            if home_goals > away_goals:
                home_win_prob += prob
            elif away_goals > home_goals:
                away_win_prob += prob
            else:
                draw_prob += prob
    
    # Normalize
    total = home_win_prob + draw_prob + away_win_prob
    home_win_pct = (home_win_prob / total) * 100
    draw_pct = (draw_prob / total) * 100
    away_win_pct = (away_win_prob / total) * 100
    
    # Over/Under 2.5 probability
    over_25_prob = 0
    for total_goals in range(3, 15):
        for home_goals in range(0, min(total_goals + 1, 8)):
            away_goals = total_goals - home_goals
            if away_goals >= 8:
                continue
            over_25_prob += poisson_prob(home_goals, exp_home_goals) * poisson_prob(away_goals, exp_away_goals)
    
    return {
        'game_id': fixture['id'],
        'home_win_prob': round(home_win_pct, 1),
        'draw_prob': round(draw_pct, 1),
        'away_win_prob': round(away_win_pct, 1),
        'exp_home_goals': round(exp_home_goals, 2),
        'exp_away_goals': round(exp_away_goals, 2),
        'exp_total_goals': round(exp_home_goals + exp_away_goals, 2),
        'over_25_prob': round(over_25_prob * 100, 1),
        'under_25_prob': round((1 - over_25_prob) * 100, 1)
    }

def save_prediction(pred):
    """Save prediction to database"""
    sql = f"""
    INSERT INTO predictions (
        game_id, home_win_prob, draw_prob, away_win_prob,
        exp_home_goals, exp_away_goals, over_25_prob
    ) VALUES (
        {pred['game_id']}, {pred['home_win_prob']}, {pred['draw_prob']}, {pred['away_win_prob']},
        {pred['exp_home_goals']}, {pred['exp_away_goals']}, {pred['over_25_prob']}
    )
    """
    query_turso(sql)

def main():
    print("🔍 Fetching historical data (Rounds 1-18)...")
    historical_matches = fetch_all_matches()
    print(f"✅ Loaded {len(historical_matches)} completed matches")
    
    print("\n🔍 Fetching Round 19 fixtures...")
    fixtures = fetch_round_19_fixtures()
    print(f"✅ Found {len(fixtures)} fixtures to predict")
    
    print("\n📊 Generating predictions...\n")
    predictions = []
    
    for fixture in fixtures:
        pred = predict_match(fixture, historical_matches)
        if pred:
            predictions.append(pred)
            
            # Determine most likely outcome
            max_prob = max(pred['home_win_prob'], pred['draw_prob'], pred['away_win_prob'])
            if pred['home_win_prob'] == max_prob:
                outcome = "HOME"
            elif pred['away_win_prob'] == max_prob:
                outcome = "AWAY"
            else:
                outcome = "DRAW"
            
            ou_pred = "OVER" if pred['over_25_prob'] > pred['under_25_prob'] else "UNDER"
            
            print(f"{fixture['home_name']:20} vs {fixture['away_name']:20}")
            print(f"  Prediction: {outcome:5} (H:{pred['home_win_prob']}% D:{pred['draw_prob']}% A:{pred['away_win_prob']}%)")
            print(f"  Expected Goals: {pred['exp_home_goals']} - {pred['exp_away_goals']} (Total: {pred['exp_total_goals']})")
            print(f"  Over/Under 2.5: {ou_pred} ({pred['over_25_prob']}% / {pred['under_25_prob']}%)")
            print()
            
            # Save to database
            save_prediction(pred)
    
    print(f"\n✅ Saved {len(predictions)} predictions to database")

if __name__ == "__main__":
    main()
