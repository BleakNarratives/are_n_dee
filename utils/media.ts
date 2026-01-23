/**
 * Converts a File object (image, video, etc.) into a base64 encoded string.
 * @param file The File object to encode.
 * @returns A Promise that resolves with the base64 encoded string.
 */
export const base64EncodeFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // The result will be a data URL (e.g., "data:image/png;base64,...")
      // We only need the base64 part after the comma.
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
