import AppLayout from './components/layout/AppLayout'
import MapPanel from './components/map/MapPanel'
import CitySelector from './components/steps/CitySelector'
import ItineraryPlanner from './components/steps/ItineraryPlanner'
import PreferenceQuiz from './components/steps/PreferenceQuiz'
import TripParams from './components/steps/TripParams'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const currentStep = useAppStore((s) => s.currentStep)

  return (
    <AppLayout
      left={
        currentStep === 1 ? (
          <PreferenceQuiz />
        ) : currentStep === 2 ? (
          <CitySelector />
        ) : currentStep === 3 ? (
          <TripParams />
        ) : (
          <ItineraryPlanner />
        )
      }
      right={<MapPanel />}
    />
  )
}
