import * as GaussianSplats3D from "gaussian-splats-3d";
import * as THREE from "three";

function fileBufferToSplatBuffer(
  fileBufferData,
  format,
  alphaRemovalThreshold,
  compressionLevel,
  sectionSize,
  sceneCenter,
  blockSize,
  bucketSize,
  outSphericalHarmonicsDegree = 0,
) {
  if (format === GaussianSplats3D.SceneFormat.Ply) {
    return GaussianSplats3D.PlyLoader.loadFromFileData(
      fileBufferData.data,
      alphaRemovalThreshold,
      compressionLevel,
      true,
      outSphericalHarmonicsDegree,
      sectionSize,
      sceneCenter,
      blockSize,
      bucketSize,
    );
  } else {
    if (format === GaussianSplats3D.SceneFormat.Splat) {
      return GaussianSplats3D.SplatLoader.loadFromFileData(
        fileBufferData.data,
        alphaRemovalThreshold,
        compressionLevel,
        true,
        sectionSize,
        sceneCenter,
        blockSize,
        bucketSize,
      );
    } else {
      return GaussianSplats3D.KSplatLoader.loadFromFileData(
        fileBufferData.data,
      );
    }
  }
}

window.onCompressionLevelChange = function (arg) {
  const compressionLevel = parseInt(
    document.getElementById("compressionLevel").value,
  );
  if (isNaN(compressionLevel) || compressionLevel < 0 || compressionLevel > 2) {
    return;
  }

  for (let i = 1; i <= 3; i++) {
    const element = document.getElementById("advancedCompressionRow" + i);
    if (compressionLevel === 0) {
      element.style.display = "none";
    } else {
      element.style.display = "";
    }
  }
};

window.onFileChange = function (arg, fileNameLabelID) {
  const fileNameLabel = document.getElementById(fileNameLabelID);
  const url = arg.value;
  let lastForwardSlash = url.lastIndexOf("/");
  let lastBackwardSlash = url.lastIndexOf("\\");
  const lastSlash = Math.max(lastForwardSlash, lastBackwardSlash);
  fileNameLabel.innerHTML = url.substring(lastSlash + 1);
};

let conversionInProgress = false;
window.convertPlyFile = function () {
  if (conversionInProgress) return;
  const conversionFile = document.getElementById("conversionFile");
  const compressionLevel = parseInt(
    document.getElementById("compressionLevel").value,
  );
  const alphaRemovalThreshold = parseInt(
    document.getElementById("alphaRemovalThreshold").value,
  );
  const sphericalHarmonicsDegree = parseInt(
    document.getElementById("conversionSphericalHarmonicsDegree").value,
  );
  const sectionSize = 0;
  let sceneCenterArray = document.getElementById("sceneCenter").value;
  const blockSize = parseFloat(document.getElementById("blockSize").value);
  const bucketSize = parseInt(document.getElementById("bucketSize").value);

  sceneCenterArray = sceneCenterArray.split(",");

  if (sceneCenterArray.length !== 3) {
    setViewError("Scene center must contain 3 elements.");
    return;
  }

  for (let i = 0; i < 3; i++) {
    sceneCenterArray[i] = parseFloat(sceneCenterArray[i]);

    if (isNaN(sceneCenterArray[i])) {
      setViewError("Invalid scene center.");
      return;
    }
  }

  const sceneCenter = new THREE.Vector3().fromArray(sceneCenterArray);

  if (isNaN(compressionLevel) || compressionLevel < 0 || compressionLevel > 2) {
    setConversionError("Invalid compression level.");
    return;
  } else if (
    isNaN(alphaRemovalThreshold) ||
    alphaRemovalThreshold < 0 ||
    alphaRemovalThreshold > 255
  ) {
    setConversionError("Invalid alpha remval threshold.");
    return;
  } else if (
    isNaN(sphericalHarmonicsDegree) ||
    sphericalHarmonicsDegree < 0 ||
    sphericalHarmonicsDegree > 2
  ) {
    setConversionError("Invalid SH degree.");
    return;
  } else if (isNaN(blockSize) || blockSize < 0.1) {
    setConversionError("Invalid block size.");
    return;
  } else if (isNaN(bucketSize) || bucketSize < 2 || bucketSize > 65536) {
    setConversionError("Invalid bucket size.");
    return;
  } else if (!conversionFile.files[0]) {
    setConversionError("Please choose a file to convert.");
    return;
  }

  setConversionError("");
  const convertButton = document.getElementById("convertButton");

  const conversionDone = (error) => {
    if (error) {
      console.error(error);
      setConversionError("Could not convert file.");
    } else {
      setConversionStatus("Conversion complete!");
      setConversionLoadingIconVisibility(false);
      setConversionCheckIconVisibility(true);
    }
    convertButton.disabled = false;
    conversionInProgress = false;
  };

  try {
    const fileReader = new FileReader();
    fileReader.onload = function () {
      convertButton.disabled = true;
      setConversionStatus("Parsing file...");
      setConversionLoadingIconVisibility(true);
      setConversionCheckIconVisibility(false);
      const conversionFileName = conversionFile.files[0].name.trim();
      const format =
        GaussianSplats3D.LoaderUtils.sceneFormatFromPath(conversionFileName);
      const fileData = { data: fileReader.result };
      window.setTimeout(() => {
        try {
          const splatBufferPromise = fileBufferToSplatBuffer(
            fileData,
            format,
            alphaRemovalThreshold,
            compressionLevel,
            sectionSize,
            sceneCenter,
            blockSize,
            bucketSize,
            sphericalHarmonicsDegree,
          );
          splatBufferPromise.then((splatBuffer) => {
            GaussianSplats3D.KSplatLoader.downloadFile(
              splatBuffer,
              "converted_file.ksplat",
            );
            conversionDone();
          });
        } catch (e) {
          conversionDone(e);
        }
      }, 100);
    };
    conversionInProgress = true;
    setConversionStatus("Loading file...");
    setConversionLoadingIconVisibility(true);
    fileReader.readAsArrayBuffer(conversionFile.files[0]);
  } catch (e) {
    conversionDone(e);
  }
};

