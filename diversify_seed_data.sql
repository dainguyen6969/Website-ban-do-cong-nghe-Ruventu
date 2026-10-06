-- RUVENTU live seed diversification (MySQL 8+).
-- Idempotent: deterministic updates plus guarded inserts; no deletes or schema changes.
SET NAMES utf8mb4;
SET SQL_SAFE_UPDATES = 0;
START TRANSACTION;

-- Keep the 12 intended categories, normalize their order/tree, and retire only the two junk rows.
UPDATE danh_muc
SET duong_dan_url=CONCAT('__rv_category_',id)
WHERE id BETWEEN 1 AND 12;

UPDATE danh_muc
SET ten_danh_muc = CASE id
      WHEN 1 THEN 'Danh mục' WHEN 2 THEN 'CPU' WHEN 3 THEN 'VGA'
      WHEN 4 THEN 'Mainboard' WHEN 5 THEN 'RAM' WHEN 6 THEN 'SSD'
      WHEN 7 THEN 'PSU' WHEN 8 THEN 'Màn hình' WHEN 9 THEN 'Tản nhiệt'
      WHEN 10 THEN 'Case' WHEN 11 THEN 'PC Build' WHEN 12 THEN 'Phụ kiện'
      ELSE ten_danh_muc END,
    duong_dan_url = CASE id
      WHEN 1 THEN 'danh-muc' WHEN 2 THEN 'cpu' WHEN 3 THEN 'vga'
      WHEN 4 THEN 'mainboard' WHEN 5 THEN 'ram' WHEN 6 THEN 'ssd'
      WHEN 7 THEN 'psu' WHEN 8 THEN 'man-hinh' WHEN 9 THEN 'tan-nhiet'
      WHEN 10 THEN 'case' WHEN 11 THEN 'pc-build' WHEN 12 THEN 'phu-kien'
      ELSE duong_dan_url END,
    danh_muc_cha_id = CASE
      WHEN id IN (2,3,4,5,6,7,9,10) THEN 1
      WHEN id IN (1,8,11,12) THEN NULL
      ELSE danh_muc_cha_id END,
    trang_thai = CASE WHEN id = 9 OR id > 12 THEN 0 ELSE 1 END
WHERE id <= 14;

-- Fifteen real brands stay intact; inactive brands model temporarily discontinued catalogues.
UPDATE thuong_hieu
SET trang_thai = CASE WHEN id IN (9,12,15) OR id > 15 THEN 0 ELSE 1 END;

DROP TEMPORARY TABLE IF EXISTS tmp_product_target;
CREATE TEMPORARY TABLE tmp_product_target AS
SELECT product_id, category_id,
       ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY product_id) AS local_rank
FROM (
  SELECT id AS product_id,
         1 + MOD(ROW_NUMBER() OVER (ORDER BY id) - 1, 12) AS category_id
  FROM san_pham
  WHERE loai_san_pham = 'DON'
) ranked;
ALTER TABLE tmp_product_target ADD PRIMARY KEY (product_id);

DROP TEMPORARY TABLE IF EXISTS tmp_brand_pool;
CREATE TEMPORARY TABLE tmp_brand_pool (
  category_id BIGINT NOT NULL,
  slot INT NOT NULL,
  brand_id BIGINT NOT NULL,
  PRIMARY KEY (category_id, slot)
);
INSERT INTO tmp_brand_pool (category_id, slot, brand_id) VALUES
  (1,1,1),(1,2,2),(1,3,3),(1,4,6),(1,5,7),(1,6,11),(1,7,12),(1,8,13),
  (2,1,4),(2,2,5),
  (3,1,1),(3,2,2),(3,3,3),(3,4,5),(3,5,10),
  (4,1,1),(4,2,2),(4,3,3),
  (5,1,6),(5,2,7),(5,3,8),
  (6,1,7),(6,2,8),(6,3,9),
  (7,1,1),(7,2,6),(7,3,13),(7,4,14),
  (8,1,1),(8,2,2),(8,3,3),(8,4,8),(8,5,15),
  (9,1,1),(9,2,2),(9,3,6),(9,4,13),
  (10,1,1),(10,2,2),(10,3,3),(10,4,6),(10,5,13),
  (11,1,1),(11,2,2),(11,3,3),(11,4,4),(11,5,5),(11,6,6),
  (12,1,1),(12,2,6),(12,3,7),(12,4,11),(12,5,12),(12,6,13);

