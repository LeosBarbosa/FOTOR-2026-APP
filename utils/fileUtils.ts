
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // result is "data:mime/type;base64,the_base_64_string"
        // we want just "the_base_64_string"
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Falha ao ler o arquivo como string Base64.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const fileToBlobUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

export const imageUrlToBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  const response = await fetch(url);
  const blob = await response.blob();
  const mimeType = blob.type;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({ base64: reader.result.split(',')[1], mimeType });
      } else {
        reject(new Error('Falha ao ler o arquivo como string Base64.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};
