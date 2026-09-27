import os
import re

entity_dir = r"d:\Website-ban-do-cong-nghe-Ruventu\BACKEND\src\main\java\com\example\dantruventu\Entity"

for root, dirs, files in os.walk(entity_dir):
    for file in files:
        if file.endswith(".java"):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if it uses TrangThaiCoBanEnum
            if "private TrangThaiCoBanEnum" in content:
                # Check if it already has @Enumerated(EnumType.STRING) before it
                # Using a simple check: is @Enumerated in the file?
                # Actually, some files have @Enumerated for OTHER enums, but not for TrangThaiCoBanEnum.
                # So we specifically look for the line with TrangThaiCoBanEnum.
                
                # We want to replace the block right before `private TrangThaiCoBanEnum`
                # Let's match the @Column and private TrangThaiCoBanEnum
                pattern = r"(@Column[^\n]+)\n(\s*)private TrangThaiCoBanEnum ([a-zA-Z0-9_]+)(\s*=\s*TrangThaiCoBanEnum\.[A-Z_]+)?;"
                
                def replacement(m):
                    column_annotation = m.group(1)
                    indent = m.group(2)
                    var_name = m.group(3)
                    default_val = m.group(4) or ""
                    
                    # Ensure column length is set if it's missing (length=30)
                    if "length" not in column_annotation:
                        if column_annotation.endswith(")"):
                            column_annotation = column_annotation[:-1] + ", length = 30)"
                        
                    return f"@Enumerated(EnumType.STRING)\n{indent}@JdbcTypeCode(SqlTypes.VARCHAR)\n{indent}{column_annotation}\n{indent}private TrangThaiCoBanEnum {var_name}{default_val};"
                
                new_content, num_subs = re.subn(pattern, replacement, content)
                
                if num_subs > 0:
                    # Add imports if missing
                    if "import org.hibernate.annotations.JdbcTypeCode;" not in new_content:
                        new_content = new_content.replace("import jakarta.persistence.*;", "import jakarta.persistence.*;\nimport org.hibernate.annotations.JdbcTypeCode;\nimport org.hibernate.type.SqlTypes;")
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Patched {file}")
