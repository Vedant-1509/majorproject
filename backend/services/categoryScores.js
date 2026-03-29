export const normalizeCategoryScores = (categoryScores) => {
  if (!categoryScores) return {};

  if (categoryScores instanceof Map || typeof categoryScores?.entries === "function") {
    return Object.fromEntries(
      typeof categoryScores.entries === "function"
        ? categoryScores.entries()
        : categoryScores
    );
  }

  if (Array.isArray(categoryScores)) {
    return Object.fromEntries(categoryScores);
  }

  if (typeof categoryScores === "object") {
    return categoryScores;
  }

  return {};
};

export const getTopCategories = (
  categoryScores,
  {
    minScoreThreshold = 0.1,
    maxCategories = 1
  } = {}
) => {
  const normalizedScores = normalizeCategoryScores(categoryScores);

  return Object.entries(normalizedScores)
    .filter(([_, score]) => Number(score) >= minScoreThreshold)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, maxCategories)
    .map(([category]) => category);
};