DROP TEMPORARY TABLE IF EXISTS tmp_product_plan;
DROP TEMPORARY TABLE IF EXISTS tmp_brand_pool_size;
CREATE TEMPORARY TABLE tmp_brand_pool_size AS
SELECT category_id, COUNT(*) AS pool_size
FROM tmp_brand_pool
GROUP BY category_id;

CREATE TEMPORARY TABLE tmp_product_plan AS
SELECT t.product_id, t.category_id, t.local_rank, bp.brand_id
FROM tmp_product_target t
JOIN tmp_brand_pool_size sizes ON sizes.category_id = t.category_id
JOIN tmp_brand_pool bp
  ON bp.category_id = t.category_id
 AND bp.slot = 1 + MOD(t.local_rank - 1, sizes.pool_size);
ALTER TABLE tmp_product_plan ADD PRIMARY KEY (product_id);

-- Spread all single products over the category/brand plan and replace template-like names/specs.
UPDATE san_pham sp
JOIN tmp_product_plan p ON p.product_id = sp.id
JOIN thuong_hieu th ON th.id = p.brand_id
SET sp.danh_muc_id = p.category_id,
    sp.thuong_hieu_id = p.brand_id,
    sp.ma_san_pham = CONCAT('RV-',
      ELT(p.category_id,'CAT','CPU','VGA','MB','RAM','SSD','PSU','MON','COOL','CASE','PC','ACC'),
      '-', LPAD(sp.id,4,'0')),
    sp.ten_san_pham = CONCAT(CASE p.category_id
      WHEN 1 THEN CONCAT(
        ELT(1+MOD(p.local_rank-1,4),'Bộ nâng cấp máy tính','Gói linh kiện Creator','Bộ kit gaming Starter','Gói nâng cấp hiệu năng'),
        ' ', ELT(1+MOD(FLOOR((p.local_rank-1)/4),3),'AM5','LGA1700','DDR5'), ' - ', th.ten_thuong_hieu)
      WHEN 2 THEN CONCAT('Bộ xử lý ', CASE WHEN p.brand_id=4 THEN
        ELT(1+MOD(p.local_rank-1,8),'Intel Core i3-13100F','Intel Core i5-12400F','Intel Core i5-13400F','Intel Core i5-14600K','Intel Core i7-13700K','Intel Core i7-14700K','Intel Core i9-14900K','Intel Core Ultra 7 265K')
        ELSE ELT(1+MOD(p.local_rank-1,8),'AMD Ryzen 5 5600','AMD Ryzen 5 7500F','AMD Ryzen 5 7600','AMD Ryzen 7 7700','AMD Ryzen 7 7800X3D','AMD Ryzen 9 7900','AMD Ryzen 9 7950X','AMD Ryzen 9 9950X') END)
      WHEN 3 THEN CONCAT('Card đồ họa ', CASE WHEN p.brand_id=5 THEN
        ELT(1+MOD(p.local_rank-1,5),'Radeon RX 7600 8GB','Radeon RX 7700 XT 12GB','Radeon RX 7800 XT 16GB','Radeon RX 7900 GRE 16GB','Radeon RX 7900 XTX 24GB')
        ELSE ELT(1+MOD(p.local_rank-1,6),'GeForce RTX 4060 8GB','GeForce RTX 4060 Ti 8GB','GeForce RTX 4070 SUPER 12GB','GeForce RTX 4070 Ti SUPER 16GB','GeForce RTX 4080 SUPER 16GB','GeForce RTX 4090 24GB') END,
        ' ', ELT(1+MOD(p.local_rank-1,3),'Dual Fan','Gaming OC','Ventus'), ' - ', th.ten_thuong_hieu)
      WHEN 4 THEN CONCAT('Mainboard ', ELT(1+MOD(p.local_rank-1,6),'B760M WiFi DDR5','Z790 Gaming WiFi','B650M WiFi','X670E Gaming','H610M DDR4','B550M WiFi'),
        ' ', ELT(1+MOD(FLOOR((p.local_rank-1)/3),3),'PRO','AORUS','TUF'), ' - ', th.ten_thuong_hieu)
      WHEN 5 THEN CONCAT('Kit RAM DDR5 ', ELT(1+MOD(p.local_rank-1,3),'16GB','32GB','64GB'), ' ',
        ELT(1+MOD(FLOOR((p.local_rank-1)/3),3),'5600MHz','6000MHz','6400MHz'), ' ',
        CASE p.brand_id WHEN 6 THEN 'Vengeance' WHEN 7 THEN 'Fury Beast' ELSE 'OEM Performance' END, ' - ', th.ten_thuong_hieu)
      WHEN 6 THEN CONCAT('Ổ cứng SSD ', CASE p.brand_id WHEN 7 THEN 'KC3000' WHEN 8 THEN '990 EVO' ELSE 'Black SN770' END,
        ' ', ELT(1+MOD(p.local_rank-1,4),'500GB','1TB','2TB','4TB'), ' NVMe - ', th.ten_thuong_hieu)
      WHEN 7 THEN CONCAT('Nguồn máy tính ', ELT(1+MOD(p.local_rank-1,5),'550W','650W','750W','850W','1000W'), ' ',
        ELT(1+MOD(FLOOR((p.local_rank-1)/5),3),'80 Plus Bronze','80 Plus Gold','80 Plus Platinum'), ' - ', th.ten_thuong_hieu)
      WHEN 8 THEN CONCAT('Màn hình ', ELT(1+MOD(p.local_rank-1,4),'24 inch FHD 180Hz','27 inch QHD 180Hz','27 inch 4K 144Hz','32 inch UHD 160Hz'), ' ',
        CASE p.brand_id WHEN 15 THEN 'UltraGear' WHEN 8 THEN 'Odyssey' WHEN 1 THEN 'TUF Gaming' WHEN 2 THEN 'MAG' ELSE 'AORUS' END, ' - ', th.ten_thuong_hieu)
      WHEN 9 THEN CONCAT('Tản nhiệt ', ELT(1+MOD(p.local_rank-1,4),'khí tháp đôi 120mm','AIO 240mm','AIO 280mm','AIO 360mm'), ' ',
        ELT(1+MOD(FLOOR((p.local_rank-1)/4),3),'ARGB','Quiet Edition','Performance'), ' - ', th.ten_thuong_hieu)
      WHEN 10 THEN CONCAT('Vỏ case ', ELT(1+MOD(p.local_rank-1,4),'Mini Tower Airflow','Mid Tower Mesh','Mid Tower kính cong','Full Tower Dual Chamber'), ' ',
        ELT(1+MOD(FLOOR((p.local_rank-1)/4),3),'đen','trắng','xám'), ' - ', th.ten_thuong_hieu)
      WHEN 11 THEN CONCAT('PC Build ', ELT(1+MOD(p.local_rank-1,5),'Esports','Studio','Workstation','Gaming QHD','Gaming 4K'), ' ',
        ELT(1+MOD(FLOOR((p.local_rank-1)/5),3),'Core','Pro','Elite'), ' - ', th.ten_thuong_hieu)
      WHEN 12 THEN CONCAT(ELT(1+MOD(p.local_rank-1,5),'Bàn phím cơ TKL','Chuột gaming không dây','Tai nghe gaming 7.1','Webcam Full HD','Bộ điều khiển streaming'), ' ',
        ELT(1+MOD(FLOOR((p.local_rank-1)/5),3),'Core','Pro','Elite'), ' - ', th.ten_thuong_hieu)
    END, ' · ', ELT(p.category_id,'KIT','CPU','VGA','MB','RAM','SSD','PSU','MON','COOL','CASE','PC','ACC'), LPAD(p.local_rank,2,'0')),
    sp.mo_ta = CONCAT('Hàng chính hãng ', th.ten_thuong_hieu, ', bảo hành theo tiêu chuẩn nhà sản xuất.'),
    sp.thong_so_ky_thuat = CASE p.category_id
      WHEN 1 THEN JSON_OBJECT('nen_tang',ELT(1+MOD(p.local_rank-1,3),'AM5','LGA1700','DDR5'),'muc_dich','nâng cấp đồng bộ')
      WHEN 2 THEN JSON_OBJECT('socket',IF(p.brand_id=4,'LGA1700','AM5'),'so_nhan',ELT(1+MOD(p.local_rank-1,4),'6','8','12','16'),'bao_hanh','36 tháng')
      WHEN 3 THEN JSON_OBJECT('vram',ELT(1+MOD(p.local_rank-1,4),'8GB','12GB','16GB','24GB'),'ket_noi','PCIe 4.0','bao_hanh','36 tháng')
      WHEN 4 THEN JSON_OBJECT('chipset',ELT(1+MOD(p.local_rank-1,6),'B760','Z790','B650','X670E','H610','B550'),'form_factor',ELT(1+MOD(p.local_rank-1,3),'mATX','ATX','Mini-ITX'))
      WHEN 5 THEN JSON_OBJECT('loai','DDR5','dung_luong',ELT(1+MOD(p.local_rank-1,3),'16GB','32GB','64GB'),'toc_do',ELT(1+MOD(p.local_rank-1,3),'5600MHz','6000MHz','6400MHz'))
      WHEN 6 THEN JSON_OBJECT('giao_tiep','NVMe PCIe 4.0','dung_luong',ELT(1+MOD(p.local_rank-1,4),'500GB','1TB','2TB','4TB'),'bao_hanh','60 tháng')
      WHEN 7 THEN JSON_OBJECT('cong_suat',ELT(1+MOD(p.local_rank-1,5),'550W','650W','750W','850W','1000W'),'chuan',ELT(1+MOD(p.local_rank-1,3),'80 Plus Bronze','80 Plus Gold','80 Plus Platinum'))
      WHEN 8 THEN JSON_OBJECT('kich_thuoc',ELT(1+MOD(p.local_rank-1,3),'24 inch','27 inch','32 inch'),'do_phan_giai',ELT(1+MOD(p.local_rank-1,3),'FHD','QHD','UHD'),'tan_so_quet',ELT(1+MOD(p.local_rank-1,3),'165Hz','180Hz','240Hz'))
      WHEN 9 THEN JSON_OBJECT('loai',ELT(1+MOD(p.local_rank-1,2),'Tản khí','Tản nước AIO'),'kich_thuoc',ELT(1+MOD(p.local_rank-1,3),'120mm','240mm','360mm'))
      WHEN 10 THEN JSON_OBJECT('form_factor',ELT(1+MOD(p.local_rank-1,3),'mATX','ATX','E-ATX'),'mau_sac',ELT(1+MOD(p.local_rank-1,3),'Đen','Trắng','Xám'))
      WHEN 11 THEN JSON_OBJECT('cpu',ELT(1+MOD(p.local_rank-1,3),'Core i5','Ryzen 7','Core i7'),'gpu',ELT(1+MOD(p.local_rank-1,3),'RTX 4060','RTX 4070 SUPER','RX 7800 XT'),'ram',ELT(1+MOD(p.local_rank-1,3),'16GB','32GB','64GB'))
      WHEN 12 THEN JSON_OBJECT('ket_noi',ELT(1+MOD(p.local_rank-1,3),'USB-C','Bluetooth 5.3','Wireless 2.4GHz'),'bao_hanh','24 tháng')
    END,
    sp.thue_vat = 10.00,
    sp.trang_thai = CASE WHEN p.category_id=9 OR p.brand_id IN (9,12,15) OR MOD(p.local_rank,9)=0 THEN 0 ELSE 1 END;

