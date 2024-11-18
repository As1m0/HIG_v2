const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const isDew = process.env.NODE_ENV === "production";
//const isDew = process.env.NODE_ENV !== "development";
const isMac = process.platform === "darwin";
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const os = require('os');
const fsPromises = fs.promises;
let mainWindow;
let filesNumber;
let progressStatus = 0;

//Create the main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'Hero image generator',
    width: isDew ? 1500 : 1000,
    height: 700,
    minHeight: 700,
    maxHeight: 700,
    minWidth: 1000,
    maxWidth: 1000,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  //Open Devtools if in dev env
  if (isDew) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
};

//App is ready
app.whenReady().then(() => {
  createMainWindow();

  //impelment menu
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);


  // Remove mainWindow from memory close
  mainWindow.on('closed', () => (mainWindow = null));

  app.on('active', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  })

});

//Menu template
const menu = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Quit',
        click: () => app.quit(),
        accellerator: 'Cmd+w',
      }
    ]
  }
]


app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});




///////////////////////////////////////

//GENERATING IMAGES
ipcMain.on('startGenerating', (e, options) => {
  console.log(options);
  generateImages(options);
})



async function generateImages({ masterImagePath, directoryPath, outPutParameters, safeZoneData, EAN, SwitchInput }) {

  //delete temp files if lefted any
  let pngFilesAfterTrim = await fsPromises.readdir(directoryPath);

  await Promise.all(pngFilesAfterTrim.map(async (file) => {
    const filePath = path.join(directoryPath, file);
    if (path.extname(file).toLowerCase() === '.png' && file.includes('_temp')) {
      await fsPromises.unlink(filePath);
    }
  }));

  // resize and conver to pgn
  await resizeAndConvertToPng(directoryPath, outPutParameters);

  pngFilesAfterTrim = await fsPromises.readdir(directoryPath);


  // Trim all PNG files in the input directory
  const pngFiles = await fsPromises.readdir(directoryPath);
  const pngFilesToTrim = pngFiles.filter(file => path.extname(file).toLowerCase() === '.png' && file.includes('_temp'));


  await Promise.all(pngFilesToTrim.map(async (file) => {
    const inputImagePath = path.join(directoryPath, file);
    if (SwitchInput) {
      await cropWhiteSpace(inputImagePath);
    }
  }));




  // Continue with image merging
  const image1 = sharp(masterImagePath);
  await image1.resize(outPutParameters[0], outPutParameters[1]).toBuffer();



  await Promise.all(pngFilesAfterTrim.map(async (file) => {
    if (path.extname(file).toLowerCase() === '.png' && file.includes('_temp')) {
      const inputImagePath = path.join(directoryPath, file);
      const image2 = sharp(inputImagePath);

      const canvasWidth = outPutParameters[0];
      const canvasHeight = outPutParameters[1];
      const canvas = sharp({ create: { width: canvasWidth, height: canvasHeight, channels: 4, background: 'white' } });
      const { width, height } = await image2.metadata();
      const imageRatio = width / height;
      const centerX = safeZoneData[0] * canvasWidth;
      const centerY = safeZoneData[1] * canvasHeight;
      const currentWidth = safeZoneData[2] * outPutParameters[0];
      const currentHeight = safeZoneData[3] * outPutParameters[1];
      let newWidth;
      let newHeight;

      // Calculate resized dimensions based on available area
      if (width > height) {
        if (currentWidth / imageRatio < currentHeight) {
          newWidth = currentWidth;
          newHeight = currentWidth / imageRatio;
        } else {
          newHeight = currentHeight;
          newWidth = currentHeight * imageRatio;
        }
      } else if (width < height) {
        if (currentHeight * imageRatio < currentHeight) {
          newHeight = currentHeight;
          newWidth = currentHeight * imageRatio;
        } else {
          newWidth = currentWidth;
          newHeight = currentWidth / imageRatio;
        }
      }

      //ha a kivágott kép oldalaránya közel 1
      if (Math.abs(width - height) < 100) {
        if (currentHeight < currentWidth) {
          newHeight = currentHeight;
          newWidth = currentHeight * imageRatio;
        } else if (currentHeight > currentWidth) {
          newWidth = currentWidth;
          newHeight = currentWidth / imageRatio;
        }
      }



      //Make output folder
      const outputFolderPath = masterImagePath.slice(0, masterImagePath.lastIndexOf('/')) + '/hero images';
      try {
        if (!fs.existsSync(outputFolderPath)) {
          fs.mkdirSync(outputFolderPath);
        }
      } catch (err) {
        console.error(err);
      }

      // Merge images
      await canvas.composite([
        { input: await image2.resize(Math.floor(newWidth), Math.floor(newHeight)).toBuffer(), left: Math.floor(centerX - newWidth / 2), top: Math.floor(centerY - newHeight / 2) },
        { input: await image1.toBuffer(), left: 0, top: 0 }
      ]);

      //Declare output files name
      let originalFileName = path.parse(file).name;
      let outputPath = "";
      let outputFileName = "";
      if (EAN) {
        const zeroNumber = countZeros(originalFileName);
        outputFileName = file.substring(0, 16).slice(zeroNumber).split('_')[0].split('.')[0].split('-')[0] + '.' + outPutParameters[2];
        outputPath = path.join(outputFolderPath, outputFileName);
      } else {
        outputPath = path.join(outputFolderPath, originalFileName.slice(0, originalFileName.lastIndexOf('_temp')) + '.' + outPutParameters[2]);
      }


      // output images to files
      await canvas.toFile(outputPath, { format: outPutParameters[2] }, { quality: outPutParameters[3] * 10 });
      console.log(`Merged image saved as ${outputFileName}`);


      //progressbar status send
      progressStatus = filesNumber;
      mainWindow.webContents.send('progressbar', progressStatus / filesNumber * 100);
      progressStatus = 0;
      //stop button set back
      mainWindow.webContents.send('button');

      //open image folder
      shell.openPath(outputFolderPath);
    }
  }));

  // Cleanup: Delete all PNG files after merging

  await Promise.all(pngFilesAfterTrim.map(async (file) => {
    const filePath = path.join(directoryPath, file);
    if (path.extname(file).toLowerCase() === '.png' && file.includes('_temp')) {
      await fsPromises.unlink(filePath);
    }
  }));

}

