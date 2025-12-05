-- SpeechWorks Database Schema
-- MySQL / AWS RDS Compatible

-- Create database
CREATE DATABASE IF NOT EXISTS speechworks_db;
USE speechworks_db;

-- Drop existing tables if needed (for fresh setup)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS progress_records;
DROP TABLE IF EXISTS session_activities;
DROP TABLE IF EXISTS activity_words;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS therapy_sessions;
DROP TABLE IF EXISTS treatment_goals;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- Users table (Therapists/Admins)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50),
    role ENUM('THERAPIST', 'ADMIN', 'SUPERVISOR') DEFAULT 'THERAPIST',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clients table
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    therapist_id INT NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    diagnosis TEXT,
    notes TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    guardian_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_therapist (therapist_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Treatment Goals table
CREATE TABLE treatment_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    category ENUM('ARTICULATION', 'LANGUAGE', 'FLUENCY', 'VOICE', 'PRAGMATICS', 'PHONOLOGY') NOT NULL,
    description TEXT NOT NULL,
    target_accuracy INT DEFAULT 80,
    current_accuracy INT DEFAULT 0,
    status ENUM('NOT_STARTED', 'IN_PROGRESS', 'MASTERED', 'DISCONTINUED') DEFAULT 'NOT_STARTED',
    target_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_client (client_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activities table
CREATE TABLE activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category ENUM('ARTICULATION', 'LANGUAGE', 'FLUENCY', 'VOICE', 'PRAGMATICS', 'PHONOLOGY') NOT NULL,
    instructions TEXT,
    target_sounds VARCHAR(100),
    difficulty_level INT DEFAULT 1,
    materials_needed TEXT,
    image_url VARCHAR(500),
    audio_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_difficulty (difficulty_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity Words table
CREATE TABLE activity_words (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    word VARCHAR(100) NOT NULL,
    phonetic VARCHAR(100),
    image_url VARCHAR(500),
    audio_url VARCHAR(500),
    position VARCHAR(20),
    syllables INT,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    INDEX idx_activity (activity_id),
    INDEX idx_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Therapy Sessions table
CREATE TABLE therapy_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    therapist_id INT NOT NULL,
    session_date DATETIME NOT NULL,
    duration_minutes INT DEFAULT 30,
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
    session_notes TEXT,
    soap_subjective TEXT,
    soap_objective TEXT,
    soap_assessment TEXT,
    soap_plan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_client (client_id),
    INDEX idx_therapist (therapist_id),
    INDEX idx_date (session_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session Activities junction table
CREATE TABLE session_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    activity_id INT NOT NULL,
    trials_attempted INT DEFAULT 0,
    trials_correct INT DEFAULT 0,
    accuracy_percentage FLOAT DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES therapy_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    INDEX idx_session (session_id),
    INDEX idx_activity (activity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Progress Records table
CREATE TABLE progress_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    goal_id INT,
    record_date DATE NOT NULL,
    category ENUM('ARTICULATION', 'LANGUAGE', 'FLUENCY', 'VOICE', 'PRAGMATICS', 'PHONOLOGY') NOT NULL,
    accuracy_percentage FLOAT NOT NULL,
    trials_total INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES treatment_goals(id) ON DELETE SET NULL,
    INDEX idx_client (client_id),
    INDEX idx_date (record_date),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Resources table
CREATE TABLE resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM('ARTICULATION', 'LANGUAGE', 'FLUENCY', 'VOICE', 'PRAGMATICS', 'PHONOLOGY'),
    resource_type VARCHAR(50),
    file_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    uploaded_by INT,
    is_public BOOLEAN DEFAULT TRUE,
    download_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_category (category),
    INDEX idx_type (resource_type),
    INDEX idx_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample activities for articulation therapy
INSERT INTO activities (name, description, category, instructions, target_sounds, difficulty_level, materials_needed) VALUES
('S Sound Practice - Initial', 'Practice /s/ sound at the beginning of words', 'ARTICULATION', 'Show each word card. Have client say the word 3 times. Record accuracy.', 's', 1, 'Word cards, mirror'),
('S Sound Practice - Final', 'Practice /s/ sound at the end of words', 'ARTICULATION', 'Show each word card. Have client say the word 3 times. Record accuracy.', 's', 1, 'Word cards, mirror'),
('R Sound Practice - Initial', 'Practice /r/ sound at the beginning of words', 'ARTICULATION', 'Model correct production. Have client repeat. Use mirror for visual feedback.', 'r', 2, 'Word cards, mirror, tongue depressor'),
('L Sound Practice', 'Practice /l/ sound in various positions', 'ARTICULATION', 'Focus on tongue tip placement on alveolar ridge.', 'l', 1, 'Word cards, mirror'),
('TH Sound Practice', 'Practice voiced and voiceless /th/ sounds', 'ARTICULATION', 'Demonstrate tongue placement between teeth. Use mirror.', 'th', 2, 'Word cards, mirror'),
('Naming Objects', 'Expressive language naming activity', 'LANGUAGE', 'Show pictures. Ask "What is this?" Allow 5 seconds for response.', NULL, 1, 'Picture cards'),
('Sentence Building', 'Create sentences using target words', 'LANGUAGE', 'Provide word cards. Have client create grammatically correct sentences.', NULL, 2, 'Word cards, sentence strips'),
('Following Directions', 'Receptive language comprehension activity', 'LANGUAGE', 'Give multi-step directions. Start simple, increase complexity.', NULL, 2, 'Various manipulatives'),
('Fluency Stretching', 'Easy onset and prolongation practice', 'FLUENCY', 'Model slow, stretched speech. Practice with single words first.', NULL, 1, 'Timer, word cards'),
('Voice Projection', 'Practice appropriate vocal loudness', 'VOICE', 'Use sound level meter. Practice at conversational volume.', NULL, 1, 'Sound level meter, reading passages');

-- Insert sample words for S initial position activity
INSERT INTO activity_words (activity_id, word, phonetic, position, syllables) VALUES
(1, 'sun', '/sʌn/', 'initial', 1),
(1, 'soap', '/soʊp/', 'initial', 1),
(1, 'sock', '/sɑk/', 'initial', 1),
(1, 'sand', '/sænd/', 'initial', 1),
(1, 'seed', '/sid/', 'initial', 1),
(1, 'seven', '/ˈsɛvən/', 'initial', 2),
(1, 'summer', '/ˈsʌmər/', 'initial', 2),
(1, 'sister', '/ˈsɪstər/', 'initial', 2),
(1, 'sandwich', '/ˈsænwɪtʃ/', 'initial', 2),
(1, 'cereal', '/ˈsɪriəl/', 'initial', 3);

-- Insert sample words for S final position activity
INSERT INTO activity_words (activity_id, word, phonetic, position, syllables) VALUES
(2, 'bus', '/bʌs/', 'final', 1),
(2, 'house', '/haʊs/', 'final', 1),
(2, 'mouse', '/maʊs/', 'final', 1),
(2, 'dress', '/drɛs/', 'final', 1),
(2, 'grass', '/græs/', 'final', 1),
(2, 'octopus', '/ˈɑktəpəs/', 'final', 3),
(2, 'princess', '/ˈprɪnsɛs/', 'final', 2),
(2, 'Christmas', '/ˈkrɪsməs/', 'final', 2);

-- Insert sample words for R initial position activity
INSERT INTO activity_words (activity_id, word, phonetic, position, syllables) VALUES
(3, 'red', '/rɛd/', 'initial', 1),
(3, 'rain', '/reɪn/', 'initial', 1),
(3, 'rock', '/rɑk/', 'initial', 1),
(3, 'run', '/rʌn/', 'initial', 1),
(3, 'rabbit', '/ˈræbɪt/', 'initial', 2),
(3, 'rainbow', '/ˈreɪnboʊ/', 'initial', 2),
(3, 'robot', '/ˈroʊbɑt/', 'initial', 2),
(3, 'rocket', '/ˈrɑkɪt/', 'initial', 2);

-- Create a demo therapist account (password: Demo1234!)
INSERT INTO users (email, hashed_password, full_name, license_number, role) VALUES
('demo@speechworks.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.gFuVJxVvHqFGC2', 'Demo Therapist', 'SLP-12345', 'THERAPIST');