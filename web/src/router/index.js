import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { noAuth: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { noAuth: true }
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    redirect: '/index',
    children: [
      { path: 'index', name: 'Index', component: () => import('../views/Index.vue') },
      { path: 'quiz', name: 'Quiz', component: () => import('../views/Quiz.vue') },
      { path: 'review', name: 'Review', component: () => import('../views/Review.vue') },
      { path: 'upload', name: 'Upload', component: () => import('../views/Upload.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (!to.meta.noAuth && !token) {
    next('/login')
  } else if (to.meta.noAuth && token) {
    next('/')
  } else {
    next()
  }
})

export default router
