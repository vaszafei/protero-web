#!/usr/bin/env python3
"""
Validate Round 19 Predictions
Compare predicted outcomes vs actual results
Calculate accuracy and analyze performance
"""

import subprocess
import json

def query_turso(sql):
    result = subprocess.run(
        ['turso', 'db', 'shell', 'protero-football', sql],
        capture_output=True,
        text=True
    )
    return result.stdout

def fetch_round_19_results():
    """Fetch Round 19 matches with predictions and actual results"""
    sql = """
    SELECT 
        g.id || '|' || h.name || '|' || a.name || '|' ||
        COALESCE(g.home_goals, -1) || '|' || COALESCE(g.away_goals, -1) || '|' ||
        COALESCE(p.prediction, 'NONE') || '|' || 
        COALESCE(p.confidence, 0) || '|' ||
        COALESCE(p.explanation, '{}') as data
    FROM games g
    JOIN teams h ON g.home_team_id = h.id
    JOIN teams a ON g.away_team_id = a.id
    LEFT JOIN predictions p ON g.id = p.game_id
    WHERE g.league_key = 'premier_league' AND g.round = 19
    ORDER BY g.id
    """
    
    output = query_turso(sql)
    lines = output.split('\n')
    
    matches = []
    for line in lines[1:]:
        if not line.strip() or 'DATA' in line:
            continue
        
        parts = line.strip().split('|')
        if len(parts) < 8:
            continue
        
        try:
            explanation = {}
            try:
                explanation = json.loads(parts[7])
            except:
                pass
            
            matches.append({
                'id': int(parts[0]),
                'home_name': parts[1],
                'away_name': parts[2],
                'home_goals': int(parts[3]) if parts[3] != '-1' else None,
                'away_goals': int(parts[4]) if parts[4] != '-1' else None,
                'predicted': parts[5],
                'confidence': int(parts[6]),
                'explanation': explanation
            })
        except (ValueError, IndexError) as e:
            continue
    
    return matches

def get_actual_outcome(home_goals, away_goals):
    """Determine actual match outcome"""
    if home_goals is None or away_goals is None:
        return None
    
    if home_goals > away_goals:
        return 'HOME'
    elif away_goals > home_goals:
        return 'AWAY'
    else:
        return 'DRAW'

def calculate_accuracy_by_confidence(matches):
    """Calculate accuracy grouped by confidence level"""
    high_conf = []  # >=70%
    med_conf = []   # 60-69%
    low_conf = []   # <60%
    
    for m in matches:
        if m['predicted'] == 'NONE' or get_actual_outcome(m['home_goals'], m['away_goals']) is None:
            continue
        
        actual = get_actual_outcome(m['home_goals'], m['away_goals'])
        correct = (m['predicted'] == actual)
        
        if m['confidence'] >= 70:
            high_conf.append(correct)
        elif m['confidence'] >= 60:
            med_conf.append(correct)
        else:
            low_conf.append(correct)
    
    return {
        'high': {'correct': sum(high_conf), 'total': len(high_conf), 
                 'accuracy': sum(high_conf)/len(high_conf)*100 if high_conf else 0},
        'medium': {'correct': sum(med_conf), 'total': len(med_conf),
                   'accuracy': sum(med_conf)/len(med_conf)*100 if med_conf else 0},
        'low': {'correct': sum(low_conf), 'total': len(low_conf),
                'accuracy': sum(low_conf)/len(low_conf)*100 if low_conf else 0}
    }

print("\n" + "="*100)
print("ROUND 19 PREDICTION VALIDATION")
print("="*100 + "\n")

matches = fetch_round_19_results()
print(f"📊 Loaded {len(matches)} Round 19 matches\n")

# Check if round is complete
complete_matches = [m for m in matches if m['home_goals'] is not None]
pending_matches = len(matches) - len(complete_matches)

if pending_matches > 0:
    print(f"⚠️  Round 19 not yet complete!")
    print(f"   • Completed: {len(complete_matches)}/{len(matches)} matches")
    print(f"   • Pending: {pending_matches} matches\n")
    print("🕐 Please wait for all matches to complete before validation.\n")
    
    if len(complete_matches) > 0:
        print("📋 Partial Results (completed matches only):\n")
else:
    print("✅ Round 19 complete - all matches played\n")

# Calculate overall accuracy
correct = 0
total = 0
no_prediction = 0

print(f"{'Match':<45} | {'Predicted':<10} | {'Actual':<10} | {'Conf':<6} | {'Result'}")
print("-" * 100)

