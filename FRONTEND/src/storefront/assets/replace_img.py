import re

file_path = 'd:/Ruventu_FE/src/pages/Home.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'import productImg' not in content:
    content = content.replace("import Footer from '../components/Footer';", "import Footer from '../components/Footer';\nimport productImg from '../assets/imgg.png';")

content = re.sub(r"image:\s*'https://images\.unsplash\.com/[^']+'", "image: productImg", content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced all images in Home.jsx")
