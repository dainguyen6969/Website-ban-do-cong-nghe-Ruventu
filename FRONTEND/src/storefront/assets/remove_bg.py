from PIL import Image
import sys

def remove_background(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        # Get the top-left pixel as the background color
        bg_color = datas[0]
        
        # We will make any pixel that is similar to bg_color transparent
        for item in datas:
            # Check if color is close to background color
            if abs(item[0] - bg_color[0]) < 30 and abs(item[1] - bg_color[1]) < 30 and abs(item[2] - bg_color[2]) < 30:
                newData.append((255, 255, 255, 0)) # transparent
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    remove_background(sys.argv[1], sys.argv[2])
