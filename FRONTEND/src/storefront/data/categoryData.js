import pcTitanImg from '../assets/pc_titan.png';
import pcWarlordImg from '../assets/pc_warlord.png';
import pcStrikerImg from '../assets/pc_striker.png';
import pcPhantomImg from '../assets/pc_phantom.png';
import pcViperImg from '../assets/pc_viper.png';
import pcBlazeImg from '../assets/pc_blaze.png';
import pcSpectreImg from '../assets/pc_spectre.png';
import pcStormImg from '../assets/pc_storm.png';
import vga4090Img from '../assets/vga_4090.png';
import vga4080Img from '../assets/vga_4080.png';
import vga7900Img from '../assets/vga_7900.png';
import vga4070tiImg from '../assets/vga_4070ti.png';
import kbKeychronImg from '../assets/kb_keychron.png';
import cpuI9Img from '../assets/cpu_i9.png';
import mainboardZ790Img from '../assets/mainboard_z790.png';
import ramCorsairImg from '../assets/ram_corsair.png';
import ssd990proImg from '../assets/ssd_990pro.png';
export const mockPcBuildProducts = [
  {
    id: 'rvt-build-titan',
    discount: '-10%',
    isHot: true,
    image: pcTitanImg,
    title: 'RUVENTU TITAN X - Creator Workstation',
    category: 'PC Build Sẵn',
    specs: [
      { label: 'VGA', value: 'RTX 4090 24GB' },
      { label: 'CPU', value: 'Core i9-14900K' },
      { label: 'RAM', value: '64GB DDR5-6000' },
      { label: 'SSD', value: 'Samsung 990 Pro 2TB' },
      { label: 'PSU', value: '1200W 80+ Platinum' },
    ],
    originalPrice: '79.900.000đ',
    price: '70.900.000đ',
  },
  {
    id: 'rvt-build-warlord',
    image: pcWarlordImg,
    title: 'RUVENTU WARLORD PRO - High-End Gaming',
    category: 'PC Build Sẵn',
    specs: [
      { label: 'VGA', value: 'RTX 4080 Super 16GB' },
      { label: 'CPU', value: 'Ryzen 9 7950X' },
      { label: 'RAM', value: '32GB DDR5-6000' },
      { label: 'SSD', value: 'WD Black SN850X 1TB' },
      { label: 'PSU', value: 'Corsair RM850e Gold' },
    ],
    price: '54.900.000đ',
  },
  {
    id: 'rvt-build-striker',
    image: pcStrikerImg,
    title: 'RUVENTU STRIKER - Mid-high Gaming',
    category: 'PC Build Sẵn',
    specs: [
      { label: 'VGA', value: 'RX 7800 XT 16GB' },
      { label: 'CPU', value: 'Core i7-14700K' },
      { label: 'RAM', value: '32GB DDR5-5600' },
      { label: 'SSD', value: 'Kingston KC3000 1TB' },
      { label: 'PSU', value: 'Seasonics 750W Gold' },
    ],
    price: '37.900.000đ',
  },
  {
    id: 'rvt-build-phantom',
    image: pcPhantomImg,
    title: 'RUVENTU PHANTOM - Competitive Gaming',
    category: 'PC Build Sẵn',
    specs: [
      { label: 'VGA', value: 'RTX 4060 Ti 8GB' },
      { label: 'CPU', value: 'Ryzen 7 7700X' },
      { label: 'RAM', value: '16GB DDR5-5200' },
      { label: 'SSD', value: 'WD SN770 500GB' },
      { label: 'PSU', value: 'NZXT C650 Gold' },
    ],
    price: '24.900.000đ',
  },
  {
    id: 'rvt-build-viper',
    discount: '-5%',
    image: pcViperImg,
    title: 'RUVENTU VIPER - Budget Gaming',
    category: 'PC Build Sẵn',
    specs: [
      { label: 'VGA', value: 'RTX 4060 8GB' },
      { label: 'CPU', value: 'Core i5-13400F' },
      { label: 'RAM', value: '16GB DDR4-3200' },
      { label: 'SSD', value: 'Crucial P3 Plus 500GB' },
      { label: 'PSU', value: 'Cooler Master 550W' },
    ],
    originalPrice: '16.900.000đ',
    price: '15.900.000đ',
  },
  {
    id: 'rvt-build-blaze',
    discount: '-10%',
    image: pcBlazeImg,
    title: 'RUVENTU BLAZE - Streaming Beast',
    category: 'PC Build Sẵn',
    specs: [
      { label: 'VGA', value: 'RTX 4080 16GB' },
      { label: 'CPU', value: 'Ryzen 9 7900X' },
      { label: 'RAM', value: '32GB DDR5-6000' },
      { label: 'SSD', value: 'Samsung 980 Pro 2TB' },
      { label: 'PSU', value: 'Corsair 1000W Plat' },
    ],
    originalPrice: '52.900.000đ',
    price: '48.900.000đ',
  },
  {
    id: 'rvt-build-spectre',
    discount: '-5%',
    isHot: true,
    image: pcSpectreImg,
    title: 'RUVENTU SPECTRE - Silent Powerhouse',
    category: 'PC Build Sẵn',
    specs: [
      { label: 'VGA', value: 'RX 7900 XT 20GB' },
      { label: 'CPU', value: 'Ryzen 7 7800X3D' },
      { label: 'RAM', value: '32GB DDR5-6000' },
      { label: 'SSD', value: 'Crucial T700 1TB' },
      { label: 'PSU', value: 'be quiet! 850W Gold' },
    ],
    price: '51.500.000đ',
  },
  {
    id: 'rvt-build-storm',
    discount: '-15%',
    image: pcStormImg,
    title: 'RUVENTU STORM - Entry Performance',
    category: 'PC Build Sẵn',
    specs: [
      { label: 'VGA', value: 'RX 7600 8GB' },
      { label: 'CPU', value: 'Core i3-13100F' },
      { label: 'RAM', value: '16GB DDR4-3200' },
      { label: 'SSD', value: 'WD SN570 500GB' },
      { label: 'PSU', value: 'Thermaltake 500W' },
    ],
    originalPrice: '14.490.000đ',
    price: '12.490.000đ',
  }
];

