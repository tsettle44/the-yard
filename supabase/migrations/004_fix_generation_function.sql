-- Fix: ensure generation limit columns and function exist,
-- and notify PostgREST to reload its schema cache.
-- This resolves "Failed to check generation limit" errors that occur when
-- PostgREST's schema cache doesn't include the check_and_increment_generation function.

-- Ensure columns exist (idempotent)
ALTER TABLE entitlements ADD COLUMN IF NOT EXISTS daily_generations_used INTEGER DEFAULT 0;
ALTER TABLE entitlements ADD COLUMN IF NOT EXISTS last_generation_date DATE DEFAULT CURRENT_DATE;

-- Re-create the function (CREATE OR REPLACE is idempotent)
CREATE OR REPLACE FUNCTION check_and_increment_generation(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row entitlements%ROWTYPE;
  v_limit INTEGER;
  v_used INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- Lazy-create a free entitlement row if none exists
  INSERT INTO entitlements (user_id, plan, free_generations_used, daily_generations_used, last_generation_date)
  VALUES (p_user_id, 'free', 0, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock the row for atomic update
  SELECT * INTO v_row FROM entitlements WHERE user_id = p_user_id FOR UPDATE;

  -- Reset daily counter if it's a new day
  IF v_row.last_generation_date < CURRENT_DATE THEN
    v_row.daily_generations_used := 0;
    v_row.last_generation_date := CURRENT_DATE;
  END IF;

  -- Check limits based on plan
  IF v_row.plan = 'free' THEN
    v_limit := 3;
    v_used := v_row.free_generations_used;
    v_allowed := v_used < v_limit;

    IF v_allowed THEN
      UPDATE entitlements
      SET free_generations_used = free_generations_used + 1,
          daily_generations_used = v_row.daily_generations_used + 1,
          last_generation_date = CURRENT_DATE,
          updated_at = now()
      WHERE user_id = p_user_id;

      v_used := v_used + 1;
    END IF;
  ELSE
    -- Paid plan: daily limit
    v_limit := 3;
    v_used := v_row.daily_generations_used;
    v_allowed := v_used < v_limit;

    IF v_allowed THEN
      UPDATE entitlements
      SET daily_generations_used = v_row.daily_generations_used + 1,
          last_generation_date = CURRENT_DATE,
          updated_at = now()
      WHERE user_id = p_user_id;

      v_used := v_used + 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'plan', v_row.plan,
    'used', v_used,
    'limit', v_limit,
    'remaining', GREATEST(v_limit - v_used, 0)
  );
END;
$$;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
