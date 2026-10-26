<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, User, Lock, Mail, Eye, EyeOff, Shield, Zap, Globe } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'

const router = useRouter()
const authStore = useAuthStore()
const { loading } = storeToRefs(authStore)

const isSignUp = ref(false)
const showPassword = ref(false)

const form = ref({
    name: '',
    email: '',
    password: ''
})

const toggleMode = () => {
    isSignUp.value = !isSignUp.value
    form.value = { name: '', email: '', password: '' }
}

const handleSubmit = async () => {
    try {
        if (isSignUp.value) {
           await authStore.register({
               username: form.value.name,
               email: form.value.email,
               password: form.value.password
           })
        } else {
           await authStore.login({
               email: form.value.email,
               password: form.value.password
           })
        }
        
        // Redirect to Dashboard
        router.push('/dashboard')
    } catch (err) {
        alert(err.message || 'Authentication failed')
    }
}

const handleGoogleLogin = () => {
    alert('⚠️ “Continue with Google” is temporarily unavailable. Please use your email and password to log in for now.')
}
</script>

<template>
  <div class="min-h-screen w-full bg-[#050510] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-neon-blue/30 selection:text-neon-cyan">
    
    <!-- Cinematic Background -->
    <div class="fixed inset-0 z-0 pointer-events-none">
        <!-- Grid -->
        <div class="absolute inset-0 opacity-20" 
             style="background-image: linear-gradient(rgba(46, 134, 222, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(46, 134, 222, 0.1) 1px, transparent 1px); background-size: 50px 50px; mask-image: radial-gradient(circle at center, black 40%, transparent 100%);">
        </div>
        <!-- Orbs -->
        <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-purple/10 rounded-full blur-[120px] animate-pulse-slow" style="animation-delay: -3s"></div>
    </div>

    <!-- Back Button (Floating) -->
    <button @click="router.push('/')" class="absolute top-6 left-6 md:top-8 md:left-8 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white transition-all z-50 group backdrop-blur-md">
        <ArrowLeft :size="20" class="group-hover:-translate-x-1 transition-transform" />
    </button>

    <!-- Main Card Container -->
    <div class="w-full max-w-5xl h-auto min-h-[600px] md:h-[700px] bg-[#0a0a12]/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl relative z-10 flex overflow-hidden animate-fade-in-up">
        
        <!-- Left Side: Visuals (Desktop Only) -->
        <div class="hidden md:flex w-5/12 relative flex-col justify-between p-10 overflow-hidden group">
            <!-- Dynamic Gradient Overlay -->
            <div class="absolute inset-0 bg-gradient-to-br from-neon-blue/20 via-transparent to-neon-purple/20 opacity-50 group-hover:scale-105 transition-transform duration-[20s] ease-in-out"></div>
            <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 grayscale"></div>

            <!-- Content -->
            <div class="relative z-10">
                <div class="flex items-center gap-3 mb-8">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-neon-blue to-neon-purple flex items-center justify-center shadow-lg shadow-neon-blue/20">
                        <img src="@/assets/logo.png" alt="Logo" class="w-6 h-6 object-contain brightness-200" />
                    </div>
                    <span class="text-xl font-bold tracking-tight">ShareSyntax</span>
                </div>

                <div class="space-y-6 mt-20">
                    <h2 class="text-4xl font-bold leading-tight">
                        <span class="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Collaborate without</span>
                        <br />
                        <span class="text-neon-cyan">Boundaries.</span>
                    </h2>
                    <p class="text-gray-400 text-lg leading-relaxed max-w-sm">
                        Experience real-time code sharing with zero latency. Secure, fast, and developer-focused.
                    </p>
                </div>
            </div>

            <!-- Features -->
            <div class="relative z-10 space-y-4">
                <div class="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                    <div class="p-2 rounded-lg bg-neon-blue/10 text-neon-blue"><Shield :size="20"/></div>
                    <div>
                        <div class="font-bold text-sm">End-to-End Encrypted</div>
                        <div class="text-xs text-gray-500">Your data never leaves your device unencrypted</div>
                    </div>
                </div>
                <div class="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                    <div class="p-2 rounded-lg bg-neon-purple/10 text-neon-purple"><Zap :size="20"/></div>
                    <div>
                        <div class="font-bold text-sm">Lightning Fast</div>
                        <div class="text-xs text-gray-500">P2P technology for instant file transfer</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Side: Form -->
        <div class="w-full md:w-7/12 bg-[#050510]/80 md:bg-transparent flex flex-col justify-center p-8 md:p-16 relative">
             <!-- Mobile Logo (Hidden on Desktop) -->
            <div class="md:hidden flex flex-col items-center mb-10">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-neon-blue to-neon-purple flex items-center justify-center shadow-lg shadow-neon-blue/20 mb-4">
                    <img src="@/assets/logo.png" alt="Logo" class="w-7 h-7 object-contain brightness-200" />
                </div>
                <h1 class="text-2xl font-bold">ShareSyntax</h1>
            </div>

            <div class="max-w-md mx-auto w-full">
                <!-- Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold mb-2">{{ isSignUp ? 'Create Account' : 'Welcome Back' }}</h1>
                    <p class="text-gray-400">{{ isSignUp ? 'Enter your details to get started.' : 'Enter your details to access your workspace.' }}</p>
                </div>

                <!-- Social Login -->
                <button 
                    @click="handleGoogleLogin"
                    class="w-full py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-3 mb-6 shadow-lg shadow-black/20 transform active:scale-[0.99]"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5" alt="Google" />
                    <span>Continue with Google</span>
                </button>

                <div class="relative flex py-2 items-center mb-6">
                    <div class="flex-grow border-t border-white/10"></div>
                    <span class="flex-shrink mx-4 text-gray-500 text-xs uppercase tracking-widest">Or</span>
                    <div class="flex-grow border-t border-white/10"></div>
                </div>

                <!-- Form Container with Transition -->
                <Transition name="fade-scale" mode="out-in">
                    <div :key="isSignUp ? 'signup' : 'signin'" class="w-full">
                        <form @submit.prevent="handleSubmit" class="space-y-5">
                            <div v-if="isSignUp" class="space-y-1.5 animate-fade-in-down">
                                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                                <div class="relative group">
                                    <User :size="18" class="absolute left-4 top-4 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
                                    <input 
                                        v-model="form.name"
                                        required
                                        type="text" 
                                        class="w-full bg-[#151520] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-neon-blue/50 focus:bg-[#1a1a25] transition-all placeholder:text-gray-600"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                                <div class="relative group">
                                    <Mail :size="18" class="absolute left-4 top-4 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
                                    <input 
                                        v-model="form.email"
                                        required
                                        type="email" 
                                        class="w-full bg-[#151520] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-neon-blue/50 focus:bg-[#1a1a25] transition-all placeholder:text-gray-600"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>

                            <div class="space-y-1.5">
                                <div class="flex justify-between items-center ml-1">
                                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                                    <a v-if="!isSignUp" href="#" class="text-xs text-neon-blue hover:text-neon-cyan transition-colors">Forgot?</a>
                                </div>
                                <div class="relative group">
                                    <Lock :size="18" class="absolute left-4 top-4 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
                                    <input 
                                        v-model="form.password"
                                        required
                                        :type="showPassword ? 'text' : 'password'"
                                        class="w-full bg-[#151520] border border-white/5 rounded-xl py-3.5 pl-12 pr-12 text-white focus:outline-none focus:border-neon-blue/50 focus:bg-[#1a1a25] transition-all placeholder:text-gray-600"
                                        placeholder="••••••••"
                                    />
                                    <button type="button" @click="showPassword = !showPassword" class="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors">
                                        <component :is="showPassword ? EyeOff : Eye" :size="18" />
                                    </button>
                                </div>
                            </div>

                            <!-- Submit Button -->
                            <button 
                                type="submit" 
                                :disabled="loading"
                                class="w-full py-4 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold text-lg shadow-lg shadow-neon-blue/20 hover:shadow-neon-blue/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                            >
                                <span v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                <span>{{ isSignUp ? 'Create Account' : 'Sign In' }}</span>
                            </button>
                        </form>
                    </div>
                </Transition>

                <!-- Toggle -->
                <div class="mt-8 text-center">
                    <p class="text-gray-400 text-sm">
                        {{ isSignUp ? 'Already a member?' : 'New to ShareSyntax?' }}
                        <button @click="toggleMode" class="text-white font-bold hover:text-neon-cyan ml-1 transition-colors relative group">
                            {{ isSignUp ? 'Sign In' : 'Create Account' }}
                            <span class="absolute -bottom-1 left-0 w-0 h-0.5 bg-neon-cyan transition-all group-hover:w-full"></span>
                        </button>
                    </p>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse-slow {
  animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.1; }
  50% { opacity: 0.3; }
}

.animate-fade-in-up {
    animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Form Switch Transitions */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(1.05);
}
</style>
