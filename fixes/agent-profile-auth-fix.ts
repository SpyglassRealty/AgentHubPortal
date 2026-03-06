// PREPARED FIX: Enhanced authentication and error handling for agent profile

// Fix 1: Add better error handling in backend
app.get('/api/agent-profile', isAuthenticated, async (req: any, res) => {
  try {
    const user = await getDbUser(req);
    if (!user) {
      console.log('[Agent Profile] User not found in session');
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`[Agent Profile] Fetching for user ${user.id} (${user.email})`);
    const profile = await storage.getAgentProfile(user.id);
    
    // Always return consistent structure, even with empty profile
    const response = {
      profile: {
        headshotUrl: profile?.headshotUrl || null,
        title: profile?.title || null,
        bio: profile?.bio || null, 
        phone: profile?.phone || null,
        facebookUrl: null,
        instagramUrl: null
      },
      user: {
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        email: user.email || null,
        profileImageUrl: user.profileImageUrl || null
      }
    };

    console.log('[Agent Profile] Returning response:', {
      profileFields: Object.keys(response.profile).filter(k => response.profile[k]),
      userFields: Object.keys(response.user).filter(k => response.user[k])
    });
    
    res.json(response);
  } catch (error) {
    console.error("[Agent Profile] Error:", error);
    res.status(500).json({ message: "Failed to fetch agent profile", error: error.message });
  }
});

// Fix 2: Add retry logic in frontend
const { data: agentProfileData, isLoading: profileLoading, error } = useQuery({
  queryKey: ['/api/agent-profile'],
  staleTime: 0,
  refetchOnMount: true,
  retry: 3,
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  onError: (error) => {
    console.error('[Agent Profile] Query failed:', error);
  }
});