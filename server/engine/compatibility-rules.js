/**
 * ClawdLove - Compatibility Rules & Constants
 */

const COMPLEMENTARY_TRAITS = [
  ['introvert', 'extrovert'],
  ['analytical', 'creative'],
  ['spontaneous', 'organized'],
  ['optimist', 'realist'],
  ['adventurous', 'homebody'],
  ['leader', 'supporter'],
  ['thinker', 'feeler'],
  ['independent', 'collaborative'],
];

// Communication style compatibility matrix (0-1 scores)
// Styles: direct, playful, intellectual, warm
const COMMUNICATION_MATRIX = {
  direct:       { direct: 0.7, playful: 0.5, intellectual: 0.8, warm: 0.6 },
  playful:      { direct: 0.5, playful: 0.9, intellectual: 0.4, warm: 0.85 },
  intellectual: { direct: 0.8, playful: 0.4, intellectual: 0.75, warm: 0.6 },
  warm:         { direct: 0.6, playful: 0.85, intellectual: 0.6, warm: 0.8 },
};

const INTEREST_CATEGORIES = {
  outdoors: ['hiking', 'camping', 'climbing', 'surfing', 'kayaking', 'cycling', 'running', 'skiing'],
  arts: ['painting', 'photography', 'music', 'writing', 'poetry', 'sculpting', 'theater', 'dance'],
  tech: ['programming', 'gaming', 'ai', 'robotics', 'electronics', 'vr', '3d-printing'],
  food: ['cooking', 'baking', 'wine', 'coffee', 'foodie', 'mixology', 'gardening'],
  fitness: ['yoga', 'weightlifting', 'martial-arts', 'swimming', 'pilates', 'crossfit'],
  culture: ['reading', 'travel', 'languages', 'history', 'philosophy', 'film', 'anime'],
  social: ['volunteering', 'board-games', 'karaoke', 'trivia', 'parties', 'networking'],
};

const WEIGHTS = {
  interests: 0.4,
  personality: 0.3,
  communication: 0.2,
  spark: 0.1,
};

module.exports = {
  COMPLEMENTARY_TRAITS,
  COMMUNICATION_MATRIX,
  INTEREST_CATEGORIES,
  WEIGHTS,
};
