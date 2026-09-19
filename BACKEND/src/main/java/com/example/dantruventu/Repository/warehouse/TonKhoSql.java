package com.example.dantruventu.Repository.warehouse;

public final class TonKhoSql {
    private TonKhoSql() {}

    public static final String BASE =
            """
            WITH wh AS (
                SELECT id, ten_kho
                FROM kho_hang
                WHERE (:khoHangId IS NULL OR id = :khoHangId)
            ),
            stock AS (
                SELECT
                    t.phien_ban_id,
                    t.kho_hang_id,
                    SUM(COALESCE(t.ton_thuc_te, 0)) AS actual,
                    SUM(COALESCE(t.ton_co_the_ban, 0)) AS available,
                    SUM(COALESCE(t.muc_ton_toi_thieu, 0)) AS minimum_stock,
                    GROUP_CONCAT(
                        DISTINCT NULLIF(TRIM(t.vi_tri_luu_kho), '')
                        ORDER BY NULLIF(TRIM(t.vi_tri_luu_kho), '')
                        SEPARATOR ', '
                    ) AS location,
                    MAX(
                        CASE
                            WHEN COALESCE(t.ton_co_the_ban, 0) < 0
                                OR COALESCE(t.ton_thuc_te, 0) < 0
                            THEN 1 ELSE 0
                        END
                    ) AS negative_stock
                FROM ton_kho t
                JOIN wh w ON w.id = t.kho_hang_id
                GROUP BY t.phien_ban_id, t.kho_hang_id
            ),
            parts AS (
                SELECT
                    c.san_pham_combo_id,
                    c.phien_ban_thanh_phan_id AS phien_ban_id,
                    SUM(c.so_luong) AS quantity,
                    MIN(
                        CASE
                            WHEN c.so_luong > 0 AND p.loai_san_pham = 'DON'
                            THEN 1 ELSE 0
                        END
                    ) AS valid_config
                FROM thanh_phan_combo c
                JOIN phien_ban_san_pham v
                    ON v.id = c.phien_ban_thanh_phan_id
                JOIN san_pham p ON p.id = v.san_pham_id
                GROUP BY c.san_pham_combo_id, c.phien_ban_thanh_phan_id
            ),
            combo_stock AS (
                SELECT
                    p.id AS combo_id,
                    w.id AS kho_hang_id,
                    CASE
                        WHEN COUNT(c.phien_ban_id) = 0
                            OR MIN(c.valid_config) = 0
                        THEN 0
                        ELSE MIN(
                            FLOOR(
                                COALESCE(s.available, 0)
                                / NULLIF(c.quantity, 0)
                            )
                        )
                    END AS quantity,
                    CASE
                        WHEN COUNT(c.phien_ban_id) = 0
                            OR MIN(c.valid_config) = 0
                        THEN 1
                        ELSE MAX(
                            CASE
                                WHEN COALESCE(s.actual, 0)
                                        <= COALESCE(s.minimum_stock, 0)
                                    OR COALESCE(s.available, 0) < c.quantity
                                    OR COALESCE(s.negative_stock, 0) = 1
                                THEN 1 ELSE 0
                            END
                        )
                    END AS warning,
                    COALESCE(MAX(s.negative_stock), 0) AS negative_stock
                FROM san_pham p
                CROSS JOIN wh w
                LEFT JOIN parts c ON c.san_pham_combo_id = p.id
                LEFT JOIN stock s
                    ON s.phien_ban_id = c.phien_ban_id
                    AND s.kho_hang_id = w.id
                WHERE p.loai_san_pham = 'BO_PC'
                GROUP BY p.id, w.id
            )
            """;

