import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

export const rootRoute = createRootRoute()

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <div className="p-4">Home (Feed)</div>,
})

export const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/map',
  component: () => <div className="p-4">Map View</div>,
})

export const questRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/quest/$id',
  component: () => <div className="p-4">Quest Details</div>,
})

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/$id',
  component: () => <div className="p-4">User Profile</div>,
})

export const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends',
  component: () => <div className="p-4">Friends List</div>,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  mapRoute,
  questRoute,
  profileRoute,
  friendsRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
