import { useTheme } from '../../context/ThemeContext.jsx'
import SidebarContent from './SidebarContent.jsx'
import logoCharcoal from '../../assets/logo/DANN-logo-charcoal.webp'
import logoTerracotta from '../../assets/logo/DANN-logo-terracotta.webp'

// Desktop sidebar: the logo, then SidebarContent (shared with the mobile
// drawer). The account menu that used to sit at the bottom now lives behind
// the avatar in the top bar.
export default function Sidebar({ onOpenSearch }) {
  const { theme } = useTheme()
  const logo = theme === 'dark' ? logoTerracotta : logoCharcoal

  return (
    <aside
      className="
        hidden
        md:sticky md:top-0 md:flex
        md:h-screen md:w-56
        md:flex-shrink-0 md:self-start
        md:flex-col
        md:bg-[var(--color-paper-light)]
        md:p-4
        lg:w-64
      "
    >
      <div className="mb-6 px-2">
        <img
          src={logo}
          alt="DANN"
          className="h-9 w-auto object-contain lg:h-12 xl:h-14"
        />
      </div>

      <SidebarContent onOpenSearch={onOpenSearch} />
    </aside>
  )
}