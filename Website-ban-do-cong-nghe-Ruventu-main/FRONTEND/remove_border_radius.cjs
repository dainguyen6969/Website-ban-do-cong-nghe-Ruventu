const fs = require('fs');
const path = require('path');

const directoryPath = 'd:/Website-ban-do-cong-nghe-Ruventu-main/Website-ban-do-cong-nghe-Ruventu-main/FRONTEND/src/pages';

function processDirectory(dirPath) {
  fs.readdir(dirPath, (err, files) => {
    if (err) {
      console.error("Could not list the directory.", err);
      process.exit(1);
    }

    files.forEach((file, index) => {
      const filePath = path.join(dirPath, file);
      
      fs.stat(filePath, (error, stat) => {
        if (error) {
          console.error("Error stating file.", error);
          return;
        }

        if (stat.isFile() && file.endsWith('.css')) {
          fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
              console.error(`Error reading file ${file}`, err);
              return;
            }

            const updatedData = data.replace(/border-radius:\s*[^;]+;/g, 'border-radius: 0;');
            
            if (data !== updatedData) {
              fs.writeFile(filePath, updatedData, 'utf8', (err) => {
                if (err) {
                  console.error(`Error writing file ${file}`, err);
                } else {
                  console.log(`Updated border-radius in ${file}`);
                }
              });
            }
          });
        }
      });
    });
  });
}

processDirectory(directoryPath);