for match in matches:
    match_str = f"{match['home_name']} vs {match['away_name']}"
    
    if match['predicted'] == 'NONE':
        no_prediction += 1
        print(f"⚠️  {match_str:<45} | No prediction available")
        continue
    
    actual = get_actual_outcome(match['home_goals'], match['away_goals'])
    
    if actual is None:
        print(f"⏳ {match_str:<45} | {match['predicted']:<10} | Pending    | {match['confidence']:>5}% | -")
        continue
    
    total += 1
    is_correct = (match['predicted'] == actual)
    if is_correct:
        correct += 1
    
    result_icon = "✅" if is_correct else "❌"
    score = f"{match['home_goals']}-{match['away_goals']}"
    
    print(f"{result_icon} {match_str:<45} | {match['predicted']:<10} | {actual:<10} | {match['confidence']:>5}% | {score}")

print("\n" + "="*100)
print("OVERALL RESULTS")
print("="*100 + "\n")

if total > 0:
    accuracy = (correct / total) * 100
    print(f"🎯 Accuracy: {correct}/{total} = {accuracy:.1f}%")
    print(f"   • Expected: 55.4% (based on backtest)")
    
    if accuracy >= 55.4:
        print(f"   • Performance: ✅ BEAT EXPECTATION (+{accuracy - 55.4:.1f}%)")
    else:
        print(f"   • Performance: ⚠️  BELOW EXPECTATION ({accuracy - 55.4:.1f}%)")
    
    print(f"\n📊 Comparison:")
    print(f"   • Actual:   {accuracy:.1f}%")
    print(f"   • Expected: 55.4%")
    print(f"   • Original: 52.7%")
    print(f"   • Random:   33.3%")
    
    # Accuracy by confidence level
    by_conf = calculate_accuracy_by_confidence(matches)
    
    print(f"\n🎚️  Accuracy by Confidence Level:")
    print(f"   • High (≥70%):   {by_conf['high']['correct']}/{by_conf['high']['total']} = {by_conf['high']['accuracy']:.1f}%")
    print(f"   • Medium (60-69%): {by_conf['medium']['correct']}/{by_conf['medium']['total']} = {by_conf['medium']['accuracy']:.1f}%")
    print(f"   • Low (<60%):    {by_conf['low']['correct']}/{by_conf['low']['total']} = {by_conf['low']['accuracy']:.1f}%")
    
    # Best and worst predictions
    correct_predictions = [m for m in matches if m['predicted'] != 'NONE' and get_actual_outcome(m['home_goals'], m['away_goals']) == m['predicted']]
    incorrect_predictions = [m for m in matches if m['predicted'] != 'NONE' and get_actual_outcome(m['home_goals'], m['away_goals']) is not None and get_actual_outcome(m['home_goals'], m['away_goals']) != m['predicted']]
    
    if correct_predictions:
        print(f"\n✅ Correct Predictions ({len(correct_predictions)}):")
        for m in sorted(correct_predictions, key=lambda x: x['confidence'], reverse=True)[:3]:
            print(f"   • {m['home_name']} vs {m['away_name']}: {m['predicted']} ({m['confidence']}%)")
    
    if incorrect_predictions:
        print(f"\n❌ Incorrect Predictions ({len(incorrect_predictions)}):")
        for m in sorted(incorrect_predictions, key=lambda x: x['confidence'], reverse=True)[:3]:
            actual = get_actual_outcome(m['home_goals'], m['away_goals'])
            print(f"   • {m['home_name']} vs {m['away_name']}: Predicted {m['predicted']}, Actual {actual} ({m['confidence']}%)")
    
    # ROI potential (assuming -110 odds average)
    print(f"\n💰 ROI Analysis (theoretical):")
    if by_conf['high']['total'] > 0:
        high_roi = (by_conf['high']['accuracy'] - 52.4) / 52.4 * 100  # Break-even at 52.4% with -110 odds
        print(f"   • High confidence bets: {high_roi:+.1f}% ROI")
    if by_conf['medium']['total'] > 0:
        med_roi = (by_conf['medium']['accuracy'] - 52.4) / 52.4 * 100
        print(f"   • Medium confidence bets: {med_roi:+.1f}% ROI")
    
else:
    print("⏳ No completed matches with predictions yet")

if no_prediction > 0:
    print(f"\n⚠️  {no_prediction} matches without predictions")

print("\n" + "="*100 + "\n")

print("💡 Next Steps:")
if pending_matches > 0:
    print("   1. Wait for remaining matches to complete")
    print("   2. Re-run this validation script")
else:
    print("   1. Analyze errors to improve model")
    print("   2. Apply lessons to Round 20 predictions")
    print("   3. Consider alternative markets (corners, cards)")
    print("   4. Test on other leagues (Bundesliga, La Liga)")
print("")
