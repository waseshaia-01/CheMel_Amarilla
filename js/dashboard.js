// Supabase config
const SUPABASE_URL = "https://lwsozcrubhmcvqutsfje.supabase.co";
const SUPABASE_KEY = "YOUR-ANON-KEY-HERE";  // <-- replace with anon key
const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("uploadForm");
const attendeesList = document.getElementById("attendeesList");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const file = document.getElementById("fileInput").files[0];

  if (!file) return alert("Please select a file!");

  const fileName = `${Date.now()}_${file.name}`;

  // Upload to Supabase bucket
  const { error } = await client.storage
    .from("attendees")
    .upload(fileName, file);

  if (error) {
    alert("Upload failed: " + error.message);
    return;
  }

  // Insert record
  const { error: dbError } = await client.from("attendees").insert([
    { name: name, image_url: fileName },
  ]);

  if (dbError) {
    alert("Database insert failed: " + dbError.message);
  } else {
    alert("Attendee uploaded successfully!");
    loadAttendees();
  }
});

// Load attendees
async function loadAttendees() {
  const { data, error } = await client.from("attendees").select("*");
  if (error) return console.error(error);

  attendeesList.innerHTML = "";
  data.forEach((att) => {
    attendeesList.innerHTML += `<p>${att.name}<br><img src="${SUPABASE_URL}/storage/v1/object/public/attendees/${att.image_url}" width="120"></p>`;
  });
}

loadAttendees();
