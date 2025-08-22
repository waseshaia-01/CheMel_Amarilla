// Supabase config
const SUPABASE_URL = "https://lwsozcrubhmcvqutsfje.supabase.co";
const SUPABASE_KEY = "YOUR-ANON-KEY-HERE";  // <-- replace with anon key
const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

const video = document.getElementById("video");
const statusEl = document.getElementById("status");

// Load models (path fixed for GitHub Pages)
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/CheMel_Amarilla/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/CheMel_Amarilla/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/CheMel_Amarilla/models"),
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then((stream) => {
      video.srcObject = stream;
      statusEl.textContent = "Camera started. Loading attendees...";
      loadAttendees();
    })
    .catch((err) => console.error("Camera error:", err));
}

let labeledDescriptors = [];

async function loadAttendees() {
  const { data, error } = await client.from("attendees").select("*");
  if (error) return console.error(error);

  labeledDescriptors = await Promise.all(
    data.map(async (att) => {
      const imgUrl = `${SUPABASE_URL}/storage/v1/object/public/attendees/${att.image_url}`;
      const img = await faceapi.fetchImage(imgUrl);
      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detections) return null;
      return new faceapi.LabeledFaceDescriptors(att.name, [detections.descriptor]);
    })
  );

  statusEl.textContent = "Ready for scanning!";
}

video.addEventListener("play", () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    if (labeledDescriptors.length > 0) {
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
      const results = resizedDetections.map((d) =>
        faceMatcher.findBestMatch(d.descriptor)
      );

      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
        drawBox.draw(canvas);
      });
    }
  }, 100);
});
