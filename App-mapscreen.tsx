/**
 * App.tsx with MapScreen (legacy test file)
 * NOTE: This file is deprecated. Use App.tsx with RootNavigator instead.
 * Kept for reference only.
 */

import './global.css';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  // @ts-ignore - Legacy test file, use RootNavigator in production
  return <RootNavigator />;
}
