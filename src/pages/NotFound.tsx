import { href } from '@/lib/base'

export function NotFound() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-3xl font-black">404 — PAGE UNDER CONSTRUCTION</h1>
      <p>
        This page does not exist, or it exists and is under construction. Either way, please{' '}
        <a href={href('/guestbook/entries')}>sign my guestbook</a> and{' '}
        <a href={href('/')}>go home</a>.
      </p>
      <p className="blink">YOU ARE STILL IMPORTANT!!!</p>
    </div>
  )
}
