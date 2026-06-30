import cn from 'clsx'

export function DescriptionList({ className, ...props }: React.ComponentPropsWithoutRef<'dl'>) {
  return (
    <dl
      {...props}
      className={cn(
        className,
        'grid grid-cols-1 text-base/6 sm:grid-cols-[min(50%,--spacing(80))_auto] sm:text-sm/6'
      )}
    />
  )
}

export function DescriptionTerm({ className, ...props }: React.ComponentPropsWithoutRef<'dt'>) {
  return (
    <dt
      {...props}
      className={cn(
        className,
        'col-start-1 border-t border-zinc-950/5 pt-3 text-zinc-500 first:border-none dark:border-white/10 dark:text-zinc-400 sm:border-t sm:border-zinc-950/5 sm:py-3 sm:dark:border-white/5'
      )}
    />
  )
}

export function DescriptionDetails({ className, ...props }: React.ComponentPropsWithoutRef<'dd'>) {
  return (
    <dd
      {...props}
      className={cn(
        className,
        'pt-1 pb-3 text-zinc-950 dark:text-zinc-100 sm:border-t sm:border-zinc-950/5 sm:py-3 sm:nth-2:border-none sm:dark:border-white/5'
      )}
    />
  )
}
