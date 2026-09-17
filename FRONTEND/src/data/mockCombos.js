import workstationImage from '../assets/hero.png';
import { readSharedState, writeSharedState } from '../sync/adminSync';

const STORAGE_KEY = 'ruventu_combos_v1';
const seedCombos = [
  { id: 'combo-1', code: 'PC-001', name: 'PC Gaming ABC', image: workstationImage, sellable: 5, stock: 5, price: 25000000, status: 'Đang kinh doanh', components: [
    { name: 'Intel Core i7-14700K Box', variant: 'Default', sku: 'CPU-I7-14700K', qty: 1 },
    { name: 'MSI RTX 4070 SUPER Ventus', variant: 'Default', sku: 'VGA-4070S', qty: 1 },
    { name: 'Corsair Vengeance DDR5 32GB', variant: '6000MHz', sku: 'RAM-D5-32', qty: 2 },
    { name: 'Samsung 990 PRO 1TB', variant: '1TB', sku: 'SSD-990P-1T', qty: 1 },
  ] },
  { id: 'combo-2', code: 'CB-WC-360', name: 'Combo Tản Nhiệt Custom 360', image: workstationImage, sellable: 5, stock: 5, price: 8900000, status: 'Đang kinh doanh', components: [
    { name: 'Block CPU AM5 Copper', variant: 'Nickel Plated', sku: 'BLOCK-AM5-NP', qty: 1 },
    { name: 'Pump D5 PRO', variant: 'Standard', sku: 'PUMP-D5-PRO', qty: 1 },
    { name: 'Radiator 360mm', variant: 'Black', sku: 'RAD-360-BLK', qty: 1 },
    { name: 'Ống dẫn PETG', variant: 'Clear', sku: 'PETG-CLEAR', qty: 4 },
  ] },
  { id: 'combo-3', code: 'CB-STREAM-01', name: 'Combo Streamer Starter', image: workstationImage, sellable: 12, stock: 12, price: 6200000, status: 'Đang kinh doanh', components: [
    { name: 'Micro Blue Yeti', variant: 'USB Black', sku: 'YETI-USB-BLK', qty: 1 },
    { name: 'Webcam Logitech C920', variant: 'Full HD', sku: 'C920-FHD', qty: 1 },
    { name: 'Đèn livestream', variant: 'Ring 12 inch', sku: 'RING-12', qty: 1 },
  ] },
  { id: 'combo-4', code: 'CB-NAS-HOME', name: 'Combo NAS Gia Đình 2-Bay', image: workstationImage, sellable: 0, stock: 0, price: 14500000, status: 'Ngưng kinh doanh', components: [
    { name: 'Synology DS223', variant: '2-Bay', sku: 'DS223-2BAY', qty: 1 },
    { name: 'HDD WD Red 4TB', variant: 'SATA 5400RPM', sku: 'WD-RED-4TB-SATA', qty: 2 },
  ] },
  { id: 'combo-5', code: 'CB-OFFICE-01', name: 'Combo Văn Phòng Cơ Bản', image: workstationImage, sellable: 35, stock: 35, price: 890000, status: 'Đang kinh doanh', components: [
    { name: 'Chuột Logitech M185', variant: 'Wireless Black', sku: 'M185-WL-BLK', qty: 1 },
    { name: 'Bàn phím Logitech K120', variant: 'USB Black', sku: 'K120-USB-BLK', qty: 1 },
    { name: 'Lót chuột Ruventu', variant: 'Standard', sku: 'PAD-STD', qty: 1 },
  ] },
  { id: 'combo-6', code: 'CB-CREATOR-01', name: 'Combo Creator Pro', image: workstationImage, sellable: 3, stock: 3, price: 32800000, status: 'Đang kinh doanh', components: [
    { name: 'Intel Core i9-14900K Box', variant: 'Default', sku: 'SP-CPU-14900K', qty: 1 },
    { name: 'VGA MSI RTX 4080 Super', variant: 'Gaming X Trio', sku: 'SP-VGA-4080S', qty: 1 },
  ] },
];

let combos = readSharedState(STORAGE_KEY, seedCombos);

function cloneCombo(combo) {
  return {
    ...combo,
    images: combo.images ? [...combo.images] : undefined,
    tags: combo.tags ? [...combo.tags] : undefined,
    specs: combo.specs ? combo.specs.map((item) => ({ ...item })) : undefined,
    variant: combo.variant ? { ...combo.variant } : undefined,
    components: (combo.components || []).map((item) => ({ ...item })),
  };
}

function refreshCombos() { combos = readSharedState(STORAGE_KEY, seedCombos); }
function saveCombos(action, entityId) { writeSharedState(STORAGE_KEY, combos, { slice: 'combos', action, entityId }); }

export function getMockCombos() { refreshCombos(); return combos.map(cloneCombo); }
export function getMockComboById(id) { refreshCombos(); const combo = combos.find((item) => item.id === id || item.code === id); return combo ? cloneCombo(combo) : null; }
export function addMockCombo(combo) { refreshCombos(); combos = [cloneCombo(combo), ...combos]; saveCombos('created', combo.id); return getMockCombos(); }
export function updateMockCombo(id, nextCombo) {
  refreshCombos();
  const index = combos.findIndex((combo) => combo.id === id || combo.code === id);
  if (index < 0) return null;
  combos = combos.map((combo, comboIndex) => comboIndex === index ? cloneCombo({ ...combo, ...nextCombo, id: combo.id }) : combo);
  saveCombos('updated', id);
  return cloneCombo(combos[index]);
}
export function setMockComboStatus(id, status) { refreshCombos(); combos = combos.map((combo) => combo.id === id ? { ...combo, status } : combo); saveCombos('status-updated', id); return getMockCombos(); }
