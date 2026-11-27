CREATE TABLE IF NOT EXISTS cai_dat_van_hanh_ban_hang (
  id TINYINT NOT NULL PRIMARY KEY CHECK (id = 1),
  tuy_chinh JSON NOT NULL
) ENGINE=InnoDB;
