-- ====================================================================
-- College Event Management System (CampusPulse)
-- Relational Database Schema & Seed Data (MySQL Compatible)
-- ====================================================================

CREATE DATABASE IF NOT EXISTS college_event_db;
USE college_event_db;

-- --------------------------------------------------------------------
-- 1. Table: users
-- Stores authentication and profile records for Students, Organizers, Admins
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'organizer', 'admin') NOT NULL DEFAULT 'student',
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- 2. Table: categories
-- Event classifications (Technical, Cultural, Sports, Workshop, etc.)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- 3. Table: events
-- Main college event records, scheduled dates, venue, limits, status
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category_id INT NOT NULL,
    organizer_id INT NOT NULL,
    date DATE NULL,
    date_tbd TINYINT(1) NOT NULL DEFAULT 0,
    end_date DATE NULL,
    start_time VARCHAR(10) NULL,
    end_time VARCHAR(10) NULL,
    venue VARCHAR(150) NOT NULL,
    max_participants INT NULL DEFAULT NULL,
    registration_deadline DATE NULL,
    image TEXT,
    google_form_url VARCHAR(500) DEFAULT NULL,
    rejection_reason VARCHAR(500) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_event_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- 4. Table: registrations
-- Maps student registrations to events, tracks confirmation & attendance
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    event_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
    attendance_status ENUM('unmarked', 'present', 'absent') NOT NULL DEFAULT 'unmarked',
    google_form_completed TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_reg_student FOREIGN KEY (student_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_reg_event FOREIGN KEY (event_id) REFERENCES events(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uk_student_event UNIQUE (student_id, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- Seed Data: Categories
-- --------------------------------------------------------------------
INSERT INTO categories (id, name, description) VALUES
(1, 'Technical', 'Coding competitions, robotics, web dev contests, tech talks'),
(2, 'Cultural', 'Music, dance, drama, art exhibitions, literary fests'),
(3, 'Sports', 'Inter-department cricket, football, badminton, athletics'),
(4, 'Workshop', 'Hands-on practical training on modern tech, AI, cloud & tools'),
(5, 'Seminar', 'Expert keynote addresses, industry trends and academic symposiums'),
(6, 'Hackathon', '24 to 36-hour sprint coding and product innovation challenges'),
(7, 'Competition', 'Quiz bowls, debates, gaming tournaments, case study competitions'),
(8, 'Other', 'Campus clubs, orientation, alumni meets and special gatherings'),
(9, 'Interview', 'Mock interviews, placement drives, technical screenings & GDs')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- --------------------------------------------------------------------
-- Seed Data: Sample Users
-- Password for all default accounts is: admin123 / organizer123 / student123
-- (Hashed with bcrypt 10 rounds: $2a$10$wTqS9Z39Uv.qU03tIkgmze/hV0Bmzq17uU1zJzZ6W/vFvWzW9L0tW is standard hash)
-- --------------------------------------------------------------------
INSERT INTO users (id, name, email, password, role, phone) VALUES
(1, 'Dean of Student Affairs', 'admin@college.edu', '$2a$10$8K1p/a0dL1LXMIgoEDFrw.Ogn.e4t4U7w6PjB6gD8n6Pq/9zJ12e.', 'admin', '+1-555-0199'),
(2, 'Prof. Alan Turing (CSI Club)', 'organizer@college.edu', '$2a$10$8K1p/a0dL1LXMIgoEDFrw.Ogn.e4t4U7w6PjB6gD8n6Pq/9zJ12e.', 'organizer', '+1-555-0188'),
(3, 'Sarah Connor (Student Head)', 'student@college.edu', '$2a$10$8K1p/a0dL1LXMIgoEDFrw.Ogn.e4t4U7w6PjB6gD8n6Pq/9zJ12e.', 'student', '+1-555-0177'),
(4, 'Rahul Sharma (Engineering)', 'rahul@college.edu', '$2a$10$8K1p/a0dL1LXMIgoEDFrw.Ogn.e4t4U7w6PjB6gD8n6Pq/9zJ12e.', 'student', '+1-555-0166')
ON DUPLICATE KEY UPDATE email=VALUES(email);

-- --------------------------------------------------------------------
-- Seed Data: Events
-- --------------------------------------------------------------------
INSERT INTO events (id, title, description, category_id, organizer_id, date, start_time, end_time, venue, max_participants, registration_deadline, image, status) VALUES
(1, 'HackFest 2026: 24-Hour Campus Hackathon', 'Join the largest university software sprint of the spring semester! Build functional prototypes in web, mobile, or AI and present to industry tech mentors. High-speed Wi-Fi, food, caffeine, and swags provided.', 6, 2, '2026-10-20', '09:00 AM', '09:00 AM', 'Main Auditorium & Innovation Lab', 120, '2026-10-18', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80', 'approved'),
(2, 'RoboWars: Arena Combat Championship', 'Design, build, and fight remote-controlled battlebots in an enclosed high-impact arena. Weight categories include Featherweight (15kg) and Antweight (1.5kg). Cash prizes for best armor & offense.', 1, 2, '2026-10-25', '10:00 AM', '04:00 PM', 'Mechanical Workshop Arena', 40, '2026-10-23', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80', 'approved'),
(3, 'Echoes 2026: Annual Cultural Night & Battle of Bands', 'An evening celebrating campus artistic brilliance! Live musical performances, indie bands, western and classical dance competitions, and theatrical drama troupes across colleges.', 2, 2, '2026-10-30', '05:30 PM', '10:00 PM', 'Open Air Amphitheatre', 350, '2026-10-29', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', 'approved'),
(4, 'Full-Stack Modern Web Dev with TypeScript & Express', 'An intensive, hands-on workshop guiding students step-by-step through creating REST APIs, relational database integrations, and clean UI components for college-level portfolio projects.', 4, 2, '2026-11-05', '01:30 PM', '05:30 PM', 'CS Lab 304, Block B', 60, '2026-11-04', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80', 'approved'),
(5, 'Inter-Department Cricket Premier League', 'Cheer on your branch in the semester tournament. 8 overs per side, league stage matches followed by super-fours and final championship under stadium floodlights.', 3, 2, '2026-11-10', '08:00 AM', '06:00 PM', 'College Sports Ground', 80, '2026-11-08', 'https://images.unsplash.com/photo-1531415074868-036b107e775a?w=800&auto=format&fit=crop&q=80', 'approved'),
(6, 'Next-Gen AI & Robotics: Keynote Seminar', 'Distinguished industry research fellow sharing breakthrough architectures in autonomous systems, multimodal perception models, and real-world deployment challenges.', 5, 2, '2026-11-15', '11:00 AM', '01:00 PM', 'Seminar Hall 1', 150, '2026-11-14', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80', 'approved'),
(7, 'Algorithmic Blitz: ACM-ICPC Style Coding Duel', 'Test your data structures and problem-solving prowess against the clock. 5 algorithmic challenges in 2.5 hours with automated test case evaluation in C++, Java, and Python.', 7, 2, '2026-11-20', '03:00 PM', '06:00 PM', 'Central Computing Facility', 90, '2026-11-19', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80', 'approved'),
(8, 'Photography & Short Film Showcase: Lens & Lights', 'Exhibition of campus photographers and student documentary creators. Includes live critiques by guest visual directors, voting for audience favorite, and framed displays.', 2, 2, '2026-11-26', '10:00 AM', '05:00 PM', 'Art Gallery, Design Center', 100, '2026-11-24', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80', 'approved'),
(9, 'Career Readiness & Technical Interview Masterclass', 'Practical mock interviews, resume teardowns, and networking strategies presented by alumni working in top software engineering and financial engineering companies.', 5, 2, '2026-12-02', '02:00 PM', '04:30 PM', 'Placement Cell Auditorium', 120, '2026-12-01', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80', 'approved'),
(10, 'Badminton Doubles Championship', 'Knockout badminton tournament for men, women, and mixed doubles. Standard BWF scoring, synthetic indoor courts, and medals for champions and runners-up.', 3, 2, '2026-12-08', '09:00 AM', '05:00 PM', 'Indoor Gymnasium Courts 1-4', 64, '2026-12-06', 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80', 'approved')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- --------------------------------------------------------------------
-- Seed Data: Sample Registrations
-- --------------------------------------------------------------------
INSERT INTO registrations (id, student_id, event_id, status, attendance_status) VALUES
(1, 3, 1, 'confirmed', 'unmarked'),
(2, 3, 4, 'confirmed', 'present'),
(3, 3, 7, 'confirmed', 'unmarked'),
(4, 4, 1, 'confirmed', 'unmarked'),
(5, 4, 5, 'confirmed', 'present')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- --------------------------------------------------------------------
-- 5. Table: notifications
-- Real-time alerts for event reminders, registration updates, and check-ins
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('reminder', 'registration_status', 'event_update', 'general') NOT NULL DEFAULT 'general',
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    event_id INT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_notif_event FOREIGN KEY (event_id) REFERENCES events(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- Seed Data: Sample Notifications
-- --------------------------------------------------------------------
INSERT INTO notifications (id, user_id, type, title, message, event_id, is_read) VALUES
(1, 3, 'reminder', '⏰ Event Reminder: HackFest 2026', 'HackFest 2026: 24-Hour Campus Hackathon starts in less than 48 hours at Main Auditorium & Innovation Lab. Please keep your QR ticket pass #1 ready.', 1, FALSE),
(2, 3, 'registration_status', 'Registration Confirmed: Algorithmic Blitz', 'Your registration for Algorithmic Blitz: ACM-ICPC Style Coding Duel has been confirmed. Seat secured.', 7, FALSE),
(3, 3, 'registration_status', 'Check-in Verified: Full-Stack Web Dev Workshop', 'Attendance confirmed: You were verified and marked present by Prof. Alan Turing at CS Lab 304.', 4, TRUE),
(4, 4, 'reminder', '⏰ Event Reminder: HackFest 2026', 'HackFest 2026 starts soon! High-speed Wi-Fi and hackathon desks await at Main Auditorium.', 1, FALSE)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- --------------------------------------------------------------------
-- 6. Table: event_media
-- Stores custom banner images and photo galleries with compression metadata
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    media_type ENUM('banner', 'gallery') NOT NULL DEFAULT 'gallery',
    image_url MEDIUMTEXT NOT NULL,
    caption VARCHAR(255),
    aspect_ratio VARCHAR(20) DEFAULT '16:9',
    file_size INT DEFAULT 0,
    width INT DEFAULT 0,
    height INT DEFAULT 0,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_media_event FOREIGN KEY (event_id) REFERENCES events(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_media_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- Seed Data: Sample Event Media & Photo Gallery
-- --------------------------------------------------------------------
INSERT INTO event_media (id, event_id, media_type, image_url, caption, aspect_ratio, file_size, width, height, uploaded_by) VALUES
(1, 1, 'banner', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80', 'HackFest 2026 Official Stage Banner', '16:9', 245000, 1600, 900, 2),
(2, 1, 'gallery', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80', 'Past Edition: Teams brainstorming during 24-hour sprint', '16:9', 182000, 1200, 675, 2),
(3, 1, 'gallery', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80', 'Past Edition: Final prototype presentations to industry jury', '16:9', 198000, 1200, 675, 2),
(4, 1, 'gallery', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80', 'Past Edition: Midnight caffeine & debug sessions', '4:3', 165000, 1200, 900, 2),
(5, 2, 'banner', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80', 'RoboWars High-Impact Combat Arena Banner', '16:9', 230000, 1600, 900, 2),
(6, 2, 'gallery', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80', 'Featherweight combat bots ready in qualifying paddock', '16:9', 178000, 1200, 675, 2),
(7, 2, 'gallery', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80', 'Workshop pit area: Armor welding & telemetry tuning', '4:3', 190000, 1200, 900, 2),
(8, 3, 'banner', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80', 'Echoes 2026 Amphitheatre Main Concert Banner', '16:9', 260000, 1600, 900, 2),
(9, 3, 'gallery', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', 'Inter-college indie band finals under floodlights', '16:9', 215000, 1200, 675, 2),
(10, 3, 'gallery', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80', 'Student crowd at the annual amphitheatre sunset opening', '16:9', 188000, 1200, 675, 2)
ON DUPLICATE KEY UPDATE caption=VALUES(caption);

-- Safe migration: Ensure payments table is removed, preserving all events and registrations
DROP TABLE IF EXISTS payments;

-- --------------------------------------------------------------------
-- 7. Table: student_profiles
-- Detailed academic and personal profile for student accounts
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    age INT NULL,
    gender VARCHAR(50) NULL,
    college_name VARCHAR(255) NULL,
    department VARCHAR(255) NULL,
    year_of_study VARCHAR(50) NULL,
    roll_number VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