-- Every combo belongs to PC Build. Keep all 12 live rows and de-duplicate the two ad-hoc names.
UPDATE san_pham
SET danh_muc_id = 11,
    ten_san_pham = CASE ma_san_pham
      WHEN '4142' THEN 'PC Gaming Nova QHD'
      WHEN '4141' THEN 'PC Gaming Pulse FHD'
      ELSE ten_san_pham END
WHERE loai_san_pham = 'BO_PC';

DROP TEMPORARY TABLE IF EXISTS tmp_combo_rank;
CREATE TEMPORARY TABLE tmp_combo_rank AS
SELECT id AS combo_id, ROW_NUMBER() OVER (ORDER BY id) AS combo_rank
FROM san_pham WHERE loai_san_pham='BO_PC';
UPDATE san_pham sp JOIN tmp_combo_rank c ON c.combo_id=sp.id
SET sp.trang_thai = CASE WHEN MOD(c.combo_rank,4)=0 THEN 0 ELSE 1 END;

-- Combo versions had no stock/order/serial/component references. Reuse them as real V2 rows
-- for single products, preserving every row while leaving combos with zero own versions.
DROP TEMPORARY TABLE IF EXISTS tmp_combo_versions;
CREATE TEMPORARY TABLE tmp_combo_versions AS
SELECT pb.id AS version_id, ROW_NUMBER() OVER (ORDER BY pb.id) AS rn
FROM phien_ban_san_pham pb
JOIN san_pham sp ON sp.id=pb.san_pham_id
WHERE sp.loai_san_pham='BO_PC'
  AND NOT EXISTS (SELECT 1 FROM ton_kho tk WHERE tk.phien_ban_id=pb.id)
  AND NOT EXISTS (SELECT 1 FROM chi_tiet_don_hang ct WHERE ct.phien_ban_id=pb.id)
  AND NOT EXISTS (SELECT 1 FROM thanh_phan_combo tp WHERE tp.phien_ban_thanh_phan_id=pb.id)
  AND NOT EXISTS (SELECT 1 FROM so_serial_san_pham ss WHERE ss.phien_ban_id=pb.id);

