import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js';
import mysql from 'mysql2/promise';

dotenv.config();

export interface QueryResult {
  insertId?: number;
  affectedRows?: number;
}

let mysqlPool: mysql.Pool | null = null;
let sqlJsDb: any = null;
let isUsingSqlJs = false;
const sqliteFilePath = path.resolve(process.cwd(), 'database', 'college_events.sqlite');

/**
 * Initializes the database connection.
 * Attempts to connect to MySQL first. If MySQL is unavailable (e.g. In standard preview environments),
 * falls back to an embedded relational SQL engine (sql.js) with disk persistence and foreign keys.
 */
export async function initDatabase() {
  const dbHost = process.env.DATABASE_HOST || 'localhost';
  const dbUser = process.env.DATABASE_USER || 'root';
  const dbPassword = process.env.DATABASE_PASSWORD || '';
  const dbName = process.env.DATABASE_NAME || 'college_event_db';
  const dbPort = Number(process.env.DATABASE_PORT) || 3306;

  // Try MySQL connection
  try {
    const testConnection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      port: dbPort,
      connectTimeout: 1500,
    });

    await testConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await testConnection.end();

    mysqlPool = mysql.createPool({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log(`[Database] Connected successfully to MySQL at ${dbHost}:${dbPort}/${dbName}`);
    await setupMysqlSchema();
    return;
  } catch (err: any) {
    console.log(`[Database] External MySQL not detected or credentials unavailable (${err.message}).`);
    console.log(`[Database] Initializing embedded relational SQL engine with file persistence and foreign keys.`);
    await initEmbeddedSql();
  }
}

/**
 * Embedded Relational SQL Engine using sql.js (WebAssembly SQLite)
 * Provides genuine relational table structures, foreign keys, unique constraints, and SQL queries.
 */