    private static final String ITEMS =
            BASE
                    + """
          ,
          variant_total AS (
              SELECT
                  v.id AS phien_ban_id,
                  SUM(COALESCE(s.actual, 0)) AS actual,
                  SUM(COALESCE(s.available, 0)) AS available,
                  MAX(s.location) AS location,
                  MAX(
                      CASE
                          WHEN COALESCE(s.actual, 0)
                                  <= COALESCE(s.minimum_stock, 0)
                              OR COALESCE(s.negative_stock, 0) = 1
                          THEN 1 ELSE 0
                      END
                  ) AS warning,
                  MAX(COALESCE(s.negative_stock, 0)) AS negative_stock
              FROM phien_ban_san_pham v
              JOIN san_pham p ON p.id = v.san_pham_id
              CROSS JOIN wh w
              LEFT JOIN stock s
                  ON s.phien_ban_id = v.id
                  AND s.kho_hang_id = w.id
              WHERE p.loai_san_pham = 'DON'
              GROUP BY v.id
          ),
          combo_total AS (
              SELECT
                  combo_id,
                  SUM(quantity) AS quantity,
                  MAX(warning) AS warning,
                  MAX(negative_stock) AS negative_stock
              FROM combo_stock
              GROUP BY combo_id
          ),
          images AS (
              SELECT
                  san_pham_id,
                  duong_dan_anh,
                  ROW_NUMBER() OVER (
                      PARTITION BY san_pham_id
                      ORDER BY COALESCE(la_anh_chinh, 0) DESC,
                          COALESCE(thu_tu_hien_thi, 0), id
                  ) AS rn
              FROM anh_san_pham
          ),
          items AS (
              SELECT
                  'PHIEN_BAN' AS loai_doi_tuong,
                  v.id AS doi_tuong_id,
                  i.duong_dan_anh AS anh,
                  COALESCE(NULLIF(v.ma_vach, ''), p.ma_san_pham)
                      AS ma_hien_thi,
                  v.ten_phien_ban AS ten_hien_thi,
                  COALESCE(t.available, 0) AS ton_co_the_ban,
                  COALESCE(t.actual, 0) AS ton_thuc_te,
                  CASE
                      WHEN :khoHangId IS NOT NULL THEN t.location
                      ELSE NULL
                  END AS vi_tri_luu_kho,
                  COALESCE(t.warning, 1) AS canh_bao,
                  COALESCE(t.negative_stock, 0) AS co_ton_am,
                  CONCAT_WS(
                      ' ', p.ma_san_pham, p.ten_san_pham,
                      v.ten_phien_ban, v.ma_vach
                  ) AS search_text
              FROM phien_ban_san_pham v
              JOIN san_pham p ON p.id = v.san_pham_id
              LEFT JOIN variant_total t ON t.phien_ban_id = v.id
              LEFT JOIN images i
                  ON i.san_pham_id = p.id AND i.rn = 1
              WHERE p.loai_san_pham = 'DON'

              UNION ALL

              SELECT
                  'COMBO',
                  p.id,
                  i.duong_dan_anh,
                  p.ma_san_pham,
                  p.ten_san_pham,
                  COALESCE(t.quantity, 0),
                  COALESCE(t.quantity, 0),
                  NULL,
                  COALESCE(t.warning, 1),
                  COALESCE(t.negative_stock, 0),
                  CONCAT_WS(' ', p.ma_san_pham, p.ten_san_pham)
              FROM san_pham p
              LEFT JOIN combo_total t ON t.combo_id = p.id
              LEFT JOIN images i
                  ON i.san_pham_id = p.id AND i.rn = 1
              WHERE p.loai_san_pham = 'BO_PC'
          )
          """;

    private static final String FILTER =
            """
             FROM items
             WHERE (:loaiDoiTuong = 'ALL' OR loai_doi_tuong = :loaiDoiTuong)
               AND LOWER(search_text) LIKE :keyword ESCAPE '!'
               AND (:chiCanhBao = FALSE OR canh_bao = 1)
            """;

    public static final String COUNT_ITEMS =
            ITEMS + " SELECT COUNT(*) " + FILTER;