DROP TEMPORARY TABLE IF EXISTS tmp_variant_targets;
CREATE TEMPORARY TABLE tmp_variant_targets AS
SELECT p.product_id, p.category_id, p.local_rank,
       ROW_NUMBER() OVER (ORDER BY p.product_id) AS rn
FROM tmp_product_plan p
WHERE p.category_id IN (5,6,8,10,11,12) AND MOD(p.local_rank,4)=0;

UPDATE phien_ban_san_pham pb
JOIN tmp_combo_versions cv ON cv.version_id=pb.id
JOIN tmp_variant_targets vt ON vt.rn=cv.rn
JOIN san_pham sp ON sp.id=vt.product_id
SET pb.san_pham_id=vt.product_id,
    pb.ten_phien_ban=CASE vt.category_id
      WHEN 5 THEN '32GB hiệu năng cao' WHEN 6 THEN '2TB'
      WHEN 8 THEN '27 inch QHD' WHEN 10 THEN 'Màu trắng'
      WHEN 11 THEN '32GB / SSD 2TB' ELSE 'Màu trắng' END,
    pb.ma_vach=CONCAT('RV-V2-',sp.ma_san_pham),
    pb.gia_ban_le=1000000,
    pb.gia_nhap=820000,
    pb.khoi_luong=0,
    pb.trang_thai=sp.trang_thai;