function setConversionError(msg) {
  setConversionLoadingIconVisibility(false);
  setConversionCheckIconVisibility(false);
  document.getElementById("conversionStatus").innerHTML = "";
  document.getElementById("conversionError").innerHTML = msg;
}

function setConversionStatus(msg) {
  document.getElementById("conversionError").innerHTML = "";
  document.getElementById("conversionStatus").innerHTML = msg;
}

function setConversionLoadingIconVisibility(visible) {
  document.getElementById("conversion-loading-icon").style.display = visible
    ? "block"
    : "none";
}

function setConversionCheckIconVisibility(visible) {
  document.getElementById("check-icon").style.display = visible
    ? "block"
    : "none";
}

export async function viewSplat() {
  const alphaRemovalThreshold = 0;

  let cameraUpArray = "0,0,1";
  let cameraPositionArray = "1,0,-0.4";
  let cameraLookAtArray = "0,0,-0.4";
  let antialiased = true;
  let sceneIs2D = false;
  let sphericalHarmonicsDegree = 2;

  cameraUpArray = cameraUpArray.split(",");
  cameraPositionArray = cameraPositionArray.split(",");
  cameraLookAtArray = cameraLookAtArray.split(",");

  if (
    isNaN(alphaRemovalThreshold) ||
    alphaRemovalThreshold < 0 ||
    alphaRemovalThreshold > 255
  ) {
    console.error("Invalid alpha removal threshold.");
    return;
  } else if (
    isNaN(sphericalHarmonicsDegree) ||
    sphericalHarmonicsDegree < 0 ||
    sphericalHarmonicsDegree > 2
  ) {
    console.error("Invalid SH degree.");
    return;
  }

  if (cameraUpArray.length !== 3) {
    console.error("Camera up must contain 3 elements.");
    return;
  }

  if (cameraPositionArray.length !== 3) {
    console.error("Camera position must contain 3 elements.");
    return;
  }

  if (cameraLookAtArray.length !== 3) {
    console.error("Camera look-at must contain 3 elements.");
    return;
  }

  for (let i = 0; i < 3; i++) {
    cameraUpArray[i] = parseFloat(cameraUpArray[i]);
    cameraPositionArray[i] = parseFloat(cameraPositionArray[i]);
    cameraLookAtArray[i] = parseFloat(cameraLookAtArray[i]);

    if (isNaN(cameraUpArray[i])) {
      setViewError("Invalid camera up.");
      return;
    }

    if (isNaN(cameraPositionArray[i])) {
      setViewError("Invalid camera position.");
      return;
    }

    if (isNaN(cameraLookAtArray[i])) {
      setViewError("Invalid camera look-at.");
      return;
    }
  }

  // read the file
  // const path = '../cern_mug.ply';
  //const path = '../light_poster.ply';
  const path = "../assets/dunant_cleaned.ply";
  //
  const format = GaussianSplats3D.SceneFormat.Ply;
  const response = await fetch(path);
  if (!response.ok) {
    setViewError("Network error while fetching the file.");
    return;
  }
  const plyData = await response.arrayBuffer(); // or .text() if you want to
  runViewer(
    plyData,
    format,
    alphaRemovalThreshold,
    cameraUpArray,
    cameraPositionArray,
    cameraLookAtArray,
    antialiased,
    sceneIs2D,
    sphericalHarmonicsDegree,
  );

  // fetch(path)
  //   .then(response => {
  //     if (!response.ok) throw new Error('Network error');
  //     return response.text(); // or .arrayBuffer() if binary
  //   })
  //   .then(data => {
  //     // parse or use plyData
  //     // runViewer(data, format, alphaRemovalThreshold, cameraUpArray, cameraPositionArray, cameraLookAtArray, antialiased, sceneIs2D, sphericalHarmonicsDegree);
  //   })
  //   .catch(error => {
  //     console.error('Error reading file:', error);
  //   });
  // try {
  //   fileReader.onload = function(){
  //   }
  //   setViewStatus("Loading scene...");
  //   fileReader.readAsArrayBuffer(viewFile.files[0]);
  // } catch (e) {
  //   console.error(e);
  //   setViewError("Could not view scene.");
  // }
}

