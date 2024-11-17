// src/utils/similarity.js
import { Request } from '../models/request.js';

export async function checkForDuplicates(title, department, content) {
  const recentRequests = await Request.find({
    department,
    createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }
  });

  for (const request of recentRequests) {
    const titleSimilarity = calculateSimilarity(title, request.title);
    const contentSimilarity = calculateSimilarity(content, request.content);
    
    if (titleSimilarity > 0.8 && contentSimilarity > 0.7) {
      return {
        isDuplicate: true,
        originalRequest: request
      };
    }
  }

  return { isDuplicate: false };
}

export function calculateSimilarity(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      if (str1[i-1] === str2[j-1]) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1,
          matrix[i][j-1] + 1,
          matrix[i-1][j] + 1
        );
      }
    }
  }
  
  return 1 - (matrix[str1.length][str2.length] / Math.max(str1.length, str2.length));
}
