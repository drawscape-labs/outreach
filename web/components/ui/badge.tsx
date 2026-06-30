import * as Headless from '@headlessui/react'
import cn from 'clsx'
import React, { forwardRef } from 'react'
import { TouchTarget } from './button'
import { Link } from './link'

const colors = {
  red: 'bg-red-500/15 text-red-700 group-data-hover:bg-red-500/25 dark:bg-red-400/10 dark:text-red-300 dark:group-data-hover:bg-red-400/20',
  orange:
    'bg-orange-500/15 text-orange-700 group-data-hover:bg-orange-500/25 dark:bg-orange-400/10 dark:text-orange-300 dark:group-data-hover:bg-orange-400/20',
  amber:
    'bg-amber-400/20 text-amber-700 group-data-hover:bg-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300 dark:group-data-hover:bg-amber-400/20',
  yellow:
    'bg-yellow-400/20 text-yellow-700 group-data-hover:bg-yellow-400/30 dark:bg-yellow-400/10 dark:text-yellow-300 dark:group-data-hover:bg-yellow-400/20',
  lime: 'bg-lime-400/20 text-lime-700 group-data-hover:bg-lime-400/30 dark:bg-lime-400/10 dark:text-lime-300 dark:group-data-hover:bg-lime-400/20',
  green:
    'bg-green-500/15 text-green-700 group-data-hover:bg-green-500/25 dark:bg-green-400/10 dark:text-green-300 dark:group-data-hover:bg-green-400/20',
  emerald:
    'bg-emerald-500/15 text-emerald-700 group-data-hover:bg-emerald-500/25 dark:bg-emerald-400/10 dark:text-emerald-300 dark:group-data-hover:bg-emerald-400/20',
  teal: 'bg-teal-500/15 text-teal-700 group-data-hover:bg-teal-500/25 dark:bg-teal-400/10 dark:text-teal-300 dark:group-data-hover:bg-teal-400/20',
  cyan: 'bg-cyan-400/20 text-cyan-700 group-data-hover:bg-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300 dark:group-data-hover:bg-cyan-400/20',
  sky: 'bg-sky-500/15 text-sky-700 group-data-hover:bg-sky-500/25 dark:bg-sky-400/10 dark:text-sky-300 dark:group-data-hover:bg-sky-400/20',
  blue: 'bg-blue-500/15 text-blue-700 group-data-hover:bg-blue-500/25 dark:bg-blue-400/10 dark:text-blue-300 dark:group-data-hover:bg-blue-400/20',
  indigo:
    'bg-indigo-500/15 text-indigo-700 group-data-hover:bg-indigo-500/25 dark:bg-indigo-400/10 dark:text-indigo-300 dark:group-data-hover:bg-indigo-400/20',
  violet:
    'bg-violet-500/15 text-violet-700 group-data-hover:bg-violet-500/25 dark:bg-violet-400/10 dark:text-violet-300 dark:group-data-hover:bg-violet-400/20',
  purple:
    'bg-purple-500/15 text-purple-700 group-data-hover:bg-purple-500/25 dark:bg-purple-400/10 dark:text-purple-300 dark:group-data-hover:bg-purple-400/20',
  fuchsia:
    'bg-fuchsia-400/15 text-fuchsia-700 group-data-hover:bg-fuchsia-400/25 dark:bg-fuchsia-400/10 dark:text-fuchsia-300 dark:group-data-hover:bg-fuchsia-400/20',
  pink: 'bg-pink-400/15 text-pink-700 group-data-hover:bg-pink-400/25 dark:bg-pink-400/10 dark:text-pink-300 dark:group-data-hover:bg-pink-400/20',
  rose: 'bg-rose-400/15 text-rose-700 group-data-hover:bg-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300 dark:group-data-hover:bg-rose-400/20',
  zinc: 'bg-zinc-600/10 text-zinc-700 group-data-hover:bg-zinc-600/20 dark:bg-white/10 dark:text-zinc-300 dark:group-data-hover:bg-white/20',
}

type BadgeProps = { color?: keyof typeof colors }

export function Badge({ color = 'zinc', className, ...props }: BadgeProps & React.ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      {...props}
      className={cn(
        className,
        'inline-flex items-center gap-x-1.5 rounded-md px-1.5 py-0.5 text-sm/5 font-medium sm:text-xs/5 forced-colors:outline',
        colors[color]
      )}
    />
  )
}

export const BadgeButton = forwardRef(function BadgeButton(
  {
    color = 'zinc',
    className,
    children,
    ...props
  }: BadgeProps & { className?: string; children: React.ReactNode } & (
      | Omit<Headless.ButtonProps, 'as' | 'className'>
      | Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>
    ),
  ref: React.ForwardedRef<HTMLElement>
) {
  const classes = cn(
    className,
    'group relative inline-flex rounded-md focus:not-data-focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500'
  )

  return 'href' in props ? (
    <Link {...props} className={classes} ref={ref as React.ForwardedRef<HTMLAnchorElement>}>
      <TouchTarget>
        <Badge color={color}>{children}</Badge>
      </TouchTarget>
    </Link>
  ) : (
    <Headless.Button {...props} className={classes} ref={ref}>
      <TouchTarget>
        <Badge color={color}>{children}</Badge>
      </TouchTarget>
    </Headless.Button>
  )
})
