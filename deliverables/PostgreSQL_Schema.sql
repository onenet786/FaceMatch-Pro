-- FaceMatch Pro: Production Database Schema with pgvector
-- Target Engine: PostgreSQL 15+ with pgvector extension

-- 1. Enable the pgvector extension for biometric vector calculations
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('Super Admin', 'Admin / Operator', 'Viewer / Auditor', 'Mobile App User');
CREATE TYPE match_status AS ENUM ('Match', 'Possible Match', 'No Match', 'Unknown');
CREATE TYPE alert_status AS ENUM ('Unresolved', 'Acknowledged', 'Resolved');

-- 3. TABLES

-- Roles and Permissions Model
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name user_role UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT REFERENCES roles(id),
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enrolled Persons Directory (Identity Profiles)
CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    cnic VARCHAR(20) UNIQUE NOT NULL, -- National ID Check
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    category VARCHAR(50) DEFAULT 'Employee', -- Employee, Visitor, VIP, Watchlist, Contractor
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, disabled
    consent_signed BOOLEAN DEFAULT FALSE, -- GDPR/Data Privacy consent tracking
    registered_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Raw Biometric Sample Reference Files
CREATE TABLE IF NOT EXISTS face_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL, -- Path to secure blob storage (e.g., S3/Cloud Storage)
    is_baseline BOOLEAN DEFAULT FALSE,
    blur_score REAL,
    resolution VARCHAR(20),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Biometric Vectors (Linked with Person)
CREATE TABLE IF NOT EXISTS face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    face_sample_id UUID REFERENCES face_samples(id) ON DELETE CASCADE,
    -- InsightFace produces a 512-dimension vector embedding
    embedding vector(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HNSW Vector Index for Sub-millisecond Cosine Distance Search
-- m = 16, ef_construction = 64
CREATE INDEX ON face_embeddings USING hnsw (embedding vector_cosine_ops);

-- System Biometric Matching Log
CREATE TABLE IF NOT EXISTS match_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    matched_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    similarity_score REAL NOT NULL,
    confidence_percentage REAL NOT NULL,
    match_status match_status NOT NULL,
    camera_source VARCHAR(100) NOT NULL,
    operator_user_id UUID REFERENCES users(id),
    snapshot_url VARCHAR(255) -- CCTV Segment Frame File Path
);

-- Admin enrollment Audit Logs
CREATE TABLE IF NOT EXISTS enrollment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    operator_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- Register, Update, Re-enroll, Delete
    person_id UUID,
    person_name VARCHAR(150),
    details TEXT
);

-- Security Alerting Watchlists
CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    severity VARCHAR(20) DEFAULT 'high',
    action_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    watchlist_id INT REFERENCES watchlist(id) ON DELETE CASCADE,
    matched_person_id UUID REFERENCES persons(id),
    similarity_score REAL,
    camera_source VARCHAR(100),
    status alert_status DEFAULT 'Unresolved',
    operator_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Global System settings
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    similarity_threshold INT DEFAULT 80,
    face_detection_confidence INT DEFAULT 75,
    min_resolution_width INT DEFAULT 640,
    min_resolution_height INT DEFAULT 480,
    reject_blurry BOOLEAN DEFAULT TRUE,
    reject_masked BOOLEAN DEFAULT TRUE,
    data_retention_days INT DEFAULT 365,
    multi_location_support BOOLEAN DEFAULT TRUE,
    attendance_mode BOOLEAN DEFAULT FALSE,
    active_branch VARCHAR(100) DEFAULT 'Main Corporate HQ',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Access Audit Trails
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- LOGIN, SETTINGS_CHANGE, RECORD_ACCESS, VECTOR_WIPE
    ip_address VARCHAR(45) NOT NULL,
    details TEXT
);

-- 4. INITIAL SEEDING DATA
INSERT INTO roles (name, description) VALUES 
('Super Admin', 'Full system control, parameter tuning, and database overrides.'),
('Admin / Operator', 'Perform enrollments, view matching streams, and resolve alerts.'),
('Viewer / Auditor', 'Read-only access to audit trails, access reports, and metrics logs.'),
('Mobile App User', 'Field terminal operator with scanning, match querying, and offline buffer queue.');

INSERT INTO permissions (code_name, display_name, description) VALUES
('FACE_ENROLL', 'Biometric Enrollment', 'Add persons and register facial baseline signatures.'),
('FACE_MATCH', 'Biometric Comparison', 'Query 1:1 or 1:N face match engines.'),
('ALERT_RESOLVE', 'Resolve Security Alerts', 'Write notes to resolve active Watchlist triggers.'),
('SETTINGS_WRITE', 'Modify Thresholds', 'Alter similarity and resolution metrics.');
