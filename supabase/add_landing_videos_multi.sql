-- Add two more video URL columns to landing_config
ALTER TABLE landing_config
  ADD COLUMN IF NOT EXISTS youtube_video_url_2 text,
  ADD COLUMN IF NOT EXISTS youtube_video_url_3 text;
