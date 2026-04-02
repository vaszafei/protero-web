#!/usr/bin/env python3
"""
OCR Match Statistics Extractor
Extracts match statistics from images (screenshots) using OCR
Supports: Scores, Shots, Possession, Corners, Fouls, Cards, etc.
"""

import sys
import os
import re
import json
from pathlib import Path

try:
    import pytesseract
    from PIL import Image
except ImportError:
    print("Error: Required packages not installed")
    print("Install with: pip install pytesseract pillow")
    sys.exit(1)

def extract_text_from_image(image_path):
    """Extract text from image using OCR"""
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        return text
    except Exception as e:
        print(f"Error extracting text: {e}")
        return None

def parse_match_stats(text):
    """
    Parse match statistics from OCR text
    
    Expected format (from typical match statistics screens):
    - Team names
    - Scores (0-9)
    - Possession (X%)
    - Shots (total)
    - Shots on Target
    - Corners
    - Fouls
    - Yellow/Red Cards
    - etc.
    """
    stats = {
        'home_team': None,
        'away_team': None,
        'home_goals': None,
        'away_goals': None,
        'home_shots': 0,
        'away_shots': 0,
        'home_shots_on_target': 0,
        'away_shots_on_target': 0,
        'home_possession_pct': 50,
        'away_possession_pct': 50,
        'home_corners': 0,
        'away_corners': 0,
        'home_fouls': 0,
        'away_fouls': 0,
        'home_yellow_cards': 0,
        'away_yellow_cards': 0,
        'home_red_cards': 0,
        'away_red_cards': 0
    }
    
    lines = text.strip().split('\n')
    
    # Common patterns
    score_pattern = r'(\d+)\s*[-:]\s*(\d+)'
    possession_pattern = r'(\d+)%'
    stat_line_pattern = r'(\d+)\s+([A-Za-z\s]+)\s+(\d+)'
    
    # Try to extract score
    for line in lines:
        score_match = re.search(score_pattern, line)
        if score_match and 'goal' in line.lower():
            stats['home_goals'] = int(score_match.group(1))
            stats['away_goals'] = int(score_match.group(2))
            break
    
    # Extract statistics by keyword matching
    for i, line in enumerate(lines):
        line_lower = line.lower()
        
        # Possession
        if 'possession' in line_lower or 'ball possession' in line_lower:
            poss_matches = re.findall(possession_pattern, line)
            if len(poss_matches) >= 2:
                stats['home_possession_pct'] = int(poss_matches[0])
                stats['away_possession_pct'] = int(poss_matches[1])
            elif len(poss_matches) == 1:
                # Sometimes shows as: 60% Possession 40%
                stats['home_possession_pct'] = int(poss_matches[0])
                stats['away_possession_pct'] = 100 - int(poss_matches[0])
        
        # Shots
        elif 'shots' in line_lower and 'target' not in line_lower:
            numbers = re.findall(r'\d+', line)
            if len(numbers) >= 2:
                stats['home_shots'] = int(numbers[0])
                stats['away_shots'] = int(numbers[-1])
        
        # Shots on Target
        elif 'shots on target' in line_lower or 'on target' in line_lower:
            numbers = re.findall(r'\d+', line)
            if len(numbers) >= 2:
                stats['home_shots_on_target'] = int(numbers[0])
                stats['away_shots_on_target'] = int(numbers[-1])
        
        # Corners
        elif 'corner' in line_lower:
            numbers = re.findall(r'\d+', line)
            if len(numbers) >= 2:
                stats['home_corners'] = int(numbers[0])
                stats['away_corners'] = int(numbers[-1])
        
        # Fouls
        elif 'foul' in line_lower:
            numbers = re.findall(r'\d+', line)
            if len(numbers) >= 2:
                stats['home_fouls'] = int(numbers[0])
                stats['away_fouls'] = int(numbers[-1])
        
        # Yellow Cards
        elif 'yellow' in line_lower or 'booking' in line_lower:
            numbers = re.findall(r'\d+', line)
            if len(numbers) >= 2:
                stats['home_yellow_cards'] = int(numbers[0])
                stats['away_yellow_cards'] = int(numbers[-1])
        
        # Red Cards
        elif 'red card' in line_lower or 'sending off' in line_lower:
            numbers = re.findall(r'\d+', line)
            if len(numbers) >= 2:
                stats['home_red_cards'] = int(numbers[0])
                stats['away_red_cards'] = int(numbers[-1])
    
    return stats

def extract_table_format(text):
    """
    Extract statistics from table format
    Common in sofascore, flashscore, etc.
    
    Format:
    Statistic       Home  Away
    Shots           12    8
    On Target       5     3
    Possession      58%   42%
    """
    stats = {}
    lines = text.strip().split('\n')
    
    for line in lines:
        # Look for lines with stat name and two numbers
        parts = line.split()
        if len(parts) >= 3:
            stat_name = parts[0].lower()
            try:
                home_val = int(re.sub(r'[^\d]', '', parts[-2]))
                away_val = int(re.sub(r'[^\d]', '', parts[-1]))
                
                # Map to our stat names
                if 'shot' in stat_name and 'target' not in stat_name:
                    stats['home_shots'] = home_val
                    stats['away_shots'] = away_val
                elif 'target' in stat_name or 'on target' in line.lower():
                    stats['home_shots_on_target'] = home_val
                    stats['away_shots_on_target'] = away_val
                elif 'corner' in stat_name:
                    stats['home_corners'] = home_val
                    stats['away_corners'] = away_val
                elif 'foul' in stat_name:
                    stats['home_fouls'] = home_val
                    stats['away_fouls'] = away_val
                elif 'yellow' in stat_name:
                    stats['home_yellow_cards'] = home_val
                    stats['away_yellow_cards'] = away_val
            except (ValueError, IndexError):
                continue
    
    return stats

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_match_stats_ocr.py <image_path>")
        print("\nExample:")
        print("  python extract_match_stats_ocr.py screenshots/match_stats.png")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(f"Error: Image file not found: {image_path}")
        sys.exit(1)
    
    print(f"📸 Extracting text from: {image_path}")
    text = extract_text_from_image(image_path)
    
    if not text:
        print("❌ Failed to extract text from image")
        sys.exit(1)
    
    print("\n" + "="*60)
    print("RAW OCR TEXT:")
    print("="*60)
    print(text)
    print("="*60 + "\n")
    
    # Try both parsing methods
    print("🔍 Parsing statistics...")
    stats1 = parse_match_stats(text)
    stats2 = extract_table_format(text)
    
    # Merge results (prefer stats2 if available)
    final_stats = {**stats1, **stats2}
    
    print("\n" + "="*60)
    print("EXTRACTED STATISTICS:")
    print("="*60)
    print(json.dumps(final_stats, indent=2))
    print("="*60 + "\n")
    
    # Save to JSON file
    output_path = Path(image_path).stem + '_stats.json'
    with open(output_path, 'w') as f:
        json.dump(final_stats, f, indent=2)
    
    print(f"✅ Statistics saved to: {output_path}")
    print("\n📋 To update Turso database:")
    print(f"   Use the admin panel to paste these values,")
    print(f"   or call: curl -X PATCH http://localhost:3000/api/admin/games/[id] \\")
    print(f"            -H 'Content-Type: application/json' \\")
    print(f"            -d @{output_path}")

if __name__ == '__main__':
    main()
