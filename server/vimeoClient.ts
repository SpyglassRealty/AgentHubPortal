const VIMEO_API_BASE = "https://api.vimeo.com";
const VIMEO_USER_ID = process.env.VIMEO_USER_ID || "192648675";
const VIMEO_FOLDER_ID = process.env.VIMEO_FOLDER_ID || "27970547";

function getVimeoToken(): string | undefined {
  return process.env.VIMEO_ACCESS_TOKEN;
}

interface VimeoVideo {
  uri: string;
  name: string;
  description: string | null;
  duration: number;
  created_time: string;
  modified_time: string;
  link: string;
  pictures: {
    sizes: Array<{
      width: number;
      height: number;
      link: string;
    }>;
  };
}

interface VimeoResponse {
  total: number;
  page: number;
  per_page: number;
  data: VimeoVideo[];
}

export interface LatestTrainingVideo {
  title: string;
  description: string | null;
  duration: number;
  durationFormatted: string;
  createdAt: string;
  link: string;
  thumbnail: string | null;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export async function getLatestTrainingVideo(): Promise<LatestTrainingVideo | null> {
  const token = getVimeoToken();
  if (!token) {
    console.warn("VIMEO_ACCESS_TOKEN not configured");
    return null;
  }

  try {
    // Fetch from the specific Training Videos folder
    const endpoint = `${VIMEO_API_BASE}/users/${VIMEO_USER_ID}/projects/${VIMEO_FOLDER_ID}/videos?sort=date&direction=desc&per_page=1`;
    console.log(`[Vimeo] Fetching latest video from: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.vimeo.*+json;version=3.4"
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Vimeo API error:", response.status, error);
      return null;
    }

    const data: VimeoResponse = await response.json();
    console.log(`[Vimeo] Found ${data.total} videos in folder ${VIMEO_FOLDER_ID}`);
    
    if (!data.data || data.data.length === 0) {
      console.log("Vimeo: No videos found in folder");
      return null;
    }

    const video = data.data[0];
    const thumbnail = video.pictures?.sizes?.find(s => s.width >= 640)?.link || 
                      video.pictures?.sizes?.[0]?.link || null;

    return {
      title: video.name,
      description: video.description,
      duration: video.duration,
      durationFormatted: formatDuration(video.duration),
      createdAt: video.created_time,
      link: video.link,
      thumbnail
    };
  } catch (error) {
    console.error("Error fetching latest Vimeo video:", error);
    return null;
  }
}
