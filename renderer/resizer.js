//Fájlok helye
let directoryPath = "";

let inputFolderOK = false;
let masterImageOK = false;


//define DOM elements
let button = document.getElementById('start-btn');
const imageInput = document.getElementById('imageInput');
const folderInput = document.getElementById('folderInput');
const inputStatus = document.getElementById('input-status');
const stepNumbers = document.getElementsByClassName("step-number");
//form
const outputWidth = document.getElementById("output-width");
const outputHeight = document.getElementById("output-height");
const fileFormat = document.getElementById("file-format");
const customQuality = document.getElementById("quality");
const customQualityLabel = document.getElementById("quality-value");
const filesImage = document.getElementById("filesImage");
const imageCounter = document.getElementById("image-counter");



customQuality.addEventListener('input', function () {
    customQualityLabel.innerText = customQuality.value;
})

outputWidth.addEventListener('change', () => {
    outputHeight.value = outputWidth.value;
})
outputHeight.addEventListener('change', () => {
    outputWidth.value = outputHeight.value;
})

document.addEventListener('DOMContentLoaded', function () {

    // get input directories and files
    folderInput.addEventListener('change', function (event) {

        const files = event.target.files;

        //select only image files
        let onlyImages = [];
        for (let i = 0; i < files.length; i++) {
            if (files[i].type === 'image/jpeg' || files[i].type === 'image/png' || files[i].type === 'image/tiff') {
                onlyImages.push(files[i]);
            }
        }

        if (onlyImages.length > 0) {
            // Extract the common folder path
            inputStatus.innerHTML = "&check; found images";
            inputStatus.style.color = "green";
            inputStatus.style.fontWeight = "bold";
            stepNumbers[0].innerHTML = "&check;";
            filesImage.style.display = "block"
            imageCounter.innerHTML = onlyImages.length;
            stepNumbers[0].style.backgroundColor = "#4dc13d";
            inputFolderOK = true;

            //save the path in variable
            const firstFilePath = onlyImages[0].path;

            directoryPath = firstFilePath.slice(0, files[0].path.lastIndexOf('/'));

            button.classList.remove('disabled');

        } else if (onlyImages.length === 0) {
            inputFolderOK = false;
            inputStatus.textContent = "No image files found";
            inputStatus.style.color = "red";
            inputStatus.style.fontWeight = "bold";
            filesImage.style.display = "none"
            stepNumbers[0].innerHTML = "1";
            stepNumbers[0].style.backgroundColor = "rgb(160, 78, 236)";

            button.classList.add('disabled');
        }


    });


});





//pass parameters and function to main.js
button.addEventListener('click', function () {

    let width = Number(outputWidth.value);
    let height = Number(outputHeight.value);
    let format = fileFormat.value;
    let Quality = Number(customQuality.value);
    let outputName = document.getElementById("original").checked;


    ipcRenderer.send('startConverting', {
        directoryPath,
        width,
        height,
        format,
        Quality,
        outputName
        });

    // disable button
    button.classList.add('disabled');
})




let fill = document.getElementById('fill');
let progressBar = document.getElementById('progress-bar');

// Catch the progress bar data
ipcRenderer.on('progressbar', (value) => {
    fill.style.width = Math.round(value) + '%';
})

// enable button
ipcRenderer.on('button', () => {
    button.classList.remove('disabled');
    fill.style.width = '0%';
})