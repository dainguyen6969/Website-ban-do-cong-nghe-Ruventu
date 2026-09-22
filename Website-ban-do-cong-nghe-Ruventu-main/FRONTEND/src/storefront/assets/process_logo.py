from PIL import Image
import sys

def process_logo(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        bg_color = datas[0] # Assume top-left is background (usually white)

        newData = []
        for item in datas:
            r, g, b, a = item
            
            # Check if it's the background color (or very close)
            if abs(r - bg_color[0]) < 15 and abs(g - bg_color[1]) < 15 and abs(b - bg_color[2]) < 15:
                newData.append((255, 255, 255, 0))
                continue
                
            # If it's a reddish color (R is significantly higher than G and B)
            if r > g + 30 and r > b + 30:
                # Keep the red pixel as is, with full opacity
                # To remove white fringes from red pixels against white background:
                # Assuming original was red (R, 0, 0) blended with white (255, 255, 255)
                # The darker the green/blue channels, the more opaque it should be.
                # But to keep it simple, just keep the pixel fully opaque.
                newData.append((r, g, b, 255))
            else:
                # It's not background, and not red. So it's the black text (or its grey anti-aliased edges).
                # We convert it to WHITE text, with transparency based on how dark it is.
                # The darker it is, the more opaque white it should be.
                gray = (r + g + b) / 3.0
                alpha = int(255 - gray)
                # Prevent negative alpha
                alpha = max(0, min(255, alpha))
                
                newData.append((255, 255, 255, alpha))

        img.putdata(newData)
        img.save(output_path, "PNG")
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    process_logo(sys.argv[1], sys.argv[2])
