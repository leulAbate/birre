interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="page-header-glass sticky top-0 z-10 flex items-center justify-between px-6 h-14">
      <div>
        <h1 className="text-sm font-semibold text-foreground tracking-tight">{title}</h1>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