function countZeros(file) {
  return file.match(/^0*/)[0].length;
}

async function resizeAndConvertToPng(directoryPath, outputParameters) {
  const files = await fsPromises.readdir(directoryPath);
  filesNumber = files.length;
  const imageFiles = files.filter(file =>
    ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif'].includes(path.extname(file).toLowerCase())
  );

  await Promise.all(imageFiles.map(async (file) => {
    const inputImagePath = path.join(directoryPath, file);
    const outputPngPath = path.join(directoryPath, path.parse(file).name + '_temp.png');

    await sharp(inputImagePath)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png({ compressionLevel: 5, force: true, quality: 100 })
      .toFile(outputPngPath);

    console.log(`Resized and converted ${path.parse(file).name} to ${path.parse(file).name}.png`);
    progressStatus++;
    mainWindow.webContents.send('progressbar', progressStatus / filesNumber * 100);
  }));
}


async function cropWhiteSpace(inputPath) {
  try {
    const image = sharp(inputPath);

    // Extract metadata to get the dimensions
    const { width, height } = await image.metadata();

    // Convert image to raw pixel data
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    // Create arrays to store the min and max values of non-white pixels
    let top = height, bottom = 0, left = width, right = 0;

    // Helper function to check if a pixel is white
    const isWhite = (r, g, b) => r > 250 && g > 250 && b > 250;

    // Loop through the pixels to find the bounds of the non-white areas
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * info.channels;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        if (!isWhite(r, g, b)) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }

    // Calculate the crop area
    const cropWidth = right - left + 1;
    const cropHeight = bottom - top + 1;


    const tempFilePath = path.join(os.tmpdir(), `trimmed_${path.basename(inputPath)}`);

    // Perform the crop and save the image to a new file
    const outputPath = 'images/cropped_image.png';
    await image.extract({ left, top, width: cropWidth, height: cropHeight })
      .toFormat('png')  // Explicitly set the output format to PNG
      .toFile(tempFilePath);

    fs.copyFileSync(tempFilePath, inputPath);

    // Delete the temporary file
    fs.unlinkSync(tempFilePath);

    console.log('Image cropped successfully. Saved as:', outputPath);
  } catch (error) {
    console.error('Error cropping the image:', error);
  }
}






///////////////////////////////////////////////

//CONVERT IMAGES

ipcMain.on('startConverting', (e, options) => {
  console.log(options);
  resizeImages(options);
})

async function resizeImages({ directoryPath, width, height, format, Quality, outputName }) {


  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    files.forEach(file => {
      const inputFilePath = path.join(directoryPath, file);
      let targetFolder = directoryPath + '/resized';
      try {
        if (!fs.existsSync(targetFolder)) {
          fs.mkdirSync(targetFolder);
        }
      } catch (err) {
        console.error(err);
      }

      let outputFileName = "";

      if (outputName) {
        const zeroNumber = countZeros(file);
        outputFileName = file.substring(0, 16).slice(zeroNumber).split('_')[0].split('.')[0].split('-')[0] + '.' + format;
        outputFileName = path.join(targetFolder, outputFileName);
      } else {
        outputFileName = path.join(targetFolder, file.substring(0, file.lastIndexOf('.')+1) + format);
      }

      sharp(inputFilePath)
        .toFormat('png')
        .toBuffer()
        .then(data => {
          sharp(data)
            .resize(width, height)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .toFormat(format, { quality: Quality * 10 })
            .toFile(outputFileName, (err, info) => {
              if (err) {
                console.error('Error resizing image:', err);
              } else {
                console.log('Image resized successfully:', info);
              }
            });
        })
        .catch(err => { console.error('Error processing image:', err); });
    });
    shell.openPath(directoryPath + '/resized');
    mainWindow.webContents.send('button');
  });
}






//Make .app extension from the project:
//1. npx electron-packager . --platform=darwin --arch=x64 --out=dist --overwrite
//2. npx electron-packager . HeroGenerator --platform=darwin --arch=x64 --out=dist --overwrite --asar
