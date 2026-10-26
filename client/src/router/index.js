import { createRouter, createWebHistory } from 'vue-router'
// We'll lazy load views
const Home = () => import('../views/Home.vue')

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: Home,
            meta: { title: 'ShareSyntax | Free Collaborative Code Editor & Text Share' }
        },
        {
            path: '/join/:id',
            name: 'join',
            component: Home,
            meta: { title: 'Join Room | ShareSyntax' }
        },
        {
            path: '/auth',
            name: 'auth',
            component: () => import('../views/AuthView.vue'),
            meta: { title: 'Login or Sign Up | ShareSyntax' }
        },
        {
            path: '/login',
            redirect: '/auth'
        },
        {
            path: '/dashboard',
            name: 'dashboard',
            component: () => import('../views/DashboardView.vue'),
            meta: { requiresAuth: true, title: 'My Projects | ShareSyntax' }
        },
        {
            // Catch-all route to fix 404s for invalid addresses
            path: '/:pathMatch(.*)*',
            redirect: '/'
        }
    ]
})

// Delay store initialization until router needs it to avoid circular dependency
let authStore = null

router.beforeEach((to, from, next) => {
    // Only import the store conditionally to prevent setup circularity
    if (!authStore) {
        import('@/stores/auth').then(m => {
            authStore = m.useAuthStore()
            runAuthCheck(to, next)
        })
    } else {
        runAuthCheck(to, next)
    }
})

function runAuthCheck(to, next) {
    // Token is stored in localStorage by the store, but we can also use Pinia
    const token = localStorage.getItem('token') || authStore?.token
    if (to.meta.requiresAuth && !token) {
        next('/auth')
    } else {
        next()
    }
}

router.afterEach((to) => {
    // Set dynamic page title
    document.title = to.meta.title || 'ShareSyntax - Real-time Collaborative Code Editor & Text Share'
})

export default router
