// Replace with your Supabase details
const SUPABASE_URL = "https://lwsozcrubhmcvqutsfje.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3c296Y3J1YmhtY3ZxdXRzZmplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDIxNTQsImV4cCI6MjA3MTQxODE1NH0.fx6W2L66WFdkbxC9BKvJC7AzNHE4VS8tPu4YDf3YD9E";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("uploadForm");
const attendeesList = document.getElementById("attendeesList");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const file = document.getElementById("fileInput").files[0];

  if (!file) return alert("Please select a file!");

  const fileName = `${Date.now()}_${file.name}`;

  // Upload to Supabase bucket "attendees"
  const { error } = await supabase.storage
    .from("attendees")
    .upload(fileName, file);

  if (error) {
    alert("Upload failed: " + error.message);
    return;
  }

  // Save record in attendees table
  const { error: dbError } = await supabase.from("attendees").insert([
    {
      name: name,
      image_url: fileName,
    },
  ]);

  if (dbError) {
    alert("Database insert failed: " + dbError.message);
  } else {
    alert("Attendee uploaded successfully!");
    loadAttendees();
  }
});

// Load attendee list
async function loadAttendees() {
  const { data, error } = await supabase.from("attendees").select("*");
  if (error) return console.error(error);

  attendeesList.innerHTML = "";
  data.forEach((att) => {
    attendeesList.innerHTML += `<p>${att.name} - <img src="${SUPABASE_URL}/storage/v1/object/public/attendees/${att.image_url}" width="100"></p>`;
  });
}

loadAttendees();
