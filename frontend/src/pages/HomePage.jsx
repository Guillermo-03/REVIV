import { useState } from 'react'
import { GlobeView } from '../components/Globe/GlobeView'
import { DetailPanel } from '../components/Globe/DetailPanel'
import { Modal } from '../components/UI/Modal'
import { ReportForm } from '../components/Reports/ReportForm'
import { EventForm } from '../components/Events/EventForm'
import { Nav } from '../components/UI/Nav'
import { useGlobeStore } from '../stores/globeStore'
import { geoJSONToCoords } from '../utils/geo'

export default function HomePage() {
  const { setSelectedMarker, openPanel } = useGlobeStore()
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [linkedReport, setLinkedReport] = useState(null)

  const handleReportClick = (report) => {
    setSelectedMarker({ ...report, type: 'report' })
    openPanel()
  }

  const handleEventClick = (event) => {
    setSelectedMarker({ ...event, type: 'event' })
    openPanel()
  }

  const handleCreateEventFromReport = (report) => {
    setLinkedReport(report)
    setEventModalOpen(true)
  }

  const reportCoords = linkedReport ? geoJSONToCoords(linkedReport.location) : null

  return (
    <div className="w-screen h-screen bg-brand-blue overflow-hidden relative">
      <Nav />

      <div className="w-full h-full">
        <GlobeView onReportClick={handleReportClick} onEventClick={handleEventClick} />
      </div>

      <DetailPanel onCreateEvent={handleCreateEventFromReport} />

      {/* Floating action buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <button
          onClick={() => setEventModalOpen(true)}
          className="bg-brand-teal hover:bg-brand-green text-white font-semibold px-4 py-2 rounded-full shadow-lg transition-colors text-sm"
        >
          + Event
        </button>
        <button
          onClick={() => setReportModalOpen(true)}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-full shadow-lg transition-colors text-sm"
        >
          + Report
        </button>
      </div>

      <Modal open={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Submit Litter Report">
        <ReportForm onSuccess={() => setReportModalOpen(false)} />
      </Modal>

      <Modal
        open={eventModalOpen}
        onClose={() => { setEventModalOpen(false); setLinkedReport(null) }}
        title="Create Cleanup Event"
      >
        <EventForm
          defaultLat={reportCoords?.lat}
          defaultLng={reportCoords?.lng}
          defaultLocationLabel={linkedReport?.location_label}
          linkedReportId={linkedReport?.id}
          onSuccess={() => { setEventModalOpen(false); setLinkedReport(null) }}
        />
      </Modal>
    </div>
  )
}
