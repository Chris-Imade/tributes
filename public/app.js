// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlB0-tgX3EYQFSarmTR8XxgnUtTsy3-SU",
  authDomain: "tribute-a4217.firebaseapp.com",
  projectId: "tribute-a4217",
  storageBucket: "tribute-a4217.appspot.com",
  messagingSenderId: "1029377373227",
  appId: "1:1029377373227:web:4d809ec0fa00334bc8e66e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Image upload preview functions
function previewImage(input) {
  const preview = document.getElementById("preview-image");
  const previewContainer = document.querySelector(".image-preview");

  if (input.files && input.files[0]) {
    const reader = new FileReader();

    reader.onload = function (e) {
      preview.src = e.target.result;
      previewContainer.style.display = "inline-block";
    };

    reader.readAsDataURL(input.files[0]);
  }
}

function removeImage() {
  const input = document.getElementById("image-upload");
  const previewContainer = document.querySelector(".image-preview");
  input.value = "";
  previewContainer.style.display = "none";
}

// Add image upload event listener
document.getElementById("image-upload").addEventListener("change", function () {
  previewImage(this);
});

// Function to create skeleton loader
function showSkeletonLoader() {
  const tributesList = document.querySelector(".tributes-list");
  tributesList.innerHTML =
    '<h2 class="heading-style-h2" style="margin-bottom: 40px">Recent Tributes</h2>';

  // Add 3 skeleton cards
  for (let i = 0; i < 3; i++) {
    const skeletonCard = document.createElement("div");
    skeletonCard.className = "skeleton-card";
    skeletonCard.innerHTML = `
      <div class="skeleton-image skeleton"></div>
      <div class="skeleton-meta">
        <div class="skeleton-title skeleton"></div>
        <div class="skeleton-date skeleton"></div>
      </div>
      <div class="skeleton-author skeleton"></div>
      <div class="skeleton-message skeleton"></div>
    `;
    tributesList.appendChild(skeletonCard);
  }
}

// Function to upload image to Cloudinary and get URL
async function uploadImage(file) {
  if (!file) return null;

  try {
    const cloudName = "dtj0krpma";
    const uploadPreset = "tribute_uploads"; // Make sure to set this in Cloudinary

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    if (response.ok) {
      return data.secure_url; // Cloudinary's URL for the uploaded image
    } else {
      console.error("Error uploading to Cloudinary: ", data.error.message);
      return null;
    }
  } catch (error) {
    console.error("Error uploading image: ", error);
    return null;
  }
}

// Function to load tributes
async function loadTributes() {
  showSkeletonLoader();

  try {
    const tributesRef = collection(db, "tributes");
    const q = query(tributesRef, orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);

    const tributesList = document.querySelector(".tributes-list");
    tributesList.innerHTML =
      '<h2 class="heading-style-h2" style="margin-bottom: 40px">Recent Tributes</h2>';

    if (snapshot.empty) {
      tributesList.innerHTML +=
        '<p style="text-align: center; color: rgba(255,255,255,0.6);">No tributes yet. Be the first to share your memories.</p>';
      return;
    }

    snapshot.forEach((doc) => {
      const tribute = doc.data();
      const tributeCard = document.createElement("div");
      tributeCard.className = "tribute-card";

      const date = tribute.timestamp?.toDate() || new Date();
      const dateString = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const timeString = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      tributeCard.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 16px;">
            ${
              tribute.imageUrl
                ? `<img src="${tribute.imageUrl}" style="width: 200px; height: 200px; border-radius: 8px; object-fit: cover;">`
                : ""
            }
            <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
            <div class="tribute-meta" style="color: #888; font-size: 14px;">
                <span>${tribute.title}</span>
                <span style="margin-left: 8px;">${dateString} • ${timeString}</span>
            </div>
            <div class="tribute-author" style="font-weight: bold; font-size: 16px;">
                <span>${tribute.name}</span>
            </div>
            <div class="tribute-message" style="font-size: 14px; color: #444;">
                <span>${tribute.message}</span>
            </div>
            </div>
        </div>
        `;

      tributesList.appendChild(tributeCard);
    });
  } catch (error) {
    console.error("Error loading tributes: ", error);
    const tributesList = document.querySelector(".tributes-list");
    tributesList.innerHTML +=
      '<p style="text-align: center; color: rgba(255,255,255,0.6);">Error loading tributes. Please try again later.</p>';
  }
}

// Load tributes when page loads
loadTributes();

// Handle form submission
document
  .getElementById("tribute-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    // Show loading state
    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.classList.add("loading");
    submitButton.disabled = true;

    try {
      // Get form values
      const name = this.querySelector('input[placeholder="Your Name"]').value;
      const title = this.querySelector(
        'input[placeholder="Title (e.g. Friend, Church Member)"]'
      ).value;
      const message = this.querySelector("textarea").value;

      // Get image if uploaded
      let imageUrl = null;
      const imageInput = document.getElementById("image-upload");
      if (imageInput.files.length > 0) {
        imageUrl = await uploadImage(imageInput.files[0]);
      }

      // Add tribute to Firestore
      const tributesRef = collection(db, "tributes");
      await addDoc(tributesRef, {
        name: name,
        title: title,
        message: message,
        imageUrl: imageUrl,
        timestamp: serverTimestamp(),
      });

      // Clear form and image preview
      this.reset();
      removeImage();

      // Reload tributes
      await loadTributes();
    } catch (error) {
      console.error("Error adding tribute: ", error);
    } finally {
      // Remove loading state
      submitButton.classList.remove("loading");
      submitButton.disabled = false;
    }
  });