import { Routes, Route, Navigate } from 'react-router-dom'
import { BottomNav } from '../components/layout/BottomNav'
import { Header } from '../components/layout/Header'
import { Dashboard } from '../components/invite/Dashboard'
import { Laurapiades } from '../components/invite/Laurapiades'
import { RolesTab } from '../components/admin/general/RolesTab'
import { EventsTab } from '../components/admin/general/EventsTab'
import { BonusTab } from '../components/admin/general/BonusTab'
import { EpreuvesTab } from '../components/admin/jeux/EpreuvesTab'
import { ClassementTab } from '../components/admin/jeux/ClassementTab'
import { CatalogueTab } from '../components/admin/ventes/CatalogueTab'
import { DepenseTab } from '../components/admin/ventes/DepenseTab'
import type { Profile, UserRole } from '../types'

interface HomeProps {
  profile: Profile
  coinPhotoUrl?: string | null
  onProfileUpdate: (p: Profile) => void
}

function canAccess(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole)
}

interface GuardedRouteProps {
  profile: Profile
  requiredRoles: UserRole[]
  element: React.ReactElement
}

function GuardedRoute({ profile, requiredRoles, element }: GuardedRouteProps) {
  if (!canAccess(profile.role, requiredRoles)) {
    return <Navigate to="/" replace />
  }
  return element
}

export function Home({ profile, coinPhotoUrl, onProfileUpdate }: HomeProps) {
  return (
    <div className="min-h-screen bg-bg-main">
      <div className="mx-auto max-w-mobile min-h-screen relative">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Header
                  title="25.5 de Laura"
                  subtitle={`Bonjour ${profile.prenom} !`}
                  profilePhotoUrl={profile.photo_url}
                  profilePrenom={profile.prenom}
                />
                <Dashboard
                  profile={profile}
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

          {/* Admin général */}
          <Route
            path="/admin/roles"
            element={
              <GuardedRoute
                profile={profile}
                requiredRoles={['admin_general']}
                element={
                  <>
                    <Header title="👑 Rôles" />
                    <RolesTab />
                  </>
                }
              />
            }
          />
          <Route
            path="/admin/events"
            element={
              <GuardedRoute
                profile={profile}
                requiredRoles={['admin_general']}
                element={
                  <>
                    <Header title="🎪 Événements" />
                    <EventsTab />
                  </>
                }
              />
            }
          />
          <Route
            path="/admin/bonus"
            element={
              <GuardedRoute
                profile={profile}
                requiredRoles={['admin_general']}
                element={
                  <>
                    <Header title="⚡ Bonus / Malus" />
                    <BonusTab />
                  </>
                }
              />
            }
          />

          {/* Admin jeux */}
          <Route
            path="/admin/epreuves"
            element={
              <GuardedRoute
                profile={profile}
                requiredRoles={['admin_jeux', 'admin_general']}
                element={
                  <>
                    <Header title="🎮 Épreuves" />
                    <EpreuvesTab />
                  </>
                }
              />
            }
          />
          <Route
            path="/admin/classement"
            element={
              <GuardedRoute
                profile={profile}
                requiredRoles={['admin_jeux', 'admin_general']}
                element={
                  <>
                    <Header title="📊 Classement" />
                    <ClassementTab />
                  </>
                }
              />
            }
          />

          {/* Admin ventes */}
          <Route
            path="/admin/depense"
            element={
              <GuardedRoute
                profile={profile}
                requiredRoles={['admin_ventes', 'admin_general']}
                element={
                  <>
                    <Header title="🛒 Dépense" />
                    <DepenseTab />
                  </>
                }
              />
            }
          />
          <Route
            path="/admin/catalogue"
            element={
              <GuardedRoute
                profile={profile}
                requiredRoles={['admin_ventes', 'admin_general']}
                element={
                  <>
                    <Header title="📦 Catalogue" />
                    <CatalogueTab />
                  </>
                }
              />
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav role={profile.role} />
      </div>
    </div>
  )
}
