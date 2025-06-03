/*
  # User Management Schema

  1. New Tables
    - `admins`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `password` (text)
      - `created_at` (timestamp)
      - `is_super_admin` (boolean)
    
    - `children`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `password` (text)
      - `hint` (text)
      - `admin_id` (uuid, foreign key)
      - `created_at` (timestamp)
    
    - `game_scores`
      - `id` (uuid, primary key)
      - `child_id` (uuid, foreign key)
      - `score` (integer)
      - `played_at` (timestamp)
    
    - `feedback`
      - `id` (uuid, primary key)
      - `admin_id` (uuid, foreign key)
      - `child_id` (uuid, foreign key)
      - `message` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_super_admin boolean DEFAULT false
);

-- Create children table
CREATE TABLE IF NOT EXISTS children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  hint text,
  admin_id uuid REFERENCES admins(id),
  created_at timestamptz DEFAULT now()
);

-- Create game_scores table
CREATE TABLE IF NOT EXISTS game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES children(id),
  score integer NOT NULL,
  played_at timestamptz DEFAULT now()
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id),
  child_id uuid REFERENCES children(id),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow full access to super admins"
  ON admins
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.is_super_admin = true
  ));

CREATE POLICY "Allow admins to view their created children"
  ON children
  FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Allow admins to insert children"
  ON children
  FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Allow viewing game scores for own children"
  ON game_scores
  FOR SELECT
  TO authenticated
  USING (
    child_id IN (
      SELECT id FROM children WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Allow viewing feedback for own children"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (
    child_id IN (
      SELECT id FROM children WHERE admin_id = auth.uid()
    )
    OR admin_id = auth.uid()
  );

-- Insert initial super admin
INSERT INTO admins (username, password, is_super_admin)
VALUES ('superadmin', 'super123', true)
ON CONFLICT (username) DO NOTHING;