DROP TEMPORARY TABLE IF EXISTS tmp_base_version;
CREATE TEMPORARY TABLE tmp_base_version AS
SELECT pb.san_pham_id, MIN(pb.id) AS version_id
FROM phien_ban_san_pham pb
JOIN san_pham sp ON sp.id=pb.san_pham_id AND sp.loai_san_pham='DON'
GROUP BY pb.san_pham_id;
ALTER TABLE tmp_base_version ADD PRIMARY KEY (san_pham_id);

UPDATE phien_ban_san_pham pb
JOIN tmp_base_version bv ON bv.version_id=pb.id
JOIN tmp_product_plan p ON p.product_id=bv.san_pham_id
JOIN san_pham sp ON sp.id=p.product_id
SET pb.ten_phien_ban=CASE p.category_id
      WHEN 2 THEN 'Box chính hãng' WHEN 3 THEN 'Bản OC'
      WHEN 4 THEN 'Tiêu chuẩn' WHEN 5 THEN '16GB tiêu chuẩn'
      WHEN 6 THEN '1TB' WHEN 7 THEN '750W'
      WHEN 8 THEN '24 inch FHD' WHEN 9 THEN 'Màu đen'
      WHEN 10 THEN 'Màu đen' WHEN 11 THEN '16GB / SSD 1TB'
      WHEN 12 THEN 'Màu đen' ELSE 'Tiêu chuẩn' END,
    pb.gia_ban_le=CASE p.category_id
      WHEN 1 THEN 2500000 + MOD(p.local_rank-1,6)*600000
      WHEN 2 THEN 3200000 + MOD(p.local_rank-1,8)*1800000
      WHEN 3 THEN 7500000 + MOD(p.local_rank-1,6)*5500000
      WHEN 4 THEN 2200000 + MOD(p.local_rank-1,6)*1400000
      WHEN 5 THEN 1200000 + MOD(p.local_rank-1,6)*550000
      WHEN 6 THEN 1100000 + MOD(p.local_rank-1,7)*850000
      WHEN 7 THEN 1300000 + MOD(p.local_rank-1,6)*750000
      WHEN 8 THEN 3200000 + MOD(p.local_rank-1,7)*1800000
      WHEN 9 THEN 650000 + MOD(p.local_rank-1,7)*700000
      WHEN 10 THEN 950000 + MOD(p.local_rank-1,7)*600000
      WHEN 11 THEN 14500000 + MOD(p.local_rank-1,7)*6500000
      WHEN 12 THEN 450000 + MOD(p.local_rank-1,8)*650000 END,
    pb.gia_nhap=ROUND((CASE p.category_id
      WHEN 1 THEN 2500000 + MOD(p.local_rank-1,6)*600000
      WHEN 2 THEN 3200000 + MOD(p.local_rank-1,8)*1800000
      WHEN 3 THEN 7500000 + MOD(p.local_rank-1,6)*5500000
      WHEN 4 THEN 2200000 + MOD(p.local_rank-1,6)*1400000
      WHEN 5 THEN 1200000 + MOD(p.local_rank-1,6)*550000
      WHEN 6 THEN 1100000 + MOD(p.local_rank-1,7)*850000
      WHEN 7 THEN 1300000 + MOD(p.local_rank-1,6)*750000
      WHEN 8 THEN 3200000 + MOD(p.local_rank-1,7)*1800000
      WHEN 9 THEN 650000 + MOD(p.local_rank-1,7)*700000
      WHEN 10 THEN 950000 + MOD(p.local_rank-1,7)*600000
      WHEN 11 THEN 14500000 + MOD(p.local_rank-1,7)*6500000
      WHEN 12 THEN 450000 + MOD(p.local_rank-1,8)*650000 END)*0.82,-3),
    pb.khoi_luong=CASE p.category_id
      WHEN 8 THEN 5200 WHEN 10 THEN 7800 WHEN 11 THEN 12500 ELSE 900 END,
    pb.trang_thai=sp.trang_thai;

