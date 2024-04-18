/*
ISSUES:
- popstate does not work for when user presses the Search btn
*/

import {
    FaceDetector,
    FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const APP = {
    API_KEY: "43106130-599342261db5315de28e9876f",
    CACHE_KEY: "asif-cache",
    BASE_URL: "https://pixabay.com/api/",

    cacheRef: null,
    faceDetector: null,
    urlHistoryState: {
        saved: "saved",
        search: "search"    
    },

    keyword: document.getElementById("keyword"),
    results: document.querySelector("#results"),

    btnSearch: document.querySelector("#btnSearch"),
    btnSaved: document.querySelector("#btnSaved"),
    
    init: () => {
        console.log("Initialized app.");
        
        APP.openCache();
        APP.initializeFaceDetection();
        APP.addEventListeners();
    },

    addEventListeners: () => {
        window.addEventListener("popstate", APP.popState);

        //fetch and display searched imgs
        let btnRunSearch = document.getElementById("btnRunSearch");
        btnRunSearch.addEventListener("click", APP.runSearch);

        // move to search page (HistoryAPI)
        let btnSearch = document.getElementById("btnSearch");
        btnSearch.addEventListener("click", (ev) => {
            ev.preventDefault();

            APP.results.innerHTML = "";
            APP.updateHistory(APP.urlHistoryState.search);
        })

        // move to saved page (HistoryAPI)
        let btnSaved = document.getElementById("btnSaved");
        btnSaved.addEventListener("click", APP.displaySavedImages);

        //handle user picking an image
        let results = document.getElementById("results");
        results.addEventListener("click", APP.showPickedImage);
    },

    // FACE DETECTION INITIALIZATION
    initializeFaceDetection: async () => {
        const vision = await FilesetResolver.forVisionTasks(
            // path/to/wasm/root
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        APP.faceDetector = await FaceDetector.createFromOptions( vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
                delegate: "GPU"
            },
            runningMode: "IMAGE"
        });

    },

    // CACHE
    openCache: async () => {
        // cache is a promise
        APP.cacheRef = await caches.open(APP.CACHE_KEY);
    },

    // HISTORY
    popState: (ev) => {
        const currentState = ev.state;
        
        if (!currentState) return;

        let searchFormForm = document.querySelector("searchForm__form");

        switch (currentState) {
            // this doesn't work.
            case currentState.type.startsWith("search"):
                searchFormForm.style.display = "block";
                break;
            
            case currentState.type.startsWith("search"):
                searchFormForm.style.display = "none";
                APP.displaySavedImages();
                break;
    
        }
    },

    updateHistory: (urlState, keyword="") => {
        switch (urlState) {
            case APP.urlHistoryState.search:
                if (keyword === "") {
                    history.pushState({}, "", `#search`);
                } else {
                    history.pushState({}, "", `#search/${keyword}`);
                }
                
                break;
            case APP.urlHistoryState.saved: 
                history.pushState({}, "", `#saved`);
                break;
        }
    },

    // FETCH BLOB
    fetchBlob: async (imageURL) => {
        try {
            let response = await fetch(imageURL);
            console.log(response);

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            let blob = await response.blob();
            console.log(blob);

            let blobURL = URL.createObjectURL(blob);
            console.log(blobURL); 

            return blobURL;    

        } catch (err) {
            console.log(err);
        }
    },

    // SEARCH
    runSearch: async (ev) => {
        ev.preventDefault();

        let keyword = APP.keyword.value;
        
        // if nothing is entered, update the message to the user
        if (keyword === "") {
            APP.updateMessage(results, "Please enter a value.", "#bd1f36");
            return;
        }

        // change this object version 
        let url = new URL(APP.BASE_URL);
        url.searchParams.append(`key`, APP.API_KEY);
        url.searchParams.append(`image_type`, `photo`);
        url.searchParams.append(`orientation`, `horizontal`);
        url.searchParams.append(`category`, `people`);
        url.searchParams.append(`order`, `popular`);
        url.searchParams.append(`per_page`, `30`);
        url.searchParams.append(`q`, keyword); //search query
        
        console.log(url.searchParams.toString());

        try {
            const response = await fetch(url);
            console.log(response);

            if (!response.ok) throw new Error("Fetch error", response.statusText);

            const data = await response.json();
            console.log(data);

            APP.displaySearchResults(data.hits);
            APP.updateHistory(APP.urlHistoryState.search, keyword);
        } catch (err) {
            console.log(err.message);
        }
    },

    displaySearchResults: (hits) => {
        let results = APP.results;
        results.classList.add("search-results");
      
        let df = new DocumentFragment();
      
        if (hits.length === 0) {
            APP.updateMessage(results, "No Search Results.", "#bd1f36");
            return;
        }
        
        // Iterate through the data.hits array and generate HTML for each result
        hits.forEach(
          ({ previewURL, id, tags, previewWidth, previewHeight, largeImageURL }) => {
            let card = document.createElement("div");
            card.classList.add("card");
            card.setAttribute("data-ref", id);
            card.setAttribute("data-full", largeImageURL);
      
            let img = document.createElement("img");
            img.src = previewURL;
            img.alt = `${tags} photo`;
            img.width = previewWidth;
            img.height = previewHeight;
      
            card.append(img);
            df.append(card);
          }
        );
        
        // Clear the existing content and append the document fragment
        results.innerHTML = "";
        results.append(df);

        results.addEventListener("click", (ev) => {
            APP.showPickedImage(APP.urlHistoryState.search, ev);
        });
    },

    // SAVED
    displaySavedImages: async (ev) => {
        ev.preventDefault();

        let searchForm = document.querySelector(".searchForm");
        searchForm.innerHTML = `
        <div class="container">
            <h3>Saved Results</h3>
        </div>`;
        
        let results = APP.results;
        APP.results.innerHTML = "";
        
        const keys = await APP.cacheRef.keys();
        
        let df = new DocumentFragment();
        
        keys.forEach((key) => {
            console.log(key);
            
            let card = document.createElement("div");
            card.classList.add("card");
            card.setAttribute("data-full", key.url);
            
            let img = document.createElement("img");
            img.src = key.url;
            
            img.classList.add("saved-image");
            
            card.append(img);
            df.append(card);
        });
        
        results.append(df);
        APP.updateHistory(APP.urlHistoryState.saved);

        results.addEventListener("click", (ev) => {
            APP.showPickedImage(APP.urlHistoryState.saved, ev);
        });
    },

    // DIALOG
    showPickedImage: async (method, ev) => { 
        if (!ev || !ev.target) {
            console.log("Card was not clicked!");
            return;
        }
        
        console.log("Method:", method);

        //once user clicks on an image, handle here
        let card = ev.target.closest(".card");
        console.log(card);

        if (!card) {
            console.log("No cards here.");
            return;
        }

        let imageURL = card.getAttribute("data-full");
        console.log(imageURL);

        let blobURL = await APP.fetchBlob(imageURL);

        // show dialog
        const dialog = document.querySelector("#dialog");
        dialog.innerHTML = "";

        let df = new DocumentFragment();

        let container = document.createElement("div");
        container.classList.add("container");
        container.classList.add("dialog-container");

        let imgContainer = document.createElement("div");
        imgContainer.classList.add("image-container");

        let img = document.createElement("img");
        img.setAttribute("id", "image");
        img.src = blobURL; 
        img.alt = ``;

        imgContainer.append(img);

        let cancelBtn = document.createElement("button");
        cancelBtn.classList.add("btn");
        cancelBtn.setAttribute("id", "cancel-btn");
        cancelBtn.innerText = "Cancel";

        cancelBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            dialog.close();
        })

        container.append(imgContainer, cancelBtn);

        switch (method) {
            case APP.urlHistoryState.search:
                let saveBtn = document.createElement("button");
                saveBtn.classList.add("btn");
                saveBtn.setAttribute("id", "save-btn");
                saveBtn.innerText = "Save";
                
                saveBtn.addEventListener("click", () => {
                    APP.cacheRef.put(imageURL, new Response(blobURL));
                    
                    // will have to add this for saved section only
                    saveBtn.setAttribute("disabled", "");
                    saveBtn.innerText = "Saved";
                })
                
                container.append(saveBtn);
                break;

            case APP.urlHistoryState.saved:
                let removeBtn = document.createElement("button");
                removeBtn.classList.add("btn");
                removeBtn.setAttribute("id", "remove-btn");
                removeBtn.innerText = "Remove";
        
                removeBtn.addEventListener("click", () => {
                    // gets rid of the request
                    APP.cacheRef.delete(imageURL);
                    
                    card.remove();
                    dialog.close();
                });

                container.append(removeBtn);
                break;
        }
            
        df.append(container);
        dialog.append(df);
        
        dialog.showModal();

        if (method === APP.urlHistoryState.saved) {
            img.addEventListener("load", () => {
                APP.loadImage(img);
            });
        }
    },

    // FACE DETECTION
    loadImage: async (image) => {
        const faceDetectorResults = await APP.faceDetector.detect(image);
        
        const faceDetections = faceDetectorResults.detections;
        console.log(faceDetections);

        if (faceDetections.length === 0) {
            alert("No Faces Detected");
            return;
        }

        APP.detectFaces(faceDetections, image);
    },
    
    detectFaces: async (faceDetections, image) => {
        console.log("Detecting Face...");
        
        const ratio = image.height / image.naturalHeight;
        let imageContainer = document.querySelector(".image-container");
        let df = new DocumentFragment();

        // displaying the box
        faceDetections.forEach((faceDetection) => {
            const confidence = document.createElement("p");
            confidence.setAttribute("class", "info");

            confidence.innerText = `Confidence: ${(faceDetection.categories[0].score * 100).toFixed(2)}%`;

            confidence.style = `
            left: ${faceDetection.boundingBox.originX * ratio}px;
            top: ${faceDetection.boundingBox.originY * ratio - 30}px;
            width: ${faceDetection.boundingBox.width * ratio - 10}px;
            height: 20px;`

            const highlighter = document.createElement("div");
            highlighter.setAttribute("class", "highlighter");
            highlighter.style = `
            left: ${faceDetection.boundingBox.originX * ratio}px;
            top: ${faceDetection.boundingBox.originY * ratio}px;
            width: ${faceDetection.boundingBox.width * ratio}px;
            height: ${faceDetection.boundingBox.height * ratio}px;`

            df.append(highlighter, confidence);
        });

        imageContainer.append(df);
    }, 

    // MESSAGES
    updateMessage: (results, message, msgColor) => {
        results.innerHTML = `<h2>${message}</h2>`;
        results.style.color = msgColor;
    }
}

window.addEventListener("DOMContentLoaded", APP.init);
