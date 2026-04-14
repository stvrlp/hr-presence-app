-- ============================================================
-- ARI Foods — Παρακολούθηση Παρουσιών
-- MySQL CREATE TABLE statements (for manual creation in MySQL Workbench)
-- SQLite is used locally via Prisma; these statements match the
-- same schema for production MySQL migration.
-- ============================================================

CREATE DATABASE IF NOT EXISTS presence_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE presence_db;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)   NOT NULL,
  username      VARCHAR(100)  NOT NULL,
  full_name     VARCHAR(200)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Departments (synced from ERP TMIMATA_apasx) ───────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  code          VARCHAR(50)   NOT NULL,
  descr         VARCHAR(200)  NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── User ↔ Department (many-to-many junction) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS user_departments (
  user_id       VARCHAR(36)   NOT NULL,
  dept_code     VARCHAR(50)   NOT NULL,
  PRIMARY KEY (user_id, dept_code),
  CONSTRAINT fk_ud_user
    FOREIGN KEY (user_id)   REFERENCES users(id)       ON DELETE CASCADE,
  CONSTRAINT fk_ud_dept
    FOREIGN KEY (dept_code) REFERENCES departments(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Presence Actions (manager overrides) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS presence_actions (
  id            VARCHAR(36)   NOT NULL,
  employee_code VARCHAR(50)   NOT NULL,
  date          DATE          NOT NULL,
  action        ENUM(
    'PRESENT','REJECTED','LEAVE','SICK','ABSENT','REMOTE','DAYOFF'
  )             NOT NULL,
  note          TEXT          NULL,
  manager_id    VARCHAR(36)   NOT NULL,  -- references users.id
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employee_date (employee_code, date),
  INDEX idx_date (date),
  CONSTRAINT fk_pa_manager
    FOREIGN KEY (manager_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