-- Add the remaining selected V2 rows only when their deterministic barcode is absent.
INSERT INTO phien_ban_san_pham
  (san_pham_id,ten_phien_ban,ma_vach,gia_ban_le,gia_nhap,khoi_luong,trang_thai)
SELECT vt.product_id,
       CASE vt.category_id
         WHEN 5 THEN '32GB hiệu năng cao' WHEN 6 THEN '2TB'
         WHEN 8 THEN '27 inch QHD' WHEN 10 THEN 'Màu trắng'
         WHEN 11 THEN '32GB / SSD 2TB' ELSE 'Màu trắng' END,
       CONCAT('RV-V2-',sp.ma_san_pham),
       ROUND(base.gia_ban_le*1.15,-3), ROUND(base.gia_nhap*1.15,-3), base.khoi_luong, sp.trang_thai
FROM tmp_variant_targets vt
JOIN san_pham sp ON sp.id=vt.product_id
JOIN tmp_base_version bv ON bv.san_pham_id=vt.product_id
JOIN phien_ban_san_pham base ON base.id=bv.version_id
WHERE NOT EXISTS (
  SELECT 1 FROM phien_ban_san_pham existing
  WHERE existing.ma_vach=CONCAT('RV-V2-',sp.ma_san_pham)
);

-- Recalculate every managed V2 price after reuse/insert so reruns converge to one result.
UPDATE phien_ban_san_pham v2
JOIN san_pham sp ON sp.id=v2.san_pham_id
JOIN tmp_base_version bv ON bv.san_pham_id=sp.id
JOIN phien_ban_san_pham base ON base.id=bv.version_id
SET v2.gia_ban_le=ROUND(base.gia_ban_le*1.15,-3),
    v2.gia_nhap=ROUND(base.gia_nhap*1.15,-3),
    v2.trang_thai=sp.trang_thai
