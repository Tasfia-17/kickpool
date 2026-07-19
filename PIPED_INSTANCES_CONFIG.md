# Piped Instances Configuration

The CinePurr music player streams audio via [Piped](https://github.com/TeamPiped/Piped), a privacy-preserving YouTube frontend. Because Piped instances can go offline or become slow, the player supports dynamic instance configuration with automatic failover.

---

## How It Works

The player uses `Promise.any()` to try multiple instances simultaneously and use the first one that responds. Official and CDN instances are tried in parallel, falling back to "other" instances if needed.

## Configuration Methods (Priority Order)

1. **Remote Config URL** (Highest Priority)
2. **Environment Variables**
3. **Hardcoded Defaults** (Fallback)

## Method 1: Remote Config (Recommended)

Set `PIPED_INSTANCES_CONFIG_URL` in your `.env` file to point to a JSON config:

```env
PIPED_INSTANCES_CONFIG_URL=https://gist.githubusercontent.com/yourusername/yourgistid/raw/config.json
```

The JSON format should be:
```json
{
  "official": [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi-libre.kavin.rocks"
  ],
  "cdn": [
    "https://pipedapi.leptons.xyz",
    "https://pipedapi.nosebs.ru"
  ],
  "other": [
    "https://piped-api.privacy.com.de",
    "https://pipedapi.adminforge.de"
  ]
}
```

**Benefits:**
- Update instances without redeploying
- Share config across multiple deployments
- Easy to maintain via GitHub Gist or similar

## Method 2: Environment Variables

Set instance lists in your `.env` file:

```env
# Official instances (comma-separated or JSON array)
PIPED_OFFICIAL_INSTANCES=https://pipedapi.kavin.rocks,https://pipedapi-libre.kavin.rocks

# CDN instances
PIPED_CDN_INSTANCES=https://pipedapi.leptons.xyz,https://pipedapi.nosebs.ru

# Other instances
PIPED_OTHER_INSTANCES=https://piped-api.privacy.com.de,https://pipedapi.adminforge.de

# Invidious instances
INVIDIOUS_INSTANCES=https://inv.riverside.rocks,https://yewtu.be
```

Or as JSON arrays:
```env
PIPED_OFFICIAL_INSTANCES=["https://pipedapi.kavin.rocks","https://pipedapi-libre.kavin.rocks"]
```

## Method 3: Defaults (No Config)

If no environment variables are set, the system uses hardcoded defaults from the official Piped instances list.

## Caching

Instance configs are cached for 5 minutes to reduce remote fetch overhead.

## Performance Improvements

- **Promise.any**: Returns the first successful instance immediately (no waiting for slow failures)
- **Parallel fetching**: Official and CDN instances are tried simultaneously
- **Reduced timeouts**: 4 seconds per instance (down from 8 seconds)

## Example: GitHub Gist Setup

1. Create a Gist with your config JSON
2. Get the raw URL: `https://gist.githubusercontent.com/username/gistid/raw/config.json`
3. Set in `.env`:
   ```env
   PIPED_INSTANCES_CONFIG_URL=https://gist.githubusercontent.com/username/gistid/raw/config.json
   ```
4. Restart your server

Now you can update the Gist anytime to change instances without redeploying!

