// Helper for secure random index
const getSecureRandomIndex = (max: number): number => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
};

// Fonction pour générer un code aléatoire de 6 caractères (0-9, A, B)
export const generateCode = (): string => {
  const characters = '0123456789AB';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(getSecureRandomIndex(characters.length));
  }
  return result;
};

// Fonction pour valider un code (longueur 6, caractères 0-9, A, B)
export const validateCode = (code: string | null | undefined): boolean => {
  if (!code || code.length !== 6) {
    return false;
  }
  const validCharacters = /^[0-9AB]+$/;
  return validCharacters.test(code);
};

// Fonction pour formater un code (nettoyer l'entrée)
export const formatCode = (input: string | null | undefined): string => {
  if (!input) return '';
  // Convertir en majuscules et supprimer les caractères non valides
  return input.toUpperCase().replace(/[^0-9AB]/g, '');
};
