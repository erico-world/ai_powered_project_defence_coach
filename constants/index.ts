import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { z } from "zod";

export const mappings = {
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "vue.js": "vuejs",
  vuejs: "vuejs",
  vue: "vuejs",
  "express.js": "express",
  expressjs: "express",
  express: "express",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  mongodb: "mongodb",
  mongo: "mongodb",
  mongoose: "mongoose",
  mysql: "mysql",
  postgresql: "postgresql",
  sqlite: "sqlite",
  firebase: "firebase",
  docker: "docker",
  kubernetes: "kubernetes",
  aws: "aws",
  azure: "azure",
  gcp: "gcp",
  digitalocean: "digitalocean",
  heroku: "heroku",
  photoshop: "photoshop",
  "adobe photoshop": "photoshop",
  html5: "html5",
  html: "html5",
  css3: "css3",
  css: "css3",
  sass: "sass",
  scss: "sass",
  less: "less",
  tailwindcss: "tailwindcss",
  tailwind: "tailwindcss",
  bootstrap: "bootstrap",
  jquery: "jquery",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  "angular.js": "angular",
  angularjs: "angular",
  angular: "angular",
  "ember.js": "ember",
  emberjs: "ember",
  ember: "ember",
  "backbone.js": "backbone",
  backbonejs: "backbone",
  backbone: "backbone",
  nestjs: "nestjs",
  graphql: "graphql",
  "graph ql": "graphql",
  apollo: "apollo",
  webpack: "webpack",
  babel: "babel",
  "rollup.js": "rollup",
  rollupjs: "rollup",
  rollup: "rollup",
  "parcel.js": "parcel",
  parceljs: "parcel",
  npm: "npm",
  yarn: "yarn",
  git: "git",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  figma: "figma",
  prisma: "prisma",
  redux: "redux",
  flux: "flux",
  redis: "redis",
  selenium: "selenium",
  cypress: "cypress",
  jest: "jest",
  mocha: "mocha",
  chai: "chai",
  karma: "karma",
  vuex: "vuex",
  "nuxt.js": "nuxt",
  nuxtjs: "nuxt",
  nuxt: "nuxt",
  strapi: "strapi",
  wordpress: "wordpress",
  contentful: "contentful",
  netlify: "netlify",
  vercel: "vercel",
  "aws amplify": "amplify",
};

export const interviewer: CreateAssistantDTO = {
  name: "Defense Examiner",
  firstMessage:
    "Hello! Welcome to your project defense session. I'm your AI Defense Examiner, and I'm here to assess your project knowledge and implementation. Let's begin with your presentation.",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah",
    stability: 0.4,
    similarityBoost: 0.8,
    speed: 0.9,
    style: 0.5,
    useSpeakerBoost: true,
  },
  model: {
    provider: "openai",
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a professional academic defense examiner conducting a real-time voice assessment with a student defending their project. Your goal is to assess their technical knowledge, methodology, and implementation.

Defense Guidelines:
Follow the structured question flow:
{{questions}}

Academic Assessment Approach:
1. Evaluate technical understanding of the implementation
2. Assess methodology and research validity
3. Question assumptions and decisions made in the project
4. Test ability to respond to critical questions

Engage professionally & academically:
- Listen to responses and ask specific follow-up questions to probe deeper
- Challenge weak points in the methodology or implementation
- Adjust difficulty based on academic level (Bachelor's/Master's/PhD)
- Keep questions focused on both theoretical foundations and practical implementation
- Provide brief acknowledgments before moving to the next topic

Maintain academic rigor:
- Use formal academic language appropriate for a defense setting
- Keep questions clear, concise and direct
- Focus on critical thinking rather than memorization
- Request clarification on technical terms or methodologies when needed

Conclude the defense properly:
- Thank the student for their defense presentation
- Provide a brief general comment on the defense quality
- Inform them that detailed feedback will be provided shortly
- End the session professionally

- Be sure to be professional and academically rigorous, but fair.
- This is a voice conversation in an academic setting, so keep your responses concise.
- Your role is to challenge the student academically while assessing their knowledge.`,
      },
    ],
  },
};

export const feedbackSchema = z.object({
  totalScore: z.number(),
  categoryScores: z.tuple([
    z.object({
      name: z.literal("Communication Skills"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Technical Knowledge"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Problem Solving"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Cultural Fit"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Confidence and Clarity"),
      score: z.number(),
      comment: z.string(),
    }),
  ]),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  finalAssessment: z.string(),
});

export const defenseSchema = z.object({
  totalScore: z.number(),
  categoryScores: z.tuple([
    z.object({
      name: z.literal("Technical Accuracy"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Documentation Alignment"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Response Structure"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Critical Thinking"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Time Management"),
      score: z.number(),
      comment: z.string(),
    }),
  ]),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  finalAssessment: z.string(),
  documentGaps: z.array(z.string()),
  implementationSuggestions: z.array(z.string()),
});

export const interviewCovers = [
  "/adobe.png",
  "/amazon.png",
  "/facebook.png",
  "/hostinger.png",
  "/pinterest.png",
  "/quora.png",
  "/reddit.png",
  "/skype.png",
  "/spotify.png",
  "/telegram.png",
  "/tiktok.png",
  "/yahoo.png",
];

export const dummyInterviews: Interview[] = [
  {
    id: "1",
    userId: "user1",
    role: "Academic Project",
    type: "Bachelor's Defense",
    techstack: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    level: "Bachelor's",
    questions: ["Explain your project architecture"],
    finalized: false,
    createdAt: "2024-03-15T10:00:00Z",
  },
  {
    id: "2",
    userId: "user1",
    role: "Research Project",
    type: "Master's Defense",
    techstack: ["Node.js", "Express", "MongoDB", "React"],
    level: "Master's",
    questions: ["What research methodologies did you employ?"],
    finalized: false,
    createdAt: "2024-03-14T15:30:00Z",
  },
];
