// src/lib/upload.ts
import { supabase } from "./supabase";

export const uploadFile = async (file: File, folder: string) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  // 1. Subir el archivo al Storage
  const { error: uploadError } = await supabase.storage
    .from("evidencias")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // 2. Obtener la URL pública
  const { data } = supabase.storage.from("evidencias").getPublicUrl(filePath);

  return data.publicUrl; // Este es el link que guardaremos en la DB
};