async function initEmbeddedSql() {
  isUsingSqlJs = true;
  const SQL = await initSqlJs();

  const dbDir = path.dirname(sqliteFilePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(sqliteFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(sqliteFilePath);
      sqlJsDb = new SQL.Database(fileBuffer);
    } catch {
      sqlJsDb = new SQL.Database();
    }
  } else {
    sqlJsDb = new SQL.Database();
  }

  // Enforce foreign key constraints
  sqlJsDb.run('PRAGMA foreign_keys = ON;');

  // Create tables if they do not exist
  sqlJsDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('student', 'organizer', 'admin')) NOT NULL DEFAULT 'student',
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT,
      date_tbd INTEGER NOT NULL DEFAULT 0,
      end_date TEXT,
      start_time TEXT,
      end_time TEXT,
      venue TEXT NOT NULL,
      max_participants INTEGER DEFAULT NULL,
      registration_deadline TEXT,
      image TEXT,
      google_form_url TEXT,
      rejection_reason TEXT,
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')) NOT NULL DEFAULT 'approved',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT CHECK(status IN ('confirmed', 'cancelled')) NOT NULL DEFAULT 'confirmed',
      attendance_status TEXT CHECK(attendance_status IN ('unmarked', 'present', 'absent')) NOT NULL DEFAULT 'unmarked',
      google_form_completed INTEGER DEFAULT 0,
      UNIQUE(student_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT CHECK(type IN ('reminder', 'registration_status', 'event_update', 'general')) NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      media_type TEXT CHECK(media_type IN ('banner', 'gallery')) NOT NULL DEFAULT 'gallery',
      image_url TEXT NOT NULL,
      caption TEXT,
      aspect_ratio TEXT DEFAULT '16:9',
      file_size INTEGER DEFAULT 0,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      age INTEGER,
      gender TEXT,
      college_name TEXT,
      department TEXT,
      year_of_study TEXT,
      roll_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure new columns exist on existing databases
  try {
    sqlJsDb.run('ALTER TABLE events ADD COLUMN google_form_url TEXT;');
  } catch {
    // Column already exists
  }
  try {
    sqlJsDb.run('ALTER TABLE events ADD COLUMN rejection_reason TEXT;');
  } catch {
    // Column already exists
  }
  try {
    sqlJsDb.run('ALTER TABLE registrations ADD COLUMN google_form_completed INTEGER DEFAULT 0;');
  } catch {
    // Column already exists
  }

  // Safe, automatic, idempotent migration for flexible event details (SQLite table rebuild)
  try {
    const tableInfo = querySqlJs('PRAGMA table_info(events)');
    const dateCol = tableInfo.find((c: any) => c.name === 'date');
    const hasEndDate = tableInfo.some((c: any) => c.name === 'end_date');
    const hasDateTbd = tableInfo.some((c: any) => c.name === 'date_tbd');
    const endTimeCol = tableInfo.find((c: any) => c.name === 'end_time');
    const maxPartCol = tableInfo.find((c: any) => c.name === 'max_participants');
    const regDeadCol = tableInfo.find((c: any) => c.name === 'registration_deadline');

    const needsRebuild =
      !hasEndDate ||
      !hasDateTbd ||
      dateCol?.notnull === 1 ||
      endTimeCol?.notnull === 1 ||
      maxPartCol?.notnull === 1 ||
      regDeadCol?.notnull === 1;

    if (needsRebuild) {
      console.log('[Database] Migrating events table to support flexible event details (SQLite table rebuild)...');
      const cols = tableInfo.map((c: any) => c.name);

      sqlJsDb.run('PRAGMA foreign_keys = OFF;');
      sqlJsDb.run(`
        CREATE TABLE events_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
          organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date TEXT,
          date_tbd INTEGER NOT NULL DEFAULT 0,
          end_date TEXT,
          start_time TEXT,
          end_time TEXT,
          venue TEXT NOT NULL,
          max_participants INTEGER DEFAULT NULL,
          registration_deadline TEXT,
          image TEXT,
          google_form_url TEXT,
          rejection_reason TEXT,
          status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')) NOT NULL DEFAULT 'approved',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      sqlJsDb.run(`
        INSERT INTO events_new (
          id, title, description, category_id, organizer_id, date, date_tbd, end_date,
          start_time, end_time, venue, max_participants, registration_deadline,
          image, google_form_url, rejection_reason, status, created_at
        )
        SELECT 
          id, title, description, category_id, organizer_id, date,
          ${cols.includes('date_tbd') ? 'date_tbd' : '0'} AS date_tbd,
          ${cols.includes('end_date') ? 'end_date' : 'NULL'} AS end_date,
          start_time, end_time, venue, max_participants, registration_deadline,
          ${cols.includes('image') ? 'image' : "''"} AS image,
          ${cols.includes('google_form_url') ? 'google_form_url' : 'NULL'} AS google_form_url,
          ${cols.includes('rejection_reason') ? 'rejection_reason' : 'NULL'} AS rejection_reason,
          status, created_at
        FROM events;
      `);

      sqlJsDb.run('DROP TABLE events;');
      sqlJsDb.run('ALTER TABLE events_new RENAME TO events;');
      sqlJsDb.run('PRAGMA foreign_keys = ON;');
      console.log('[Database] Events table SQLite migration completed successfully.');
    }
  } catch (err) {
    console.warn('[Database] Events table migration notice:', err);
  }

  // Safe migration: Ensure Interview category exists
  try {
    const interviewCat = querySqlJs("SELECT id FROM categories WHERE LOWER(name) = 'interview'");
    if (interviewCat.length === 0) {
      executeSqlJs('INSERT INTO categories (name, description) VALUES (?, ?)', [
        'Interview',
        'Mock interviews, placement drives, technical screenings & GDs',
      ]);
    }
  } catch (err) {
    console.warn('[Database] Notice seeding interview category:', err);
  }

  // Safe migration: Ensure payments table is removed, keeping events and registrations intact
  try {
    sqlJsDb.run('DROP TABLE IF EXISTS payments;');
  } catch {
    // Table does not exist
  }

  // Update sample event with default Google Form URL if empty
  try {
    sqlJsDb.run(`
      UPDATE events 
      SET google_form_url = 'https://docs.google.com/forms/d/e/1FAIpQLScP_SampleHackFestForm/viewform' 
      WHERE id = 1 AND (google_form_url IS NULL OR google_form_url = '');
    `);
    sqlJsDb.run(`
      UPDATE events 
      SET google_form_url = 'https://docs.google.com/forms/d/e/1FAIpQLSe_SampleWebDevSurveyForm/viewform' 
      WHERE id = 4 AND (google_form_url IS NULL OR google_form_url = '');
    `);
  } catch {
    // ignore
  }

  await seedEmbeddedDatabase();
  persistEmbeddedDb();
  console.log('[Database] Relational SQL database initialized with active constraints and seed records.');
}

function persistEmbeddedDb() {
  if (sqlJsDb && isUsingSqlJs) {
    try {
      const data = sqlJsDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(sqliteFilePath, buffer);
    } catch (e) {
      console.error('[Database] Failed to write database to disk:', e);
    }
  }
}

/**
 * Seed initial categories, users, events, and sample registrations
 */
async function seedEmbeddedDatabase() {
  // Check if notifications need seeding
  try {
    const notifCount = querySqlJs('SELECT COUNT(*) as count FROM notifications')[0]?.count || 0;
    if (notifCount === 0) {
      console.log('[Database] Seeding sample notification alerts for students...');
      const sampleNotifications = [
        [
          1,
          3,
          'reminder',
          '⏰ Event Reminder: HackFest 2026',
          'HackFest 2026: 24-Hour Campus Hackathon starts in less than 48 hours at Main Auditorium & Innovation Lab. Please keep your QR ticket pass #1 ready.',
          1,
          0
        ],
        [
          2,
          3,
          'registration_status',
          'Registration Confirmed: Algorithmic Blitz',
          'Your registration for Algorithmic Blitz: ACM-ICPC Style Coding Duel has been confirmed. Seat secured.',
          7,
          0
        ],
        [
          3,
          3,
          'registration_status',
          'Check-in Verified: Full-Stack Web Dev Workshop',
          'Attendance confirmed: You were verified and marked present by Prof. Alan Turing at CS Lab 304.',
          4,
          1
        ],
        [
          4,
          4,
          'reminder',
          '⏰ Event Reminder: HackFest 2026',
          'HackFest 2026 starts soon! High-speed Wi-Fi and hackathon desks await at Main Auditorium.',
          1,
          0
        ]
      ];
      for (const notif of sampleNotifications) {
        executeSqlJs(
          'INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, event_id, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)',
          notif
        );
      }
    }
  } catch (err) {
    console.warn('[Database] Notice checking notifications seeding:', err);
  }

  // Check if event_media needs seeding
  try {
    const mediaCount = querySqlJs('SELECT COUNT(*) as count FROM event_media')[0]?.count || 0;
    if (mediaCount === 0) {
      console.log('[Database] Seeding sample event banners and photo gallery records...');
      const sampleMedia = [
        // Event 1: HackFest 2026
        [1, 1, 'banner', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80', 'HackFest 2026 Official Stage Banner', '16:9', 245000, 1600, 900, 2],
        [2, 1, 'gallery', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80', 'Past Edition: Teams brainstorming during 24-hour sprint', '16:9', 182000, 1200, 675, 2],
        [3, 1, 'gallery', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80', 'Past Edition: Final prototype presentations to industry jury', '16:9', 198000, 1200, 675, 2],
        [4, 1, 'gallery', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80', 'Past Edition: Midnight caffeine & debug sessions', '4:3', 165000, 1200, 900, 2],
        
        // Event 2: RoboWars
        [5, 2, 'banner', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80', 'RoboWars High-Impact Combat Arena Banner', '16:9', 230000, 1600, 900, 2],
        [6, 2, 'gallery', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80', 'Featherweight combat bots ready in qualifying paddock', '16:9', 178000, 1200, 675, 2],
        [7, 2, 'gallery', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80', 'Workshop pit area: Armor welding & telemetry tuning', '4:3', 190000, 1200, 900, 2],

        // Event 3: Echoes 2026 Cultural Night
        [8, 3, 'banner', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80', 'Echoes 2026 Amphitheatre Main Concert Banner', '16:9', 260000, 1600, 900, 2],
        [9, 3, 'gallery', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', 'Inter-college indie band finals under floodlights', '16:9', 215000, 1200, 675, 2],
        [10, 3, 'gallery', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80', 'Student crowd at the annual amphitheatre sunset opening', '16:9', 188000, 1200, 675, 2]
      ];

      for (const m of sampleMedia) {
        executeSqlJs(
          'INSERT OR IGNORE INTO event_media (id, event_id, media_type, image_url, caption, aspect_ratio, file_size, width, height, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          m
        );
      }
    }
  } catch (err) {
    console.warn('[Database] Notice checking event_media seeding:', err);
  }

  const usersCount = querySqlJs('SELECT COUNT(*) as count FROM users')[0]?.count || 0;
  if (usersCount > 0) return;

  console.log('[Database] Seeding sample data into relational database...');

  // Categories
  const categories = [
    [1, 'Technical', 'Coding competitions, robotics, web dev contests, tech talks'],
    [2, 'Cultural', 'Music, dance, drama, art exhibitions, literary fests'],
    [3, 'Sports', 'Inter-department cricket, football, badminton, athletics'],
    [4, 'Workshop', 'Hands-on practical training on modern tech, AI, cloud & tools'],
    [5, 'Seminar', 'Expert keynote addresses, industry trends and academic symposiums'],
    [6, 'Hackathon', '24 to 36-hour sprint coding and product innovation challenges'],
    [7, 'Competition', 'Quiz bowls, debates, gaming tournaments, case study competitions'],
    [8, 'Other', 'Campus clubs, orientation, alumni meets and special gatherings'],
    [9, 'Interview', 'Mock interviews, placement drives, technical screenings & GDs']
  ];

  for (const cat of categories) {
    executeSqlJs('INSERT OR IGNORE INTO categories (id, name, description) VALUES (?, ?, ?)', cat);
  }

  // Users (Pass: admin123, organizer123, student123)
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const orgPass = bcrypt.hashSync('organizer123', salt);
  const studentPass = bcrypt.hashSync('student123', salt);

  const users = [
    [1, 'Dean of Student Affairs', 'admin@college.edu', adminPass, 'admin', '+1-555-0199'],
    [2, 'Prof. Alan Turing (CSI Club)', 'organizer@college.edu', orgPass, 'organizer', '+1-555-0188'],
    [3, 'Sarah Connor (Student Head)', 'student@college.edu', studentPass, 'student', '+1-555-0177'],
    [4, 'Rahul Sharma (Engineering)', 'rahul@college.edu', studentPass, 'student', '+1-555-0166']
  ];

  for (const u of users) {
    executeSqlJs('INSERT OR IGNORE INTO users (id, name, email, password, role, phone) VALUES (?, ?, ?, ?, ?, ?)', u);
  }

  // Events
  const events = [
    [
      1,
      'HackFest 2026: 24-Hour Campus Hackathon',
      'Join the largest university software sprint of the spring semester! Build functional prototypes in web, mobile, or AI and present to industry tech mentors. High-speed Wi-Fi, food, caffeine, and swags provided.',
      6,
      2,
      '2026-10-20',
      '09:00 AM',
      '09:00 AM',
      'Main Auditorium & Innovation Lab',
      120,
      '2026-10-18',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80',
      'approved'
    ],
    [
      2,
      'RoboWars: Arena Combat Championship',
      'Design, build, and fight remote-controlled battlebots in an enclosed high-impact arena. Weight categories include Featherweight (15kg) and Antweight (1.5kg). Cash prizes for best armor & offense.',
      1,
      2,
      '2026-10-25',
      '10:00 AM',
      '04:00 PM',
      'Mechanical Workshop Arena',
      40,
      '2026-10-23',
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
      'approved'
    ],
    [
      3,
      'Echoes 2026: Annual Cultural Night & Battle of Bands',
      'An evening celebrating campus artistic brilliance! Live musical performances, indie bands, western and classical dance competitions, and theatrical drama troupes across colleges.',
      2,
      2,
      '2026-10-30',
      '05:30 PM',
      '10:00 PM',
      'Open Air Amphitheatre',
      350,
      '2026-10-29',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      'approved'
    ],
    [
      4,
      'Full-Stack Modern Web Dev with TypeScript & Express',
      'An intensive, hands-on workshop guiding students step-by-step through creating REST APIs, relational database integrations, and clean UI components for college-level portfolio projects.',
      4,
      2,
      '2026-11-05',
      '01:30 PM',
      '05:30 PM',
      'CS Lab 304, Block B',
      60,
      '2026-11-04',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
      'approved'
    ],
    [
      5,
      'Inter-Department Cricket Premier League',
      'Cheer on your branch in the semester tournament. 8 overs per side, league stage matches followed by super-fours and final championship under stadium floodlights.',
      3,
      2,
      '2026-11-10',
      '08:00 AM',
      '06:00 PM',
      'College Sports Ground',
      80,
      '2026-11-08',
      'https://images.unsplash.com/photo-1531415074868-036b107e775a?w=800&auto=format&fit=crop&q=80',
      'approved'
    ],
    [
      6,
      'Next-Gen AI & Robotics: Keynote Seminar',
      'Distinguished industry research fellow sharing breakthrough architectures in autonomous systems, multimodal perception models, and real-world deployment challenges.',
      5,
      2,
      '2026-11-15',
      '11:00 AM',
      '01:00 PM',
      'Seminar Hall 1',
      150,
      '2026-11-14',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
      'approved'
    ],
    [
      7,
      'Algorithmic Blitz: ACM-ICPC Style Coding Duel',
      'Test your data structures and problem-solving prowess against the clock. 5 algorithmic challenges in 2.5 hours with automated test case evaluation in C++, Java, and Python.',
      7,
      2,
      '2026-11-20',
      '03:00 PM',
      '06:00 PM',
      'Central Computing Facility',
      90,
      '2026-11-19',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
      'approved'
    ],
    [
      8,
      'Photography & Short Film Showcase: Lens & Lights',
      'Exhibition of campus photographers and student documentary creators. Includes live critiques by guest visual directors, voting for audience favorite, and framed displays.',
      2,
      2,
      '2026-11-26',
      '10:00 AM',
      '05:00 PM',
      'Art Gallery, Design Center',
      100,
      '2026-11-24',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
      'approved'
    ],
    [
      9,
      'Career Readiness & Technical Interview Masterclass',
      'Practical mock interviews, resume teardowns, and networking strategies presented by alumni working in top software engineering and financial engineering companies.',
      5,
      2,
      '2026-12-02',
      '02:00 PM',
      '04:30 PM',
      'Placement Cell Auditorium',
      120,
      '2026-12-01',
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80',
      'approved'
    ],
    [
      10,
      'Badminton Doubles Championship',
      'Knockout badminton tournament for men, women, and mixed doubles. Standard BWF scoring, synthetic indoor courts, and medals for champions and runners-up.',
      3,
      2,
      '2026-12-08',
      '09:00 AM',
      '05:00 PM',
      'Indoor Gymnasium Courts 1-4',
      64,
      '2026-12-06',
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80',
      'approved'
    ]
  ];

  for (const ev of events) {
    executeSqlJs(
      `INSERT OR IGNORE INTO events 
       (id, title, description, category_id, organizer_id, date, start_time, end_time, venue, max_participants, registration_deadline, image, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ev
    );
  }

  // Registrations
  const registrations = [
    [1, 3, 1, 'confirmed', 'unmarked'],
    [2, 3, 4, 'confirmed', 'present'],
    [3, 3, 7, 'confirmed', 'unmarked'],
    [4, 4, 1, 'confirmed', 'unmarked'],
    [5, 4, 5, 'confirmed', 'present']
  ];

  for (const reg of registrations) {
    executeSqlJs(
      'INSERT OR IGNORE INTO registrations (id, student_id, event_id, status, attendance_status) VALUES (?, ?, ?, ?, ?)',
      reg
    );
  }
}

/**
 * Execute MySQL schema migration if connecting to real MySQL instance
 */
async function setupMysqlSchema() {
  if (!mysqlPool) return;
  const schemaPath = path.resolve(process.cwd(), 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const rawSql = fs.readFileSync(schemaPath, 'utf8');
    const statements = rawSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

    for (const stmt of statements) {
      try {
        await mysqlPool.query(stmt);
      } catch (err: any) {
        console.warn(`[Database] Statement notice: ${err.message}`);
      }
    }

    try {
      await mysqlPool.query('ALTER TABLE events ADD COLUMN google_form_url VARCHAR(500) NULL;');
    } catch {
      // Column already exists
    }
    try {
      await mysqlPool.query('ALTER TABLE registrations ADD COLUMN google_form_completed TINYINT(1) DEFAULT 0;');
    } catch {
      // Column already exists
    }
    try {
      await mysqlPool.query('ALTER TABLE events MODIFY end_time VARCHAR(10) NULL;');
    } catch {
      // ignore
    }
    try {
      await mysqlPool.query('ALTER TABLE events ADD COLUMN end_date DATE NULL;');
    } catch {
      // Column already exists
    }
    try {
      await mysqlPool.query('ALTER TABLE events MODIFY date DATE NULL;');
    } catch {
      // ignore
    }
    try {
      await mysqlPool.query('ALTER TABLE events ADD COLUMN date_tbd TINYINT(1) NOT NULL DEFAULT 0;');
    } catch {
      // Column already exists
    }
    try {
      await mysqlPool.query('ALTER TABLE events MODIFY max_participants INT NULL;');
    } catch {
      // ignore
    }
    try {
      await mysqlPool.query('ALTER TABLE events MODIFY registration_deadline DATE NULL;');
    } catch {
      // ignore
    }
    try {
      await mysqlPool.query(`
        INSERT INTO categories (name, description) 
        VALUES ('Interview', 'Mock interviews, placement drives, technical screenings & GDs')
        ON DUPLICATE KEY UPDATE name=VALUES(name);
      `);
    } catch {
      // ignore
    }
    try {
      await mysqlPool.query('DROP TABLE IF EXISTS payments;');
    } catch {
      // Table does not exist
    }
    try {
      await mysqlPool.query(`
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
          CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch {
      // ignore
    }
    try {
      await mysqlPool.query('ALTER TABLE events ADD COLUMN rejection_reason VARCHAR(500) NULL;');
    } catch {
      // Column already exists
    }

    console.log('[Database] MySQL schema verified successfully.');
  }
}

/**
 * Core query function - returns array of plain records
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (mysqlPool) {
    const [rows] = await mysqlPool.query(sql, params);
    return rows as T[];
  }
  return querySqlJs(sql, params) as T[];
}

/**
 * Core execute function for INSERT / UPDATE / DELETE
 */
export async function execute(sql: string, params: any[] = []): Promise<QueryResult> {
  if (mysqlPool) {
    const [res] = await mysqlPool.execute(sql, params);
    const r = res as mysql.ResultSetHeader;
    return {
      insertId: r.insertId,
      affectedRows: r.affectedRows,
    };
  }

  const result = executeSqlJs(sql, params);
  persistEmbeddedDb();
  return result;
}

/**
 * Helper to execute SELECT queries on sql.js
 */
function querySqlJs(sql: string, params: any[] = []): any[] {
  if (!sqlJsDb) throw new Error('Database not initialized');
  try {
    const stmt = sqlJsDb.prepare(sql);
    stmt.bind(params);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err: any) {
    console.error(`[Database Error] SQL: ${sql} | Params: ${JSON.stringify(params)}`, err);
    throw err;
  }
}

/**
 * Helper to execute INSERT/UPDATE/DELETE queries on sql.js
 */
function executeSqlJs(sql: string, params: any[] = []): QueryResult {
  if (!sqlJsDb) throw new Error('Database not initialized');
  try {
    sqlJsDb.run(sql, params);
    
    // Get last insert ID and affected rows
    const lastIdRow = querySqlJs('SELECT last_insert_rowid() as id');
    const insertId = lastIdRow[0]?.id || 0;
    const changesRow = querySqlJs('SELECT changes() as count');
    const affectedRows = changesRow[0]?.count || 0;

    return { insertId, affectedRows };
  } catch (err: any) {
    console.error(`[Database Error] SQL: ${sql} | Params: ${JSON.stringify(params)}`, err);
    throw err;
  }
}

/**
 * Export information about database mode (MySQL or Embedded SQL)
 */
export function getDbInfo() {
  return {
    engine: mysqlPool ? 'MySQL 8.0 (Production / External)' : 'Embedded Relational SQL (SQLite WASM)',
    connected: Boolean(mysqlPool || sqlJsDb),
    persistedFile: isUsingSqlJs ? sqliteFilePath : null,
  };
}
