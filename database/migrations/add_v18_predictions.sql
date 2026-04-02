-- Migration: Add V18 multi-market predictions support
-- Date: February 5, 2026
-- Purpose: Add columns for V18 goals and corners predictions

-- Add V18 goals markets
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS over_15_prob INTEGER CHECK (over_15_prob >= 0 AND over_15_prob <= 100),
ADD COLUMN IF NOT EXISTS over_25_prob INTEGER CHECK (over_25_prob >= 0 AND over_25_prob <= 100),
ADD COLUMN IF NOT EXISTS over_35_prob INTEGER CHECK (over_35_prob >= 0 AND over_35_prob <= 100);

-- Add V18 corners markets
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS over_85_corners_prob INTEGER CHECK (over_85_corners_prob >= 0 AND over_85_corners_prob <= 100),
ADD COLUMN IF NOT EXISTS over_95_corners_prob INTEGER CHECK (over_95_corners_prob >= 0 AND over_95_corners_prob <= 100),
ADD COLUMN IF NOT EXISTS over_105_corners_prob INTEGER CHECK (over_105_corners_prob >= 0 AND over_105_corners_prob <= 100);

-- Add odds columns for V18
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS odds_over_25 NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS odds_under_25 NUMERIC(6,2);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_predictions_game_model ON predictions(game_id, model_version);
CREATE INDEX IF NOT EXISTS idx_predictions_model_version ON predictions(model_version);

-- Comment the table
COMMENT ON COLUMN predictions.over_15_prob IS 'Probability of over 1.5 goals (V18)';
COMMENT ON COLUMN predictions.over_25_prob IS 'Probability of over 2.5 goals (V18)';
COMMENT ON COLUMN predictions.over_35_prob IS 'Probability of over 3.5 goals (V18)';
COMMENT ON COLUMN predictions.over_85_corners_prob IS 'Probability of over 8.5 corners (V18)';
COMMENT ON COLUMN predictions.over_95_corners_prob IS 'Probability of over 9.5 corners (V18)';
COMMENT ON COLUMN predictions.over_105_corners_prob IS 'Probability of over 10.5 corners (V18)';
