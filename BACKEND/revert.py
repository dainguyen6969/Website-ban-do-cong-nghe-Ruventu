import os
import re

entity_dir = r"d:\Website-ban-do-cong-nghe-Ruventu\BACKEND\src\main\java\com\example\dantruventu\Entity"

for root, dirs, files in os.walk(entity_dir):
    for file in files:
        if file.endswith(".java"):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove the annotations we added
            content = re.sub(r"@Enumerated\(EnumType\.STRING\)\s*@JdbcTypeCode\(SqlTypes\.VARCHAR\)\s*", "", content)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Reverted {file}")
