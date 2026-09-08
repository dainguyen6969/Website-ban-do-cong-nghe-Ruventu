import React from 'react';
import './PCComponentList.css';
import productImg from '../assets/imgg.png'; // Mock image
import vga4090Img from '../assets/vga_4090.png';

const mockComponents = [
  { id: 1, type: 'CPU', name: 'Intel Core i9-14900K', code: 'CPU-I914K-INT-BOX', img: productImg },
  { id: 2, type: 'VGA', name: 'ASUS ROG STRIX RTX 4090 OC 24GB', code: 'VGA-4090-ROG-O1', img: vga4090Img },
  { id: 3, type: 'Mainboard', name: 'ASUS ROG STRIX Z790-E Gaming WIFI', code: 'MB-Z790E-ROG-O1', img: productImg },
  { id: 4, type: 'RAM', name: 'Corsair Dominator DDR5 64GB 6400MHz', code: 'RAM-64D5-COR-PLT', img: productImg },
  { id: 5, type: 'SSD', name: 'Samsung 990 Pro NVMe 2TB PCIe 5.0', code: 'SSD-990P2-SAM-11', img: productImg },
  { id: 6, type: 'PSU', name: 'EVGA SuperNOVA 1000W G6 80+ Gold', code: 'PSU-EVG-1000G6', img: productImg },
  { id: 7, type: 'Case', name: 'Lian Li PC-O11D Dynamic EVO XL', code: 'CASE-O11XL-LL-13', img: productImg },
  { id: 8, type: 'Tản nhiệt', name: 'Corsair H150i Elite LCD 360mm AIO', code: 'TAN-H150I-COR-15', img: productImg },
];

const PCComponentList = () => {
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
            <li key={comp.id} className="component-item">
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
