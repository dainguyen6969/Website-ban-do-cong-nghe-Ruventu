import vga4090Img from '../assets/vga_4090.png';
import vga4080Img from '../assets/vga_4080.png';
import vga7900Img from '../assets/vga_7900.png';
import vga4070tiImg from '../assets/vga_4070ti.png';
import kbKeychronImg from '../assets/kb_keychron.png';
import productImg from '../assets/imgg.png';

export const mockProducts = {
  "RVT-MB-X670E-MSI-TOM": {
    id: "RVT-MB-X670E-MSI-TOM",
    category: "Mainboard",
    brand: "MSI",
    name: "MSI MAG X670E TOMAHAWK WIFI AM5",
    originalPrice: 8900000,
    discountAmount: 1410000,
    currentPrice: 7490000,
    stock: 5,
    discountPercent: 16,
    tags: ["MAINBOARD", "MSI"],
    images: [productImg],
    specsSummary: [
      { label: "Socket", value: "AM5" },
      { label: "RAM", value: "DDR5 6600 OC" },
      { label: "Form", value: "ATX PCIe 5.0" },
      { label: "VRM", value: "16+2 Phase 75A" },
      { label: "LAN", value: "2.5GbE + WIFI 6E" },
    ],
    fullSpecs: [
      { label: "Thương hiệu", value: "MSI" },
      { label: "Danh mục", value: "Mainboard" },
      { label: "Mã sản phẩm", value: "RVT-MB-X670E-MSI-TOM" },
      { label: "Socket", value: "AM5" },
      { label: "RAM", value: "DDR5 6600 OC" },
      { label: "Form", value: "ATX PCIe 5.0" },
      { label: "VRM", value: "16+2 Phase 75A" },
      { label: "LAN", value: "2.5GbE + WIFI 6E" },
      { label: "Bảo hành", value: "36 tháng chính hãng" },
      { label: "Xuất xứ", value: "Chính hãng phân phối" },
    ],
    policies: [
      { title: "BH 36 THÁNG", desc: "Chính hãng", icon: "shield" },
      { title: "MIỄN PHÍ VC", desc: "Đơn từ 5tr", icon: "truck" },
      { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" }
    ]
  },
  "ASUS-ROG-4090": {
    id: "ASUS-ROG-4090",
    category: "VGA",
    brand: "ASUS",
    name: "ASUS ROG STRIX RTX 4090 OC 24GB",
    originalPrice: 56990000,
    discountAmount: 4000000,
    currentPrice: 52990000,
    stock: 2,
    discountPercent: 12,
    tags: ["VGA", "ASUS", "HOT"],
    images: [vga4090Img],
    specsSummary: [
      { label: "VRAM", value: "24GB GDDR6X" },
      { label: "TDP", value: "450W" },
      { label: "Bus", value: "384-bit" },
      { label: "Output", value: "2x DP 1.4 + HDMI 2.1" },
    ],
    fullSpecs: [
      { label: "Thương hiệu", value: "ASUS" },
      { label: "Danh mục", value: "VGA" },
      { label: "Mã sản phẩm", value: "ASUS-ROG-4090" },
      { label: "VRAM", value: "24GB GDDR6X" },
      { label: "TDP", value: "450W" },
      { label: "Bus", value: "384-bit" },
      { label: "Output", value: "2x DP 1.4 + HDMI 2.1" },
      { label: "Bảo hành", value: "36 tháng chính hãng" },
    ],
    policies: [
      { title: "BH 36 THÁNG", desc: "Chính hãng", icon: "shield" },
      { title: "MIỄN PHÍ VC", desc: "Đơn từ 5tr", icon: "truck" },
      { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" }
    ]
  },
  "MSI-RTX-4080": {
    id: "MSI-RTX-4080",
    category: "VGA",
    brand: "MSI",
    name: "MSI GeForce RTX 4080 Super Gaming X Trio",
    originalPrice: 28990000,
    discountAmount: 2000000,
    currentPrice: 26990000,
    stock: 8,
    discountPercent: 8,
    tags: ["VGA", "MSI"],
    images: [vga4080Img],
    specsSummary: [
      { label: "VRAM", value: "16GB GDDR6X" },
      { label: "TDP", value: "320W" },
      { label: "Bus", value: "256-bit" },
      { label: "Output", value: "2x DP 1.4 + HDMI 2.1" },
    ],
    fullSpecs: [
      { label: "Thương hiệu", value: "MSI" },
      { label: "Danh mục", value: "VGA" },
      { label: "Mã sản phẩm", value: "MSI-RTX-4080" },
      { label: "VRAM", value: "16GB GDDR6X" },
      { label: "TDP", value: "320W" },
      { label: "Bus", value: "256-bit" },
      { label: "Output", value: "2x DP 1.4 + HDMI 2.1" },
      { label: "Bảo hành", value: "36 tháng chính hãng" },
    ],
    policies: [
      { title: "BH 36 THÁNG", desc: "Chính hãng", icon: "shield" },
      { title: "MIỄN PHÍ VC", desc: "Đơn từ 5tr", icon: "truck" },
      { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" }
    ]
  },
  "GIGA-RX-7900XTX": {
    id: "GIGA-RX-7900XTX",
    category: "VGA",
    brand: "Gigabyte",
    name: "Gigabyte RX 7900 XTX Gaming OC 24GB",
    originalPrice: 27990000,
    discountAmount: 2500000,
    currentPrice: 25490000,
    stock: 5,
    discountPercent: 10,
    tags: ["VGA", "GIGABYTE"],
    images: [vga7900Img],
    specsSummary: [
      { label: "VRAM", value: "24GB GDDR6" },
      { label: "TDP", value: "355W" },
      { label: "Bus", value: "384-bit" },
      { label: "Output", value: "2x DP 2.1 + HDMI 2.1" },
    ],
    fullSpecs: [
      { label: "Thương hiệu", value: "Gigabyte" },
      { label: "Danh mục", value: "VGA" },
      { label: "Mã sản phẩm", value: "GIGA-RX-7900XTX" },
      { label: "VRAM", value: "24GB GDDR6" },
      { label: "TDP", value: "355W" },
      { label: "Bus", value: "384-bit" },
      { label: "Output", value: "2x DP 2.1 + HDMI 2.1" },
      { label: "Bảo hành", value: "36 tháng chính hãng" },
    ],
    policies: [
      { title: "BH 36 THÁNG", desc: "Chính hãng", icon: "shield" },
      { title: "MIỄN PHÍ VC", desc: "Đơn từ 5tr", icon: "truck" },
      { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" }
    ]
  },
  "ASUS-ROG-4070TI": {
    id: "ASUS-ROG-4070TI",
    category: "VGA",
    brand: "ASUS",
    name: "ASUS ROG STRIX RTX 4070 Ti OC 12GB",
    originalPrice: 24990000,
    discountAmount: 3500000,
    currentPrice: 21490000,
    stock: 12,
    discountPercent: 15,
    tags: ["VGA", "ASUS"],
    images: [vga4070tiImg],
    specsSummary: [
      { label: "VRAM", value: "12GB GDDR6X" },
      { label: "TDP", value: "285W" },
      { label: "Bus", value: "192-bit" },
      { label: "Output", value: "2x DP 1.4 + HDMI 2.1" },
    ],
    fullSpecs: [
      { label: "Thương hiệu", value: "ASUS" },
      { label: "Danh mục", value: "VGA" },
      { label: "Mã sản phẩm", value: "ASUS-ROG-4070TI" },
      { label: "VRAM", value: "12GB GDDR6X" },
      { label: "TDP", value: "285W" },
      { label: "Bus", value: "192-bit" },
      { label: "Output", value: "2x DP 1.4 + HDMI 2.1" },
      { label: "Bảo hành", value: "36 tháng chính hãng" },
    ],
    policies: [
      { title: "BH 36 THÁNG", desc: "Chính hãng", icon: "shield" },
      { title: "MIỄN PHÍ VC", desc: "Đơn từ 5tr", icon: "truck" },
      { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" }
    ]
  },
  "KB-KEYCHRON-Q1": {
    id: "KB-KEYCHRON-Q1",
    category: "Bàn phím",
    brand: "Keychron",
    name: "Keychron Q1 Pro Carbon Black (Bàn phím cơ)",
    originalPrice: 4500000,
    discountAmount: 610000,
    currentPrice: 3890000,
    stock: 10,
    discountPercent: 15,
    tags: ["KEYBOARD", "KEYCHRON", "HOT"],
    images: [kbKeychronImg],
    specsSummary: [
      { label: "Switch", value: "Gateron Pro Red" },
      { label: "Layout", value: "75% TKL" },
      { label: "Kết nối", value: "Cáp / VIA" },
      { label: "Keycap", value: "PBT Double-shot" },
    ],
    fullSpecs: [
      { label: "Thương hiệu", value: "Keychron" },
      { label: "Danh mục", value: "Bàn phím" },
      { label: "Mã sản phẩm", value: "KB-KEYCHRON-Q1" },
      { label: "Switch", value: "Gateron Pro Red" },
      { label: "Layout", value: "75% TKL" },
      { label: "Kết nối", value: "Cáp / VIA" },
      { label: "Keycap", value: "PBT Double-shot" },
      { label: "Bảo hành", value: "12 tháng chính hãng" },
    ],
    policies: [
      { title: "BH 12 THÁNG", desc: "Chính hãng", icon: "shield" },
      { title: "MIỄN PHÍ VC", desc: "Đơn từ 5tr", icon: "truck" },
      { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" }
    ]
  },
  "KB-RAZER-BW": {
    id: "KB-RAZER-BW",
    category: "Bàn phím",
    brand: "Razer",
    name: "Razer BlackWidow V4 Pro - Yellow Switch",
    originalPrice: 5200000,
    discountAmount: 710000,
    currentPrice: 4490000,
    stock: 5,
    discountPercent: 10,
    tags: ["KEYBOARD", "RAZER"],
    images: [kbKeychronImg],
    specsSummary: [
      { label: "Switch", value: "Razer Yellow Linear" },
      { label: "Layout", value: "Full size" },
      { label: "Backlit", value: "Chroma RGB" },
      { label: "Kết nối", value: "USB-C / Wireless" },
    ],
    fullSpecs: [
      { label: "Thương hiệu", value: "Razer" },
      { label: "Danh mục", value: "Bàn phím" },
      { label: "Mã sản phẩm", value: "KB-RAZER-BW" },
      { label: "Switch", value: "Razer Yellow Linear" },
      { label: "Layout", value: "Full size" },
      { label: "Backlit", value: "Chroma RGB" },
      { label: "Kết nối", value: "USB-C / Wireless" },
      { label: "Bảo hành", value: "24 tháng chính hãng" },
    ],
    policies: [
      { title: "BH 24 THÁNG", desc: "Chính hãng", icon: "shield" },
      { title: "MIỄN PHÍ VC", desc: "Đơn từ 5tr", icon: "truck" },
      { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" }
    ]
  },
  "KB-CORSAIR-K100": {
    id: "KB-CORSAIR-K100",
    category: "Bàn phím",
    brand: "Corsair",
    name: "Corsair K100 RGB Optical-Mech Gaming",
    originalPrice: 6900000,
    discountAmount: 910000,
    currentPrice: 5990000,
    stock: 3,
    discountPercent: 20,
    tags: ["KEYBOARD", "CORSAIR"],
    images: [kbKeychronImg],
    specsSummary: [
      { label: "Switch", value: "OPX Optical" },
      { label: "Layout", value: "Full size" },
      { label: "Backlit", value: "Per-key RGB" },
      { label: "Kết nối", value: "USB-C" },
    ],
    fullSpecs: [
      { label: "Thương hiệu", value: "Corsair" },
      { label: "Danh mục", value: "Bàn phím" },
      { label: "Mã sản phẩm", value: "KB-CORSAIR-K100" },
      { label: "Switch", value: "OPX Optical" },
      { label: "Layout", value: "Full size" },
      { label: "Backlit", value: "Per-key RGB" },
      { label: "Kết nối", value: "USB-C" },
      { label: "Bảo hành", value: "24 tháng chính hãng" },
    ],
    policies: [
      { title: "BH 24 THÁNG", desc: "Chính hãng", icon: "shield" },
      { title: "MIỄN PHÍ VC", desc: "Đơn từ 5tr", icon: "truck" },
      { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" }
    ]
  },
  "KB-STEELSERIES-APEX": {
    id: "KB-STEELSERIES-APEX",
    category: "Bàn phím",
    brand: "SteelSeries",
    name: "SteelSeries Apex Pro TKL Wireless",
    originalPrice: 5290000,
    discountAmount: 0,
    currentPrice: 5290000,
    stock: 7,
    discountPercent: 0,
    tags: ["KEYBOARD", "STEELSERIES"],
    images: [kbKeychronImg],
    specsSummary: [
      { label: "Switch", value: "OmniPoint 2.0" },
      { label: "Layout", value: "TKL 80%" },
      { label: "Kết nối", value: "2.4GHz / BT" },
      { label: "Trọng lượng", value: "980g" },
    ],
    fullSpecs: [
      { label: "Thương hiệu", value: "SteelSeries" },
      { label: "Danh mục", value: "Bàn phím" },
      { label: "Mã sản phẩm", value: "KB-STEELSERIES-APEX" },
      { label: "Switch", value: "OmniPoint 2.0" },
      { label: "Layout", value: "TKL 80%" },
      { label: "Kết nối", value: "2.4GHz / BT" },
      { label: "Trọng lượng", value: "980g" },
      { label: "Bảo hành", value: "12 tháng chính hãng" },
    ],
    policies: [
      { title: "BH 12 THÁNG", desc: "Chính hãng", icon: "shield" },
      { title: "MIỄN PHÍ VC", desc: "Đơn từ 5tr", icon: "truck" },
      { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" }
    ]
  },
  "ASUS-RX-7800XT": {
    id: "ASUS-RX-7800XT",
    category: "VGA",
    brand: "ASUS",
    name: "ASUS ROG STRIX RX 7800 XT OC 16GB",
    originalPrice: 12900000,
    discountAmount: 1410000,
    currentPrice: 11490000,
    stock: 0,
    discountPercent: 11,
    tags: ["VGA", "ASUS"],
    images: [vga7900Img],
    specsSummary: [
      { label: "VRAM", value: "16GB GDDR6" },
      { label: "TDP", value: "263W" },
      { label: "Bus", value: "256-bit" },
      { label: "Output", value: "2x DP 2.1 + 1x HDMI 2.1" },
    ],
    fullSpecs: [
      { label: "Thương hiệu", value: "ASUS" },
      { label: "Danh mục", value: "VGA" },
      { label: "Mã sản phẩm", value: "ASUS-RX-7800XT" },
      { label: "VRAM", value: "16GB GDDR6" },
      { label: "TDP", value: "263W" },
      { label: "Bus", value: "256-bit" },
      { label: "Output", value: "2x DP 2.1 + 1x HDMI 2.1" },
      { label: "Bảo hành", value: "36 tháng chính hãng" },
    ],
    policies: [
      { title: "BH 36 THÁNG", desc: "Chính hãng", icon: "shield" },
      { title: "MIỄN PHÍ VC", desc: "Đơn từ 5tr", icon: "truck" },
      { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" }
    ]
  }
};
