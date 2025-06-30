
// Lista de palavras ofensivas que devem ser filtradas
const OFFENSIVE_WORDS = [
  // Palavrões comuns
  'porra', 'caralho', 'puta', 'merda', 'bosta', 'cacete', 'desgraça',
  'fdp', 'filho da puta', 'vai se foder', 'foder', 'foda-se', 'cuzao', 'cuzão',
  'viado', 'bicha', 'gay', 'lésbica', 'sapata', 'traveco', 'transexual',
  
  // Insultos raciais e discriminatórios
  'preto', 'negro', 'macaco', 'símio', 'crioulo', 'mulato', 'pardo',
  'amarelo', 'japa', 'chinês', 'oriental', 'índio', 'bugre',
  
  // Termos de ódio religioso
  'judeu', 'crente', 'evangélico', 'católico', 'protestante', 'umbandista',
  'candomblé', 'macumbeiro', 'satanista',
  
  // Termos que promovem violência
  'matar', 'morrer', 'suicídio', 'suicidar', 'enforcar', 'esfaquear',
  'tiro', 'bala', 'arma', 'violência', 'bater', 'socar', 'agredir',
  
  // Termos discriminatórios sobre deficiência
  'aleijado', 'retardado', 'mongol', 'débil', 'idiota', 'burro', 'estúpido',
  'imbecil', 'deficiente', 'inválido', 'manco', 'cego', 'surdo', 'mudo'
];

/**
 * Substitui palavras ofensivas por asteriscos
 * Cada letra da palavra ofensiva é substituída por um asterisco
 */
export const filterOffensiveContent = (text: string): string => {
  if (!text) return text;
  
  let filteredText = text;
  
  // Para cada palavra ofensiva na lista
  OFFENSIVE_WORDS.forEach(offensiveWord => {
    // Criar regex para encontrar a palavra (case insensitive)
    const regex = new RegExp(`\\b${offensiveWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    
    // Substituir por asteriscos
    filteredText = filteredText.replace(regex, (match) => {
      return '*'.repeat(match.length);
    });
  });
  
  return filteredText;
};

/**
 * Verifica se o texto contém conteúdo ofensivo
 */
export const containsOffensiveContent = (text: string): boolean => {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  return OFFENSIVE_WORDS.some(word => {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(lowerText);
  });
};
