/**
 * App.tsx with Navigation (production version)
 */

import './global.css';
import './src/i18n'; // Initialize i18n
import { RootNavigator } from './src/navigation';

export default function App() {
  return <RootNavigator />;
}
