interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-bg-main border-b border-border px-4 py-3">
      <h1 className="font-bangers text-purple-dark text-2xl tracking-wide leading-none">
        {title}
      </h1>
      {subtitle && (
        <p className="font-nunito text-purple-mid text-sm">{subtitle}</p>
      )}
    </header>
  )
}