export const mockLinhKien = [
  {
    id: 'ASUS-RX-7800XT',
    discount: '-11%',
    outOfStock: true,
    soldCount: 89,
    image: vga7900Img, // re-using an existing image for demonstration
    title: 'ASUS ROG STRIX RX 7800 XT OC 16GB',
    category: 'VGA',
    specs: [
      { label: 'VRAM', value: '16GB GDDR6' },
      { label: 'TDP', value: '263W' },
      { label: 'Bus', value: '256-bit' },
      { label: 'Output', value: '2x DP 2.1 + 1x HDMI 2.1' },
    ],
    originalPrice: '12.900.000đ',
    price: '11.490.000đ',
  },
  {
    id: 'ASUS-ROG-4090',
    discount: '-12%',
    isHot: true,
    image: vga4090Img,
    title: 'ASUS ROG STRIX RTX 4090 OC 24GB',
    category: 'VGA',
    specs: [
      { label: 'VRAM', value: '24GB GDDR6X' },
      { label: 'TDP', value: '450W' },
      { label: 'Bus', value: '384-bit' },
      { label: 'Output', value: '2x DP 1.4 + HDMI 2.1' },
    ],
    originalPrice: '56.990.000đ',
    price: '52.990.000đ',
  },
  {
    id: 'MSI-RTX-4080',
    discount: '-8%',
    image: vga4080Img,
    title: 'MSI GeForce RTX 4080 Super Gaming X Trio',
    category: 'VGA',
    specs: [
      { label: 'VRAM', value: '16GB GDDR6X' },
      { label: 'TDP', value: '320W' },
      { label: 'Bus', value: '256-bit' },
      { label: 'Output', value: '2x DP 1.4 + HDMI 2.1' },
    ],
    originalPrice: '28.990.000đ',
    price: '26.990.000đ',
  },
  {
    id: 'GIGA-RX-7900XTX',
    discount: '-10%',
    image: vga7900Img,
    title: 'Gigabyte RX 7900 XTX Gaming OC 24GB',
    category: 'VGA',
    specs: [
      { label: 'VRAM', value: '24GB GDDR6' },
      { label: 'TDP', value: '355W' },
      { label: 'Bus', value: '384-bit' },
      { label: 'Output', value: '2x DP 2.1 + HDMI 2.1' },
    ],
    originalPrice: '27.990.000đ',
    price: '25.490.000đ',
  },
  {
    id: 'ASUS-ROG-4070TI',
    discount: '-15%',
    image: vga4070tiImg,
    title: 'ASUS ROG STRIX RTX 4070 Ti OC 12GB',
    category: 'VGA',
    specs: [
      { label: 'VRAM', value: '12GB GDDR6X' },
      { label: 'TDP', value: '285W' },
      { label: 'Bus', value: '192-bit' },
      { label: 'Output', value: '2x DP 1.4 + HDMI 2.1' },
    ],
    originalPrice: '24.990.000đ',
    price: '21.490.000đ',
  },
  {
    id: 'INTEL-I9-14900K',
    discount: '-8%',
    isHot: true,
    image: cpuI9Img,
    title: 'Intel Core i9-14900K',
    category: 'CPU',
    specs: [
      { label: 'Cores', value: '24 (8P+16E)' },
      { label: 'Threads', value: '32' },
      { label: 'Boost', value: '6.0 GHz' },
      { label: 'TDP', value: '125W' },
    ],
    originalPrice: '16.500.000đ',
    price: '15.290.000đ',
  },
  {
    id: 'ASUS-ROG-Z790-E',
    image: mainboardZ790Img,
    title: 'ASUS ROG STRIX Z790-E Gaming WIFI',
    category: 'Mainboard',
    specs: [
      { label: 'Socket', value: 'LGA 1700' },
      { label: 'Chipset', value: 'Intel Z790' },
      { label: 'RAM', value: 'DDR5 7800+ MT/s' },
      { label: 'Form Factor', value: 'ATX' },
    ],
    originalPrice: '13.900.000đ',
    price: '12.500.000đ',
  },
  {
    id: 'CORSAIR-DOMINATOR-64GB',
    discount: '-10%',
    image: ramCorsairImg,
    title: 'Corsair Dominator DDR5 64GB 6400MHz',
    category: 'RAM',
    specs: [
      { label: 'Capacity', value: '64GB (2x32GB)' },
      { label: 'Speed', value: '6400 MT/s' },
      { label: 'CAS', value: 'CL32' },
      { label: 'Voltage', value: '1.40V' },
    ],
    originalPrice: '7.500.000đ',
    price: '6.900.000đ',
  },
  {
    id: 'SAMSUNG-990-PRO-2TB',
    isHot: true,
    image: ssd990proImg,
    title: 'Samsung 990 Pro NVMe 2TB PCIe 5.0',
    category: 'SSD',
    specs: [
      { label: 'Capacity', value: '2TB' },
      { label: 'Interface', value: 'PCIe 4.0 x4' },
      { label: 'Read', value: '7450 MB/s' },
      { label: 'Write', value: '6900 MB/s' },
    ],
    originalPrice: '5.200.000đ',
    price: '4.800.000đ',
  }
];

