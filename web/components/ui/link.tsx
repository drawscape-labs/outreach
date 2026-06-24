'use client'

/**
 * TODO: Update this component to use your client-side framework's link
 * component. We've provided examples of how to do this for Next.js, Remix, and
 * Inertia.js in the Catalyst documentation:
 *
 * https://catalyst.tailwindui.com/docs#client-side-router-integration
 */

import * as Headless from '@headlessui/react'
import NextLink from 'next/link'
import React, { forwardRef } from 'react'

function isExternalHref(href: string) {
  return /^(https?:\/\/|mailto:|tel:)/.test(href)
}

export const Link = forwardRef(function Link(
  props: React.ComponentPropsWithoutRef<typeof NextLink>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  const {children, prefetch = false, ...linkProps} = props
  const {href} = linkProps
  const externalHref =
    typeof href === 'string' && isExternalHref(href) ? href : null

  return (
    <Headless.DataInteractive>
      {externalHref ? (
        (() => {
          const {href: _href, ...anchorProps} = linkProps

          return (
            <a
              {...(anchorProps as React.ComponentPropsWithoutRef<'a'>)}
              href={externalHref}
              ref={ref}
            >
              {children}
            </a>
          )
        })()
      ) : (
        <NextLink {...linkProps} href={href} prefetch={prefetch} ref={ref}>
          {children}
        </NextLink>
      )}
    </Headless.DataInteractive>
  )
})