WHERE v2.ma_vach=CONCAT('RV-V2-',sp.ma_san_pham);

-- One inventory row per version where absent, using the existing active warehouse.
INSERT INTO ton_kho
  (kho_hang_id,phien_ban_id,ton_thuc_te,ton_co_the_ban,hang_loi,vi_tri_luu_kho,muc_ton_toi_thieu)
SELECT (SELECT MIN(id) FROM kho_hang WHERE trang_thai=1), pb.id, 0, 0, 0, 'Chờ phân vị trí', 5
FROM phien_ban_san_pham pb
JOIN san_pham sp ON sp.id=pb.san_pham_id AND sp.loai_san_pham='DON'
WHERE NOT EXISTS (SELECT 1 FROM ton_kho tk WHERE tk.phien_ban_id=pb.id);

-- Deterministic stock bands: out, low, normal, and overstocked; physical = sellable + faulty.
UPDATE ton_kho tk
JOIN phien_ban_san_pham pb ON pb.id=tk.phien_ban_id
JOIN san_pham sp ON sp.id=pb.san_pham_id AND sp.loai_san_pham='DON'
JOIN tmp_product_plan p ON p.product_id=sp.id
SET tk.ton_co_the_ban=CASE MOD(pb.id,5)
      WHEN 0 THEN 0 WHEN 1 THEN 2 WHEN 2 THEN 14 WHEN 3 THEN 60 ELSE 27 END,
    tk.hang_loi=CASE MOD(pb.id,5) WHEN 1 THEN 1 WHEN 4 THEN 2 ELSE 0 END,
    tk.ton_thuc_te=(CASE MOD(pb.id,5)
      WHEN 0 THEN 0 WHEN 1 THEN 2 WHEN 2 THEN 14 WHEN 3 THEN 60 ELSE 27 END)
      +(CASE MOD(pb.id,5) WHEN 1 THEN 1 WHEN 4 THEN 2 ELSE 0 END),
    tk.muc_ton_toi_thieu=5,
    tk.vi_tri_luu_kho=CONCAT(CHAR(64+p.category_id),'-',LPAD(p.local_rank,2,'0'));

-- Give each combo a deliberately different limiting component stock without changing composition.
UPDATE ton_kho tk
JOIN (
  SELECT DISTINCT phien_ban_thanh_phan_id
  FROM thanh_phan_combo
) used ON used.phien_ban_thanh_phan_id=tk.phien_ban_id
SET tk.ton_co_the_ban=60, tk.hang_loi=0, tk.ton_thuc_te=60, tk.muc_ton_toi_thieu=5;

DROP TEMPORARY TABLE IF EXISTS tmp_combo_control;
CREATE TEMPORARY TABLE tmp_combo_control AS
SELECT combo_id, phien_ban_thanh_phan_id, combo_rank
FROM (
  SELECT tp.san_pham_combo_id AS combo_id, tp.phien_ban_thanh_phan_id,
         cr.combo_rank,
         ROW_NUMBER() OVER (
           PARTITION BY tp.san_pham_combo_id
           ORDER BY usage_count, tp.id
         ) AS pick_rank
  FROM thanh_phan_combo tp
  JOIN tmp_combo_rank cr ON cr.combo_id=tp.san_pham_combo_id
  JOIN (
    SELECT phien_ban_thanh_phan_id, COUNT(*) AS usage_count
    FROM thanh_phan_combo GROUP BY phien_ban_thanh_phan_id
  ) uses ON uses.phien_ban_thanh_phan_id=tp.phien_ban_thanh_phan_id
) picked WHERE pick_rank=1;

