-- Update check_and_increment_generation to accept user timezone
-- so daily limits reset at midnight in the user's local time
CREATE OR REPLACE FUNCTION check_and_increment_generation(p_user_id UUID, p_timezone TEXT DEFAULT 'UTC')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row entitlements%ROWTYPE;
  v_limit INTEGER;
  v_used INTEGER;
  v_allowed BOOLEAN;
  v_today DATE;
BEGIN
  -- Get today's date in the user's timezone
  v_today := (now() AT TIME ZONE p_timezone)::date;

  -- Lazy-create a free entitlement row if none exists
  INSERT INTO entitlements (user_id, plan, free_generations_used, daily_generations_used, last_generation_date)
  VALUES (p_user_id, 'free', 0, 0, v_today)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock the row for atomic update
  SELECT * INTO v_row FROM entitlements WHERE user_id = p_user_id FOR UPDATE;

  -- Reset daily counter if it's a new day in the user's timezone
  IF v_row.last_generation_date < v_today THEN
    v_row.daily_generations_used := 0;
    v_row.last_generation_date := v_today;
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
          last_generation_date = v_today,
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
          last_generation_date = v_today,
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
