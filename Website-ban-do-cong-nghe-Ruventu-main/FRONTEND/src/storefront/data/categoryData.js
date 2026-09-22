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

export const mockPcBuildProducts = [
  {
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
