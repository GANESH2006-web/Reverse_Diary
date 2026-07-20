export const prompts = [
  "What is the most distinct smell you remember from the past 48 hours?",
  "Describe the texture of the last thing you touched with your bare feet.",
  "What was the loudest mechanical sound you heard today?",
  "What color was the sky when you first looked outside this morning?",
  "Describe the temperature of the water you used to wash your hands or face.",
  "What is the taste of the last beverage you drank?",
  "Describe the feeling of the fabric of the shirt you are currently wearing.",
  "What is the brightest light source in the room you are in right now?",
  "What was the pitch or tone of the last person's voice you heard?",
  "Describe the texture of the keyboard or screen you are typing on.",
  "What is the most prominent background noise you can hear right now?",
  "What was the temperature of the air when you first stepped outside today?",
  "What visual pattern (stripes, grids, wood grain) did you notice today?",
  "What did the air smell like right after it rained, or when you opened a window?",
  "What is the weight or heft of the object closest to your left hand?",
  "Describe the taste of the food you ate for your last meal.",
  "What was the most interesting shadow you saw today?",
  "Describe the feeling of the wind or air current on your skin today.",
  "What color is the oldest book, notebook, or paper near you?",
  "What sound did your shoes make when walking today?",
  "What is the texture of the surface beneath your computer or phone?",
  "What was the last reflective surface you looked into besides a mirror?",
  "Describe the scent of the soap, shampoo, or lotion you used today.",
  "What is the shape of the largest cloud you saw in the sky today?",
  "Describe the physical sensation of swallowing your last bite of food.",
  "What was the most colorful object you spotted on a street or path today?",
  "Describe the feeling of your back resting against your chair or seat.",
  "What was the coldest thing you touched today?",
  "Describe the quality of the light (dim, harsh, golden, diffused) in this room.",
  "What was the last non-speech sound you made today (a sigh, a hum, a cough)?"
];

export const getDailyPrompt = () => {
  const day = new Date().getDate(); // 1 to 31
  // Map day of month (1-31) to indices 0-29.
  // If it's day 31, it will map to (31-1)%30 = 0 (first prompt).
  const index = (day - 1) % 30;
  return prompts[index];
};
