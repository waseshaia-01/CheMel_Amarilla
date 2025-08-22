// Replace with your Supabase details
const SUPABASE_URL = "https://lwsozcrubhmcvqutsfje.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3c296Y3J1YmhtY3ZxdXRzZmplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDIxNTQsImV4cCI6MjA3MTQxODE1NH0.fx6W2L66WFdkbxC9BKvJC7AzNHE4VS8tPu4YDf3YD9E";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const video = document.getElementById("video");
const statusEl = document.getElementById("status");

// Load models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("models"),
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
  const { data, error } = await supabase.from("attendees").select("*");
  if (error) return console.error(error);

  labeledDescriptors = await Promise.all(
    data.map(async (att) => {
      const imgUrl = `${SUPABASE_URL}/storage/v1/object/public/attendees/${att.image_url}`;
      const img = await faceapi.fetchImage(imgUrl);
      const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
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
      const results = resizedDetections.map((d) => faceMatcher.findBestMatch(d.descriptor));

      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
        drawBox.draw(canvas);
      });
    }
  }, 100);
});
