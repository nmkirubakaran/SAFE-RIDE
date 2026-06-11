import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ─── PASTE YOUR SUPABASE CREDENTIALS HERE ───────────────────────────────────
// Found in: Supabase dashboard → Project Settings → API
const SUPABASE_URL  = "https://osfaasjrlsonobiyuuvu.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZmFhc2pybHNvbm9iaXl1dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzA1MDQsImV4cCI6MjA5NjMwNjUwNH0.g2cmvxD4jOV0fy3llKZEYCcbMX1sNNSLFHT45Va27-0";
// ────────────────────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Auth helpers ─────────────────────────────────────────────────────────────

export async function registerUser(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });
  if (error) throw error;
  return data.user;
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ? session.user : null);
  });
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session ? data.session.user : null;
}

// ── Document helpers ──────────────────────────────────────────────────────────

// Upload file to Supabase Storage + save metadata to documents table
export async function uploadDocument(userId, docType, file, expiryDate, vehicleId) {
  const filePath = `${userId}/${docType}_${Date.now()}_${file.name}`;

  // 1. Upload file to storage bucket called "documents"
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { upsert: false });
  if (uploadError) throw uploadError;

  // 2. Get public URL
  const { data: urlData } = supabase.storage
    .from("documents")
    .getPublicUrl(filePath);

  // 3. Save metadata to Firestore-equivalent: "documents" table in Supabase DB
  const { error: dbError } = await supabase
    .from("documents")
    .insert({
      user_id:     userId,
      doc_type:    docType,
      file_name:   file.name,
      file_url:    urlData.publicUrl,
      file_path:   filePath,
      vehicle_id:  vehicleId || null,
      expiry_date: expiryDate || null,
    });
  if (dbError) throw dbError;

  return filePath;
}

// Fetch all documents for the logged-in user
export async function getUserDocuments(userId) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Delete file from storage + row from database
export async function deleteDocument(docId, filePath) {
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([filePath]);
  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", docId);
  if (dbError) throw dbError;
}

// ── Emergency / SOS helpers ───────────────────────────────────────────────────

export async function saveEmergencyContact(userId, contact) {
  const { error } = await supabase
    .from("emergency_contacts")
    .upsert({ user_id: userId, ...contact });
  if (error) throw error;
}

export async function getEmergencyContact(userId) {
  const { data, error } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data;
}

