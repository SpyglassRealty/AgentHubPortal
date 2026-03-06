// PREPARED FIX: MapBox Token Debug and Environment Check

// Enhanced MapBox token endpoint with better debugging
app.get('/api/mapbox-token', isAuthenticated, async (req: any, res) => {
  try {
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    
    console.log('[MapBox] Token check:', {
      hasToken: !!mapboxToken,
      tokenLength: mapboxToken?.length || 0,
      tokenPrefix: mapboxToken?.substring(0, 10) || 'none',
      allEnvVars: Object.keys(process.env).filter(k => k.includes('MAPBOX'))
    });
    
    if (!mapboxToken) {
      console.log('[MapBox] MAPBOX_ACCESS_TOKEN not configured in environment');
      return res.status(503).json({ 
        error: "Mapbox token not configured",
        message: "MAPBOX_ACCESS_TOKEN environment variable not set",
        available: Object.keys(process.env).filter(k => k.toLowerCase().includes('map'))
      });
    }
    
    // Validate token format
    if (!mapboxToken.startsWith('pk.')) {
      console.log('[MapBox] Invalid token format - should start with pk.');
      return res.status(503).json({
        error: "Invalid Mapbox token format",
        message: "Token should start with 'pk.'"
      });
    }
    
    console.log('[MapBox] Returning valid token');
    res.json({ token: mapboxToken });
  } catch (error) {
    console.error("[MapBox] Error fetching token:", error);
    res.status(500).json({ 
      error: "Failed to fetch Mapbox token",
      message: error.message 
    });
  }
});

// Frontend error handling improvement
useEffect(() => {
  const fetchMapToken = async () => {
    try {
      console.log('[Map Widget] Fetching mapbox token...');
      const response = await fetch('/api/mapbox-token');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Map Widget] Token fetch failed:', response.status, errorData);
        setMapError(`Token fetch failed: ${errorData.message || response.statusText}`);
        return;
      }
      
      const data = await response.json();
      console.log('[Map Widget] Token received:', !!data.token);
      
      if (data.token) {
        setMapToken(data.token);
      } else {
        setMapError('No token in response');
      }
    } catch (error) {
      console.error('[Map Widget] Token request failed:', error);
      setMapError(`Request failed: ${error.message}`);
    }
  };
  
  fetchMapToken();
}, []);