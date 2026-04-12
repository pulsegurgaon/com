export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  image: string;
  category: string;
  source: string;
  author: string;
  publishedAt: string;
  readingTime: number;
  highlights: string[];
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  authorAvatar: string;
  publishedAt: string;
  readingTime: number;
  tags: string[];
}

export const mockNews: NewsArticle[] = [
  {
    id: "1",
    title: "Gurgaon's New Metro Line Set to Transform Cyber Hub Connectivity",
    description: "The proposed metro expansion will connect Dwarka Expressway to Cyber City, reducing commute times by 40% for thousands of IT professionals.",
    content: "The Haryana government has approved a ₹4,500 crore expansion of the Gurugram Metro network that promises to revolutionize daily commutes for over 200,000 IT professionals working in Cyber Hub and surrounding tech corridors.\n\nThe new line will feature eight stations spanning 14 kilometers, with interchange facilities at HUDA City Centre and IFFCO Chowk. Construction is expected to begin in Q3 2026 with full operations targeted for 2029.\n\nExperts predict the project will reduce road congestion by 30% along the NH-48 corridor and significantly boost real estate values in areas like Sector 65 and Sector 74.",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&h=600&fit=crop",
    category: "India",
    source: "The Hindu",
    author: "Priya Sharma",
    publishedAt: "2026-04-07T08:30:00Z",
    readingTime: 5,
    highlights: [
      "₹4,500 crore metro expansion approved for Gurugram",
      "8 new stations spanning 14 km from Dwarka Expressway to Cyber City",
      "Expected to reduce road congestion by 30% on NH-48",
      "Full operations targeted for 2029"
    ]
  },
  {
    id: "2",
    title: "India's AI Startup Ecosystem Crosses $15 Billion in Total Funding",
    description: "With 47 new AI unicorns minted this year, India surpasses UK to become the world's third-largest AI hub behind the US and China.",
    content: "India's artificial intelligence startup ecosystem has reached a landmark milestone, with cumulative funding crossing $15 billion as of April 2026. The country now hosts 47 AI unicorns, up from 23 just a year ago.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=600&fit=crop",
    category: "Tech",
    source: "Economic Times",
    author: "Rahul Verma",
    publishedAt: "2026-04-07T06:00:00Z",
    readingTime: 4,
    highlights: [
      "India's AI startups cross $15B in total funding",
      "47 AI unicorns in 2026, up from 23 last year",
      "India surpasses UK as third-largest AI hub globally"
    ]
  },
  {
    id: "3",
    title: "RBI Holds Interest Rates Steady Amid Global Inflation Concerns",
    description: "The Reserve Bank of India maintains the repo rate at 6.25%, citing stable domestic growth but warning of imported inflation risks.",
    content: "In its bi-monthly monetary policy review, the Reserve Bank of India decided to keep the benchmark repo rate unchanged at 6.25% for the third consecutive meeting.",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=600&fit=crop",
    category: "Finance",
    source: "Mint",
    author: "Ananya Desai",
    publishedAt: "2026-04-06T14:00:00Z",
    readingTime: 6,
    highlights: [
      "Repo rate unchanged at 6.25% for third consecutive meeting",
      "GDP growth forecast maintained at 7.1% for FY27",
      "CPI inflation expected to moderate to 4.2% by Q4"
    ]
  },
  {
    id: "4",
    title: "SpaceX Starship Successfully Delivers First Commercial Satellite Constellation",
    description: "The fully reusable rocket deployed 120 broadband satellites in a single launch, marking a new era for affordable space access.",
    content: "SpaceX achieved another milestone with Starship's first fully commercial satellite deployment mission.",
    image: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=1200&h=600&fit=crop",
    category: "World",
    source: "Reuters",
    author: "James Mitchell",
    publishedAt: "2026-04-06T20:00:00Z",
    readingTime: 3,
    highlights: [
      "120 broadband satellites deployed in single Starship launch",
      "Cost per kilogram to orbit reduced to $50",
      "Full booster and ship recovery achieved"
    ]
  },
  {
    id: "5",
    title: "Gurgaon Smart City Project Deploys 5,000 IoT Sensors Across Key Intersections",
    description: "AI-powered traffic management system goes live in Sectors 29–56, promising real-time congestion optimization.",
    content: "The Gurugram Smart City initiative has completed the deployment of over 5,000 IoT sensors across 120 major intersections.",
    image: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=1200&h=600&fit=crop",
    category: "Tech",
    source: "Hindustan Times",
    author: "Vikram Singh",
    publishedAt: "2026-04-05T10:00:00Z",
    readingTime: 4,
    highlights: [
      "5,000 IoT sensors deployed across 120 intersections",
      "AI-powered traffic optimization reduces wait times by 35%",
      "₹200 crore investment under Smart City Mission"
    ]
  },
  {
    id: "6",
    title: "Sensex Touches All-Time High of 88,000 on Strong FII Inflows",
    description: "Foreign institutional investors poured ₹12,000 crore into Indian equities in March, driving the benchmark index to unprecedented levels.",
    content: "The BSE Sensex breached the 88,000 mark for the first time, powered by sustained foreign institutional investment.",
    image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&h=600&fit=crop",
    category: "Finance",
    source: "Business Standard",
    author: "Kiran Mehta",
    publishedAt: "2026-04-05T16:30:00Z",
    readingTime: 3,
    highlights: [
      "Sensex crosses 88,000 for the first time",
      "FII inflows of ₹12,000 crore in March 2026",
      "IT and banking sectors lead the rally"
    ]
  },
];

