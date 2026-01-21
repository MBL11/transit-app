# Analytics & Crash Reporting Setup

This document explains how to set up analytics (Amplitude) and crash reporting (Sentry) for the Transit App.

## 📊 Amplitude Analytics

### 1. Create Account

1. Go to [Amplitude](https://amplitude.com)
2. Sign up for a free account
3. Create a new project named "Transit App"

### 2. Get API Key

1. Navigate to **Settings** → **Projects** → **Transit App**
2. Copy your **API Key**

### 3. Add to Environment Variables

Add to `.env`:

```env
EXPO_PUBLIC_AMPLITUDE_KEY=your_amplitude_api_key_here
```

### 4. Test (Optional in Development)

By default, analytics are disabled in development mode. To enable for testing:

```env
EXPO_PUBLIC_ENABLE_ANALYTICS_DEV=true
```

### 5. Events Tracked

The app automatically tracks these events:

**App Lifecycle:**
- `app_opened` - App launched
- `app_backgrounded` - App sent to background
- `app_foregrounded` - App brought to foreground

**Search:**
- `search_performed` - User searched for stop/line
- `search_result_clicked` - User tapped a search result

**Route Planning:**
- `route_searched` - User initiated route search
- `route_calculated` - Route successfully calculated
- `route_selected` - User selected a route option
- `route_calculation_failed` - Route calculation failed

**Favorites:**
- `favorite_added` - User added favorite (stop/line/journey)
- `favorite_removed` - User removed favorite

**Stops & Lines:**
- `stop_viewed` - User viewed stop details
- `line_viewed` - User viewed line details
- `next_departures_viewed` - User checked next departures

**Alerts:**
- `alerts_viewed` - User opened alerts screen
- `alert_clicked` - User tapped an alert

**Settings:**
- `language_changed` - User changed language
- `theme_changed` - User changed theme
- `notifications_toggled` - User enabled/disabled notifications

**Data:**
- `data_imported` - User imported GTFS data
- `data_cleared` - User cleared data
- `data_update_checked` - User checked for data updates

**Navigation:**
- `navigation_tab_changed` - User switched tabs
- `screen_view` - User viewed a screen

**Errors:**
- `error_occurred` - General error
- `network_error` - Network/API error
- `api_error` - API-specific error

### 6. View Dashboard

1. Go to [Amplitude Dashboard](https://analytics.amplitude.com)
2. Select "Transit App" project
3. View events, user flows, retention, etc.

---

## 🐛 Sentry Crash Reporting

### 1. Create Account

1. Go to [Sentry](https://sentry.io)
2. Sign up for a free account
3. Create a new project:
   - Platform: **React Native**
   - Project name: **transit-app**

### 2. Get DSN

1. After creating the project, copy the **DSN** (Data Source Name)
2. Format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

### 3. Add to Environment Variables

Add to `.env`:

```env
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### 4. Test (Optional in Development)

By default, Sentry is disabled in development mode. To enable for testing:

```env
EXPO_PUBLIC_ENABLE_SENTRY_DEV=true
```

### 5. What's Captured

**Automatic:**
- JavaScript errors and exceptions
- Unhandled promise rejections
- Native crashes (iOS/Android)
- Performance monitoring (optional)
- User actions (breadcrumbs)

**Manual:**
- API errors with context
- Navigation events
- Custom error logging

**Filtered Out:**
- Network errors (usually transient)
- React Navigation warnings
- Expo Go specific errors
- Sensitive data (cookies, headers)

### 6. Sentry Features

**Error Details:**
- Full stack traces
- Device information
- App version
- User session
- Breadcrumbs (user actions before crash)

**Alerts:**
- Email notifications for new issues
- Slack integration
- Issue assignment and tracking

**Releases:**
- Track errors by app version
- See which version has most errors

### 7. View Dashboard

1. Go to [Sentry Dashboard](https://sentry.io)
2. Select "transit-app" project
3. View issues, stack traces, performance

---

## 🔧 Integration Examples

### Track Custom Event

```typescript
import { trackEvent } from './src/services/analytics';

// Simple event
trackEvent('button_clicked');

// Event with properties
trackEvent('route_calculated', {
  from_type: 'stop',
  to_type: 'address',
  duration_minutes: 25,
  transfers: 2,
});
```

### Capture Error with Context

```typescript
import { captureException } from './src/services/crash-reporting';

try {
  await someAPICall();
} catch (error) {
  captureException(error, {
    endpoint: '/api/stops',
    userId: '12345',
    additionalInfo: 'Custom context',
  });
  throw error;
}
```

### Add Breadcrumb

```typescript
import { addBreadcrumb } from './src/services/crash-reporting';

addBreadcrumb(
  'navigation',
  'User navigated to stop details',
  { stopId: 'STOP123' }
);
```

### Wrap Function with Error Tracking

```typescript
import { withErrorTracking } from './src/services/crash-reporting';

const fetchData = withErrorTracking(async (stopId: string) => {
  const response = await fetch(`/api/stops/${stopId}`);
  return response.json();
}, { function: 'fetchData' });

// Automatically reports errors to Sentry
await fetchData('STOP123');
```

---

## 📈 Best Practices

### Analytics

✅ **DO:**
- Track user flows and funnels
- Monitor feature adoption
- Track error rates
- A/B test new features

❌ **DON'T:**
- Track personally identifiable information (PII)
- Track sensitive data (passwords, tokens)
- Over-track (keep events meaningful)

### Crash Reporting

✅ **DO:**
- Add context to errors
- Use breadcrumbs for debugging
- Set release versions
- Monitor error trends

❌ **DON'T:**
- Log sensitive user data
- Ignore filtered errors completely
- Disable in production

---

## 🧪 Testing

### Test Analytics (Development)

1. Enable dev mode analytics:
   ```env
   EXPO_PUBLIC_ENABLE_ANALYTICS_DEV=true
   ```

2. Perform actions in the app

3. Check console for `[Analytics]` logs

4. View in Amplitude dashboard (may take a few minutes)

### Test Sentry (Development)

1. Enable dev mode Sentry:
   ```env
   EXPO_PUBLIC_ENABLE_SENTRY_DEV=true
   ```

2. Trigger an error (e.g., throw new Error('Test'))

3. Check console for `[Sentry]` logs

4. View in Sentry dashboard immediately

### Force Test Error

Add a test button in your dev build:

```typescript
import { captureException } from './src/services/crash-reporting';
import { trackEvent } from './src/services/analytics';

// Somewhere in your component
<Button
  onPress={() => {
    trackEvent('test_event', { test: true });
    captureException(new Error('Test error from button'));
  }}
  title="Test Analytics & Sentry"
/>
```

---

## 🚀 Production Checklist

- [ ] Amplitude API key added to `.env`
- [ ] Sentry DSN added to `.env`
- [ ] Dev flags removed or set to `false`
- [ ] Tested key user flows
- [ ] Set up Sentry alerts
- [ ] Configured release tracking
- [ ] Added team members to both platforms
- [ ] Set up Slack notifications (optional)

---

## 📱 Platform-Specific Notes

### iOS

- Sentry symbolication requires uploading dSYMs
- Configure automatically via EAS Build

### Android

- Sentry requires ProGuard mapping files
- Configured automatically via EAS Build

---

## 🆘 Troubleshooting

### Analytics Not Showing

1. Check API key is correct
2. Check `EXPO_PUBLIC_ENABLE_ANALYTICS_DEV` if in dev
3. Wait 5-10 minutes for data to appear
4. Check console for `[Analytics]` errors

### Sentry Not Capturing

1. Check DSN is correct
2. Check `EXPO_PUBLIC_ENABLE_SENTRY_DEV` if in dev
3. Check errors aren't in `ignoreErrors` list
4. Check console for `[Sentry]` errors

### Missing Stack Traces

1. Ensure source maps are uploaded (EAS handles this)
2. Check release version matches
3. Verify symbolication is enabled

---

## 📚 Resources

- [Amplitude Docs](https://www.docs.developers.amplitude.com/)
- [Sentry React Native Docs](https://docs.sentry.io/platforms/react-native/)
- [Expo + Sentry](https://docs.expo.dev/guides/using-sentry/)
- [Amplitude + React Native](https://www.docs.developers.amplitude.com/data/sdks/react-native/)

---

**Questions?** Check the docs or contact the team!
