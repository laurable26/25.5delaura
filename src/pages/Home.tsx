import { Routes, Route, Navigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Dashboard } from '../components/invite/Dashboard'
import { Laurapiades } from '../components/invite/Laurapiades'
import { ProfilTab } from '../components/invite/ProfilTab'
import { RolesTab } from '../components/admin/general/RolesTab'
import { EventsTab } from '../components/admin/general/EventsTab'
import { BonusTab } from '../components/admin/general/BonusTab'
import { EpreuvesTab } from '../components/admin/jeux/EpreuvesTab'
import { ClassementTab } from '../components/admin/jeux/ClassementTab'
import { EquipesTab } from '../components/admin/jeux/EquipesTab'
import { CatalogueTab } from '../components/admin/ventes/CatalogueTab'
import { DepenseTab } from '../components/admin/ventes/DepenseTab'
import type { Profile, UserRole } from '../types'

interface HomeProps {
  profile: Profile
  coinPhotoUrl?: string | null
  onProfileUpdate: (p: Profile) => void
  onLogout: () => void
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

export function Home({ profile, coinPhotoUrl, onProfileUpdate, onLogout }: HomeProps) {
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
                <Header title="Laurapiades 🏆" showBack />
                <Laurapiades profile={profile} />
              </>
            }
          />
          <Route
            path="/profil"
            element={
              <>
                <Header title="Mon Profil" showBack />
                <ProfilTab profile={profile} onLogout={onLogout} />
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
                    <Header title="👑 Rôles" showBack />
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
                    <Header title="🎪 Événements" showBack />
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
                    <Header title="⚡ Bonus / Malus" showBack />
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
                    <Header title="🎮 Épreuves" showBack />
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
                    <Header title="📊 Classement" showBack />
                    <ClassementTab />
                  </>
                }
              />
            }
          />
          <Route
            path="/admin/equipes"
            element={
              <GuardedRoute
                profile={profile}
                requiredRoles={['admin_jeux', 'admin_general']}
                element={
                  <>
                    <Header title="👥 Équipes" showBack />
                    <EquipesTab />
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
                    <Header title="🛒 Dépense" showBack />
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
                    <Header title="📦 Catalogue" showBack />
                    <CatalogueTab />
                  </>
                }
              />
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