export const mockGamingGear = [
  {
    id: 'KB-KEYCHRON-Q1',
    discount: '-15%',
    isHot: true,
    image: kbKeychronImg,
    title: 'Keychron Q1 Pro Carbon Black (Bàn phím cơ)',
    category: 'Bàn phím',
    specs: [
      { label: 'Switch', value: 'Gateron Pro Red' },
      { label: 'Layout', value: '75% TKL' },
      { label: 'Kết nối', value: 'Cáp / VIA' },
      { label: 'Keycap', value: 'PBT Double-shot' },
    ],
    originalPrice: '4.500.000đ',
    price: '3.890.000đ',
  },
  {
    id: 'KB-RAZER-BW',
    discount: '-10%',
    image: kbKeychronImg,
    title: 'Razer BlackWidow V4 Pro - Yellow Switch',
    category: 'Bàn phím',
    specs: [
      { label: 'Switch', value: 'Razer Yellow Linear' },
      { label: 'Layout', value: 'Full size' },
      { label: 'Backlit', value: 'Chroma RGB' },
      { label: 'Kết nối', value: 'USB-C / Wireless' },
    ],
    originalPrice: '5.200.000đ',
    price: '4.490.000đ',
  },
  {
    id: 'KB-CORSAIR-K100',
    discount: '-20%',
    image: kbKeychronImg,
    title: 'Corsair K100 RGB Optical-Mech Gaming',
    category: 'Bàn phím',
    specs: [
      { label: 'Switch', value: 'OPX Optical' },
      { label: 'Layout', value: 'Full size' },
      { label: 'Backlit', value: 'Per-key RGB' },
      { label: 'Kết nối', value: 'USB-C' },
    ],
    originalPrice: '6.900.000đ',
    price: '5.990.000đ',
  },
  {
    id: 'KB-STEELSERIES-APEX',
    image: kbKeychronImg,
    title: 'SteelSeries Apex Pro TKL Wireless',
    category: 'Bàn phím',
    specs: [
      { label: 'Switch', value: 'OmniPoint 2.0' },
      { label: 'Layout', value: 'TKL 80%' },
      { label: 'Kết nối', value: '2.4GHz / BT' },
      { label: 'Trọng lượng', value: '980g' },
    ],
    price: '5.290.000đ',
  }
];
