import React from 'react';
import './PCComponentList.css';
import vga4090Img from '../assets/vga_4090.png';
import cpuI9Img from '../assets/cpu_i9.png';
import mainboardZ790Img from '../assets/mainboard_z790.png';
import ramCorsairImg from '../assets/ram_corsair.png';
import ssd990proImg from '../assets/ssd_990pro.png';
import psuEvgaImg from '../assets/psu_evga.png';
import caseO11dImg from '../assets/case_o11d.png';
import coolerH150iImg from '../assets/cooler_h150i.png';

export const mockComponents = [
  { id: 1, type: 'CPU', name: 'Intel Core i9-14900K', code: 'CPU-I914K-INT-BOX', img: cpuI9Img, price: '15.290.000đ', originalPrice: '16.500.000đ' },
  { id: 2, type: 'VGA', name: 'ASUS ROG STRIX RTX 4090 OC 24GB', code: 'VGA-4090-ROG-O1', img: vga4090Img, price: '54.900.000đ', originalPrice: '62.000.000đ' },
  { id: 3, type: 'Mainboard', name: 'ASUS ROG STRIX Z790-E Gaming WIFI', code: 'MB-Z790E-ROG-O1', img: mainboardZ790Img, price: '12.500.000đ', originalPrice: '13.900.000đ' },
  { id: 4, type: 'RAM', name: 'Corsair Dominator DDR5 64GB 6400MHz', code: 'RAM-64D5-COR-PLT', img: ramCorsairImg, price: '6.900.000đ', originalPrice: '7.500.000đ' },
  { id: 5, type: 'SSD', name: 'Samsung 990 Pro NVMe 2TB PCIe 5.0', code: 'SSD-990P2-SAM-11', img: ssd990proImg, price: '4.800.000đ', originalPrice: '5.200.000đ' },
  { id: 6, type: 'PSU', name: 'EVGA SuperNOVA 1000W G6 80+ Gold', code: 'PSU-EVG-1000G6', img: psuEvgaImg, price: '4.500.000đ', originalPrice: '4.900.000đ' },
  { id: 7, type: 'Case', name: 'Lian Li PC-O11D Dynamic EVO XL', code: 'CASE-O11XL-LL-13', img: caseO11dImg, price: '4.200.000đ', originalPrice: '4.500.000đ' },
  { id: 8, type: 'Tản nhiệt', name: 'Corsair H150i Elite LCD 360mm AIO', code: 'TAN-H150I-COR-15', img: coolerH150iImg, price: '6.500.000đ', originalPrice: '7.100.000đ' },
];

const PCComponentList = ({ selectedComponent, onSelectComponent }) => {
  return (
    <div className="pc-component-list-wrapper">
      <div className="pc-component-list-header">
        THÀNH PHẦN PC BUILD
      </div>
      <div className="pc-component-list-content">
        <div className="component-list-title">
          <div className="vertical-line"></div>
          LINH KIỆN ({mockComponents.length} THÀNH PHẦN)
        </div>
        
        <ul className="components-ul">
          {mockComponents.map((comp) => (
            <li 
              key={comp.id} 
              className={`component-item ${selectedComponent?.id === comp.id ? 'active' : ''}`}
              onClick={() => onSelectComponent && onSelectComponent(comp)}
              style={{ cursor: 'pointer' }}
            >
              <div className="comp-image">
                <img src={comp.img} alt={comp.type} />
              </div>
              <div className="comp-info">
                <span className="comp-type">{comp.type}</span>
                <span className="comp-name">{comp.name}</span>
                <span className="comp-code">{comp.code}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PCComponentList;
