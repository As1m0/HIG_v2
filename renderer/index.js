//Fájlok helye
let masterImagePath = "";
let directoryPath = "";

let inputFolderOK = false;
let masterImageOK = false;

//menu handler
let button = document.getElementById('start-btn');


//define DOM elements
const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const masterStatus = document.getElementById("master-status");
const folderInput = document.getElementById('folderInput');
const inputStatus = document.getElementById('input-status');
const drawBox = document.getElementById('draw-safe-zone');
const myCanvas = document.getElementById("my-canvas");
const stepNumbers = document.getElementsByClassName("step-number");
//form
const outputWidth = document.getElementById("output-width");
const outputHeight = document.getElementById("output-height");
const FileFormat = document.getElementById("file-format");
const customQuality = document.getElementById("quality");
const customQualityLabel = document.getElementById("quality-value");
const radioInput = document.getElementById("original");


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

        } else if (onlyImages.length === 0) {
            inputFolderOK = false;
            inputStatus.textContent = "No image files found";
            inputStatus.style.color = "red";
            inputStatus.style.fontWeight = "bold";
            filesImage.style.display = "none"
            stepNumbers[0].innerHTML = "1";
            stepNumbers[0].style.backgroundColor = "rgb(160, 78, 236)";
        }
        canStartGenerate();


    });

    //get master image
    imageInput.addEventListener('change', function (event) {

        const file = event.target.files[0];
        if (file.type === 'image/png' && file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                masterStatus.innerHTML = '&check; master image added';
                masterStatus.style.color = 'green';
                masterStatus.style.fontWeight = 'bold';
                myCanvas.style.backgroundImage = 'url(' + preview.src + ')';
                drawBox.style.display = 'block';
            }
            reader.readAsDataURL(file);
            masterImagePath = file.path;
            masterImageOK = true;

        } else {
            masterStatus.textContent = 'Please select a png file!';
            masterStatus.style.color = 'red';
            masterStatus.style.fontWeight = 'bold';
            preview.style.display = 'none';
            masterImageOK = false;
            stepNumbers[1].innerHTML = "2";
            stepNumbers[1].style.backgroundColor = "rgb(160, 78, 236)";
        }

        canStartGenerate();
    });
});


document.getElementById("close-window").addEventListener("click", () => {
    preview.style.display = 'none';
    drawBox.style.display = 'none';
    masterStatus.style.color = 'rgb(160, 78, 236)';
    masterStatus.textContent = 'add image';
    masterImageOK = false;
    canStartGenerate();
    myCanvas.style.backgroundImage = "";
})



//enable generate button
function canStartGenerate() {
    if (inputFolderOK && masterImageOK) {
        button.classList.remove('disabled');
        stepNumbers[2].innerHTML = "&check;";
        stepNumbers[2].style.backgroundColor = "#4dc13d";
    } else {
        button.classList.add('disabled');
        stepNumbers[2].innerHTML = "3";
        stepNumbers[2].style.backgroundColor = "rgb(160, 78, 236)";
    }
}


//pass parameters and function to main.js
button.addEventListener('click', function () {

    let width = outputWidth.value;
    let height = outputHeight.value;
    let format = FileFormat.value;
    let quality = customQuality.value;
    let outPutParameters = [Number(width), Number(height), format, Number(quality)];

    //file name
    let EAN;
    if (radioInput.checked) {
        EAN = true;
    } else {
        EAN = false;
    }

    let SwitchInput = document.getElementById("switchInput").checked;

    ipcRenderer.send('startGenerating', {
        masterImagePath,
        directoryPath,
        outPutParameters,
        safeZoneData,
        EAN,
        SwitchInput
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