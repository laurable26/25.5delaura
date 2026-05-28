import { Routes, Route, Navigate } from 'react-router-dom'
import { BottomNav } from '../components/layout/BottomNav'
import { Header } from '../components/layout/Header'
import { Dashboard } from '../components/invite/Dashboard'
import { Laurapiades } from '../components/invite/Laurapiades'
import type { Profile, Event } from '../types'

interface HomeProps {
  profile: Profile
  events: Event[]
  coinPhotoUrl?: string | null
  onProfileUpdate: (p: Profile) => void
}

export function Home({ profile, events, coinPhotoUrl, onProfileUpdate }: HomeProps) {
  return (
    <div className="min-h-screen bg-bg-main">
      <div className="mx-auto max-w-mobile min-h-screen relative">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Header title="Blerham 🎪" subtitle={`Bonjour ${profile.prenom} !`} />
                <Dashboard
                  profile={profile}
                  events={events}
                  coinPhotoUrl={coinPhotoUrl}
                  onProfileUpdate={onProfileUpdate}
                />
              </>
            }
          />
          <Route
            path="/laurapiades"
            element={
              <>
                <Header title="Laurapiades 🏆" />
                <Laurapiades />
              </>
            }
          />
          <Route
            path="/profil"
            element={
              <>
                <Header title="Mon Profil" />
                <div className="flex flex-col items-center gap-6 px-4 pt-8 pb-28">
                  {profile.photo_url ? (
                    <img src={profile.photo_url} alt={profile.prenom} className="w-24 h-24 rounded-full object-cover border-4 border-yellow-fest" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-4xl">
                      {profile.prenom[0]}
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-bangers text-purple-dark text-3xl tracking-wide">{profile.prenom}</p>
                    <p className="font-nunito text-purple-mid text-sm mt-1 capitalize">{profile.role.replace('_', ' ')}</p>
                  </div>
                  <div className="w-full bg-white rounded-card border border-border p-4 text-center">
                    <p className="font-nunito text-purple-mid text-sm">Solde actuel</p>
                    <p className="font-bangers text-purple-dark text-4xl">{profile.solde} B</p>
                  </div>
                </div>
              </>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav role={profile.role} />
      </div>
    </div>
  )
}