UPDATE ton_kho tk
JOIN tmp_combo_control cc ON cc.phien_ban_thanh_phan_id=tk.phien_ban_id
SET tk.ton_co_the_ban=CASE MOD(cc.combo_rank,4) WHEN 0 THEN 0 WHEN 1 THEN 2 WHEN 2 THEN 12 ELSE 60 END,
    tk.hang_loi=CASE MOD(cc.combo_rank,4) WHEN 1 THEN 1 ELSE 0 END,
    tk.ton_thuc_te=(CASE MOD(cc.combo_rank,4) WHEN 0 THEN 0 WHEN 1 THEN 2 WHEN 2 THEN 12 ELSE 60 END)
      +(CASE MOD(cc.combo_rank,4) WHEN 1 THEN 1 ELSE 0 END),
    tk.muc_ton_toi_thieu=5;

-- Seed serials only for unreferenced single-product versions. With no orders in this DB,
-- UC-018 permits only TRONG_KHO/LOI; DA_BAN/DANG_BAO_HANH are intentionally not forged.
DROP TEMPORARY TABLE IF EXISTS tmp_serial_versions;
CREATE TEMPORARY TABLE tmp_serial_versions AS
SELECT version_id, ROW_NUMBER() OVER (ORDER BY version_id DESC) AS rn
FROM (
  SELECT pb.id AS version_id
  FROM phien_ban_san_pham pb
  JOIN san_pham sp ON sp.id=pb.san_pham_id AND sp.loai_san_pham='DON'
  JOIN tmp_product_plan p ON p.product_id=sp.id AND p.category_id IN (2,3,6)
  WHERE sp.trang_thai=1 AND pb.trang_thai=1
    AND NOT EXISTS (SELECT 1 FROM thanh_phan_combo tp WHERE tp.phien_ban_thanh_phan_id=pb.id)
  ORDER BY pb.id DESC LIMIT 8
) chosen;

INSERT INTO so_serial_san_pham
  (phien_ban_id,so_serial,trang_thai,don_hang_id,ngay_kich_hoat,han_bao_hanh)
SELECT sv.version_id, CONCAT('RV-SEED-',LPAD(sv.version_id,6,'0'),'-',n.n),
       CASE WHEN n.n=4 THEN 'LOI' ELSE 'TRONG_KHO' END,
       NULL,NULL,NULL
FROM tmp_serial_versions sv
CROSS JOIN (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) n
WHERE TRUE
ON DUPLICATE KEY UPDATE
  phien_ban_id=VALUES(phien_ban_id), trang_thai=VALUES(trang_thai),
  don_hang_id=NULL, ngay_kich_hoat=NULL, han_bao_hanh=NULL;

UPDATE ton_kho tk
JOIN tmp_serial_versions sv ON sv.version_id=tk.phien_ban_id
SET tk.ton_thuc_te=4, tk.ton_co_the_ban=3, tk.hang_loi=1, tk.muc_ton_toi_thieu=5;

COMMIT;

-- Small runnable postcondition report. Every check should return 0 except the spread/count rows.
SELECT 'brand_spread' AS check_name, COUNT(DISTINCT thuong_hieu_id) AS result
FROM san_pham WHERE loai_san_pham='DON';
SELECT 'category_spread' AS check_name, COUNT(DISTINCT danh_muc_id) AS result
FROM san_pham WHERE loai_san_pham='DON';
SELECT 'combo_own_versions' AS check_name, COUNT(*) AS result
FROM phien_ban_san_pham pb JOIN san_pham sp ON sp.id=pb.san_pham_id
WHERE sp.loai_san_pham='BO_PC';
SELECT 'inventory_equation_errors' AS check_name, COUNT(*) AS result
FROM ton_kho WHERE ton_thuc_te<>ton_co_the_ban+hang_loi;
SELECT 'unsafe_serial_links' AS check_name, COUNT(*) AS result
FROM so_serial_san_pham
WHERE (trang_thai IN ('DA_BAN','DANG_BAO_HANH') AND don_hang_id IS NULL)
   OR (trang_thai IN ('TRONG_KHO','LOI') AND don_hang_id IS NOT NULL);