function setViewError(msg) {
  setViewLoadingIconVisibility(false);
  document.getElementById("viewStatus").innerHTML = "";
  document.getElementById("viewError").innerHTML = msg;
}

function setViewStatus(msg) {
  setViewLoadingIconVisibility(true);
  document.getElementById("viewError").innerHTML = "";
  document.getElementById("viewStatus").innerHTML = msg;
}

function setViewLoadingIconVisibility(visible) {
  document.getElementById("view-loading-icon").style.display = visible
    ? "block"
    : "none";
}

window.addEventListener("popstate", (event) => {
  if (currentAlphaRemovalThreshold !== undefined) {
    window.location =
      "index.html?art=" +
      currentAlphaRemovalThreshold +
      "&cu=" +
      currentCameraUpArray +
      "&cp=" +
      currentCameraPositionArray +
      "&cla=" +
      currentCameraLookAtArray +
      "&aa=" +
      currentAntialiased +
      "&2d=" +
      current2DScene +
      "&sh=" +
      currentSphericalHarmonicsDegree;
  } else {
    window.location = "index.html";
  }
});

function runViewer(
  splatBufferData,
  format,
  alphaRemovalThreshold,
  cameraUpArray,
  cameraPositionArray,
  cameraLookAtArray,
  antialiased,
  sceneIs2D,
  sphericalHarmonicsDegree,
) {
  const rootElement = document.getElementById("canvas-container");
  const viewerOptions = {
    cameraUp: cameraUpArray,
    initialCameraPosition: cameraPositionArray,
    initialCameraLookAt: cameraLookAtArray,
    halfPrecisionCovariancesOnGPU: false,
    antialiased: antialiased || false,
    splatRenderMode: sceneIs2D
      ? GaussianSplats3D.SplatRenderMode.TwoD
      : GaussianSplats3D.SplatRenderMode.ThreeD,
    sphericalHarmonicsDegree: sphericalHarmonicsDegree,
    rootElement: rootElement,
    sharedMemoryForWorkers: false,
  };
  const splatBufferOptions = {
    splatAlphaRemovalThreshold: alphaRemovalThreshold,
  };
  const splatBufferPromise = fileBufferToSplatBuffer(
    { data: splatBufferData },
    format,
    alphaRemovalThreshold,
    0,
    undefined,
    undefined,
    undefined,
    undefined,
    sphericalHarmonicsDegree,
  );
  console.log("running viewer");
  splatBufferPromise.then((splatBuffer) => {
    // document.getElementById("demo-content").style.display = 'none';
    // document.body.style.backgroundColor = "#ffffff";
    history.pushState("ViewSplat", null);
    const viewer = new GaussianSplats3D.Viewer(viewerOptions);
    viewer.addSplatBuffers([splatBuffer], [splatBufferOptions]).then(() => {
      viewer.start();
    });
  });
}