    public static final String FIND_ITEMS =
            ITEMS
                    + """
           SELECT
               loai_doi_tuong AS loaiDoiTuong,
               doi_tuong_id AS doiTuongId,
               anh AS anh,
               ma_hien_thi AS maHienThi,
               ten_hien_thi AS tenHienThi,
               ton_co_the_ban AS tonCoTheBan,
               ton_thuc_te AS tonThucTe,
               vi_tri_luu_kho AS viTriLuuKho,
               canh_bao AS canhBao,
               co_ton_am AS coTonAm
          """
                    + FILTER
                    + """
           ORDER BY
               CASE WHEN :sortField = 'doi_tuong_id' AND :sortDir = 'asc'
                   THEN doi_tuong_id END ASC,
               CASE WHEN :sortField = 'doi_tuong_id' AND :sortDir = 'desc'
                   THEN doi_tuong_id END DESC,
               CASE WHEN :sortField = 'ma_hien_thi' AND :sortDir = 'asc'
                   THEN ma_hien_thi END ASC,
               CASE WHEN :sortField = 'ma_hien_thi' AND :sortDir = 'desc'
                   THEN ma_hien_thi END DESC,
               CASE WHEN :sortField = 'ten_hien_thi' AND :sortDir = 'asc'
                   THEN ten_hien_thi END ASC,
               CASE WHEN :sortField = 'ten_hien_thi' AND :sortDir = 'desc'
                   THEN ten_hien_thi END DESC,
               CASE WHEN :sortField = 'ton_thuc_te' AND :sortDir = 'asc'
                   THEN ton_thuc_te END ASC,
               CASE WHEN :sortField = 'ton_thuc_te' AND :sortDir = 'desc'
                   THEN ton_thuc_te END DESC,
               CASE WHEN :sortField = 'ton_co_the_ban' AND :sortDir = 'asc'
                   THEN ton_co_the_ban END ASC,
               CASE WHEN :sortField = 'ton_co_the_ban' AND :sortDir = 'desc'
                   THEN ton_co_the_ban END DESC,
               loai_doi_tuong ASC, doi_tuong_id ASC
          """;

    public static final String VARIANT_STOCKS =
            BASE
                    + """
           SELECT
               w.id AS khoHangId,
               w.ten_kho AS tenKho,
               COALESCE(s.actual, 0) AS tonThucTe,
               COALESCE(s.available, 0) AS tonCoTheBan,
               s.location AS viTriLuuKho,
               COALESCE(s.minimum_stock, 0) AS mucTonToiThieu,
               CASE
                   WHEN COALESCE(s.actual, 0)
                           <= COALESCE(s.minimum_stock, 0)
                       OR COALESCE(s.negative_stock, 0) = 1
                   THEN 1 ELSE 0
               END AS canhBao,
               COALESCE(s.negative_stock, 0) AS coTonAm
           FROM wh w
           LEFT JOIN stock s
               ON s.kho_hang_id = w.id AND s.phien_ban_id = :id
           ORDER BY w.id
          """;

    public static final String COMBO_STOCKS =
            BASE
                    + """
           SELECT
               w.id AS khoHangId,
               w.ten_kho AS tenKho,
               c.quantity AS tonThucTe,
               c.quantity AS tonCoTheBan,
               NULL AS viTriLuuKho,
               NULL AS mucTonToiThieu,
               c.warning AS canhBao,
               c.negative_stock AS coTonAm
           FROM combo_stock c
           JOIN wh w ON w.id = c.kho_hang_id
           WHERE c.combo_id = :id
           ORDER BY w.id
          """;

    public static final String COMPONENTS =
            BASE
                    + """
           SELECT
               c.phien_ban_id AS phienBanId,
               v.ten_phien_ban AS tenPhienBan,
               v.ma_vach AS maVach,
               c.quantity AS soLuong,
               c.valid_config AS hopLe
           FROM parts c
           JOIN phien_ban_san_pham v ON v.id = c.phien_ban_id
           WHERE c.san_pham_combo_id = :id
           ORDER BY c.phien_ban_id
          """;

    public static final String COMPONENT_STOCKS =
            BASE
                    + """
           SELECT
               c.phien_ban_id AS phienBanId,
               w.id AS khoHangId,
               w.ten_kho AS tenKho,
               COALESCE(s.actual, 0) AS tonThucTe,
               COALESCE(s.available, 0) AS tonCoTheBan,
               s.location AS viTriLuuKho,
               COALESCE(s.minimum_stock, 0) AS mucTonToiThieu,
               CASE
                   WHEN COALESCE(s.actual, 0)
                           <= COALESCE(s.minimum_stock, 0)
                       OR COALESCE(s.negative_stock, 0) = 1
                   THEN 1 ELSE 0
               END AS canhBao,
               COALESCE(s.negative_stock, 0) AS coTonAm
           FROM parts c
           LEFT JOIN wh w ON 1 = 1
           LEFT JOIN stock s
               ON s.phien_ban_id = c.phien_ban_id
               AND s.kho_hang_id = w.id
           WHERE c.san_pham_combo_id = :id
           ORDER BY c.phien_ban_id, w.id
          """;
}
