-- ===============================================
-- Discomoka 3 Database Setup Script
-- (C) 2018, Raphael "rGunti" Guntersweiler
-- ===============================================

-- =============== DROP EVERYTHING ===============
-- --- 3.0.0-beta4 ---
DROP TABLE IF EXISTS `reddit_autopost_settings`;
-- --- 3.0.0-beta3 ---
DROP TABLE IF EXISTS `score`;
DROP TABLE IF EXISTS `score_settings`;
-- --- 3.0.0-beta2 ---
DROP TABLE IF EXISTS `playlist_songs`;
DROP TABLE IF EXISTS `playlists`;
-- --- 3.0.0-beta1 ---
DROP TABLE IF EXISTS `songs`;
DROP TABLE IF EXISTS `server_role_mapping`;
DROP TABLE IF EXISTS `role_permissions`;
DROP TABLE IF EXISTS `permissions`;
DROP TABLE IF EXISTS `roles`;

-- =============== CREATE EVERYTHING ===============
-- ============================================================================
-- ============================== 3.0.0-beta1 =================================
-- ============================================================================
CREATE TABLE `permissions` (
  `id` varchar(64) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `roles` (
  `id` varchar(18) NOT NULL,
  `name` varchar(45) NOT NULL,
  `description` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` varchar(18) NOT NULL,
  `perm_id` varchar(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_role_idx` (`role_id`),
  KEY `fk_perm_idx` (`perm_id`),
  CONSTRAINT `fk_perm` FOREIGN KEY (`perm_id`) REFERENCES `permissions` (`id`),
  CONSTRAINT `fk_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `server_role_mapping` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `server_id` varchar(18) NOT NULL,
  `server_role_id` varchar(18) NOT NULL,
  `role_id` varchar(18) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`),
  KEY `fk_role_idx` (`role_id`),
  KEY `fk_mapping_role_idx` (`role_id`),
  CONSTRAINT `fk_mapping_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8;

CREATE TABLE `songs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `server_id` varchar(18) NOT NULL,
  `uploaded_by` varchar(18) NOT NULL,
  `title` varchar(128) DEFAULT NULL,
  `artist` varchar(128) DEFAULT NULL,
  `source_type` varchar(45) NOT NULL,
  `source_link` varchar(128) NOT NULL,
  `source` varchar(45) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8;

-- =============== CREATE VIEWS ===============
CREATE VIEW `v_permissions` AS
SELECT
  srm.server_id AS server_id, 
  srm.server_role_id AS server_role_id,
  r.id AS role_id,
  p.id AS perm_id
FROM
  server_role_mapping srm 
  LEFT JOIN roles r on srm.role_id = r.id 
  LEFT JOIN role_permissions rp on rp.role_id = r.id 
  LEFT JOIN permissions p on rp.perm_id = p.id
;

-- ============================================================================
-- ============================== 3.0.0-beta2 =================================
-- ============================================================================
CREATE TABLE `playlists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `server_id` varchar(18) NOT NULL,
  `created_by` varchar(18) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8;

CREATE TABLE `playlist_songs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `playlist_id` int(11) NOT NULL,
  `song_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_playlist_idx` (`playlist_id`),
  KEY `fk_song_idx` (`song_id`),
  CONSTRAINT `fk_playlist` FOREIGN KEY (`playlist_id`) REFERENCES `playlists` (`id`),
  CONSTRAINT `fk_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8;

-- ============================================================================
-- ============================== 3.0.0-beta3 =================================
-- ============================================================================
CREATE TABLE `score_settings` (
  `id` varchar(18) NOT NULL,
  `unit_name` varchar(64) NOT NULL,
  `score_channel` varchar(18) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `score` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `server_id` varchar(18) NOT NULL,
  `user_id` varchar(18) NOT NULL,
  `score` int(11),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_server_id` FOREIGN KEY (`server_id`) REFERENCES `score_settings` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8;

-- ============================================================================
-- ============================== 3.0.0-beta4 =================================
-- ============================================================================
CREATE TABLE `reddit_autopost_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `server_id` VARCHAR(18) NOT NULL,
  `subreddit` VARCHAR(45) NOT NULL,
  `target_channel` VARCHAR(18) NOT NULL,
  `interval` INT NOT NULL DEFAULT 86400,
  `last_post` VARCHAR(10) NULL,
  `last_post_timestamp` TIMESTAMP NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8;

-- Migrating everything from TIMESTAMP to DATETIME because Sequelize doesn't really like TIMESTAMPs
--- <MIGRATION>
ALTER TABLE `server_role_mapping` 
CHANGE COLUMN `created_at` `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
CHANGE COLUMN `updated_at` `updated_at` DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00';

ALTER TABLE `songs` 
CHANGE COLUMN `created_at` `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
CHANGE COLUMN `updated_at` `updated_at` DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
CHANGE COLUMN `deleted_at` `deleted_at` DATETIME NULL DEFAULT NULL;

ALTER TABLE `playlists` 
CHANGE COLUMN `created_at` `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
CHANGE COLUMN `updated_at` `updated_at` DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
CHANGE COLUMN `deleted_at` `deleted_at` DATETIME NULL DEFAULT NULL;

ALTER TABLE `score` 
CHANGE COLUMN `created_at` `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
CHANGE COLUMN `updated_at` `updated_at` DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
CHANGE COLUMN `deleted_at` `deleted_at` DATETIME NULL DEFAULT NULL;

ALTER TABLE `reddit_autopost_settings` 
CHANGE COLUMN `last_post_timestamp` `last_post_timestamp` DATETIME NULL,
CHANGE COLUMN `created_at` `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
CHANGE COLUMN `updated_at` `updated_at` DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
CHANGE COLUMN `deleted_at` `deleted_at` DATETIME NULL DEFAULT NULL;
--- </MIGRATION>

-- Announcements
CREATE TABLE `announcements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(128) NOT NULL,
  `message` VARCHAR(256) NOT NULL,
  `post_by` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
  `deleted_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`) 
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8;
