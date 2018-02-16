-- ===============================================
-- Discomoka 3 Database Setup Script
-- (C) 2018, Raphael "rGunti" Guntersweiler
-- ===============================================

-- =============== DROP EVERYTHING ===============
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