export const mockBlogs: BlogPost[] = [
  {
    id: "b1",
    title: "Why Gurgaon's Coworking Revolution Is Reshaping India's Work Culture",
    excerpt: "From corporate cubicles to vibrant shared spaces — how the Millennium City became India's coworking capital.",
    content: "The evolution of Gurgaon's work culture over the past decade has been nothing short of revolutionary...",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=500&fit=crop",
    author: "Neha Kapoor",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    publishedAt: "2026-04-03T12:00:00Z",
    readingTime: 8,
    tags: ["Culture", "Work", "Gurgaon"],
  },
  {
    id: "b2",
    title: "The Hidden Food Trail of Old Gurgaon: A Culinary Deep Dive",
    excerpt: "Beyond the malls and high-rises, discover the authentic flavors that have defined Gurgaon for generations.",
    content: "While most food bloggers focus on the glitzy restaurants of Cyber Hub...",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=500&fit=crop",
    author: "Arjun Malhotra",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    publishedAt: "2026-04-01T09:00:00Z",
    readingTime: 12,
    tags: ["Food", "Culture", "Local"],
  },
  {
    id: "b3",
    title: "Building India's Next Tech Unicorn: Lessons from Gurgaon Founders",
    excerpt: "Five founders share raw, unfiltered stories about what it really takes to build a billion-dollar company.",
    content: "The startup ecosystem in Gurugram has matured significantly...",
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=500&fit=crop",
    author: "Rohit Bansal",
    authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    publishedAt: "2026-03-28T15:00:00Z",
    readingTime: 15,
    tags: ["Startups", "Tech", "Business"],
  },
  {
    id: "b4",
    title: "Sustainable Living in Gurgaon: A Practical Guide for 2026",
    excerpt: "From rooftop solar to zero-waste communities — practical steps toward greener urban living.",
    content: "As Gurgaon grapples with air quality and water challenges...",
    image: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&h=500&fit=crop",
    author: "Meera Joshi",
    authorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    publishedAt: "2026-03-25T11:00:00Z",
    readingTime: 10,
    tags: ["Sustainability", "Lifestyle", "Green"],
  },
];

export const mockTickerMessages = [
  "🔴 BREAKING: Gurgaon Metro Phase 3 gets cabinet approval — 14 km new line to Cyber Hub",
  "📈 Sensex hits all-time high of 88,000 on strong FII inflows",
  "🏏 IPL 2026: Gujarat Titans defeat Mumbai Indians by 6 wickets",
  "🌡️ IMD warns of heatwave conditions in NCR region this week",
  "💼 TCS announces 15,000 new hires for Gurgaon campus in Q2",
  "🚗 Dwarka Expressway toll-free period extended until June 2026",
];

export const categories = [
  { key: "all", en: "All", hi: "सभी" },
  { key: "india", en: "India", hi: "भारत" },
  { key: "world", en: "World", hi: "विश्व" },
  { key: "tech", en: "Tech", hi: "तकनीक" },
  { key: "finance", en: "Finance", hi: "वित्त" },
  { key: "blogs", en: "Blogs", hi: "ब्लॉग" },
];
