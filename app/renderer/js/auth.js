function waitForFirebase(callback, maxAttempts = 50) {
    let attempts = 0;

    const checkFirebase = () => {
        const firebaseGlobal = globalThis.firebase;

        if (firebaseGlobal && typeof firebaseGlobal.auth === 'function') {
            callback(firebaseGlobal);
        } else if (attempts < maxAttempts) {
            attempts += 1;
            setTimeout(checkFirebase, 100);
        } else {
            console.error('Firebase failed to load');
            const loadingState = document.getElementById('loadingState');
            if (loadingState) {
                loadingState.innerHTML = '<p class="text-red-600">Firebase 로딩 실패</p>';
            }
        }
    };

    checkFirebase();
}

waitForFirebase((firebase) => {
    console.log('Firebase loaded, initializing auth...');

    const firebaseConfig = {
        apiKey: "AIzaSyDxsV7stAOurueI85AL0-e1__izkBNtNpk",
        authDomain: "auto-navlog.firebaseapp.com",
        projectId: "auto-navlog",
        storageBucket: "auto-navlog.firebasestorage.app",
        messagingSenderId: "691469496655",
        appId: "1:691469496655:web:b4c2375317ad86c520153a",
        measurementId: "G-98TGSR7EY7",
    };

    if (!firebase.apps?.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    class FirebaseAuth {
        constructor() {
            this.auth = auth;
            this.googleProvider = googleProvider;
            this.user = null;
            this.listeners = [];
            this.setupAuthListener();
        }

        setupAuthListener() {
            this.auth.onAuthStateChanged((user) => {
                this.user = user;
                this.notifyListeners(user);

                if (user) {
                    localStorage.setItem('firebaseUser', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        emailVerified: user.emailVerified,
                    }));
                } else {
                    localStorage.removeItem('firebaseUser');
                }
            });
        }

        async signInWithGoogle() {
            try {
                const result = await this.auth.signInWithPopup(this.googleProvider);
                return result.user;
            } catch (error) {
                console.error('Google sign-in error:', error);
                throw error;
            }
        }

        async signInWithEmail(email, password) {
            try {
                const result = await this.auth.signInWithEmailAndPassword(email, password);
                return result.user;
            } catch (error) {
                console.error('Email sign-in error:', error);
                throw error;
            }
        }

        async signUpWithEmail(email, password) {
            try {
                const result = await this.auth.createUserWithEmailAndPassword(email, password);
                return result.user;
            } catch (error) {
                console.error('Email sign-up error:', error);
                throw error;
            }
        }

        async resetPassword(email) {
            try {
                await this.auth.sendPasswordResetEmail(email);
                return true;
            } catch (error) {
                console.error('Password reset error:', error);
                throw error;
            }
        }

        async signOut() {
            try {
                await this.auth.signOut();
                return true;
            } catch (error) {
                console.error('Sign-out error:', error);
                throw error;
            }
        }

        getCurrentUser() {
            return this.auth.currentUser;
        }

        getUserFromLocalStorage() {
            const userStr = localStorage.getItem('firebaseUser');
            if (userStr) {
                return JSON.parse(userStr);
            }
            return null;
        }

        onAuthStateChanged(callback) {
            this.listeners.push(callback);
            if (this.auth.currentUser) {
                callback(this.auth.currentUser);
            }
        }

        notifyListeners(user) {
            this.listeners.forEach((callback) => callback(user));
        }

        isLoggedIn() {
            return !!this.auth.currentUser;
        }

        isEmailVerified() {
            return this.auth.currentUser && this.auth.currentUser.emailVerified;
        }
    }

    class AuthApp {
        constructor() {
            this.auth = null;
            this.authMode = 'login';
            this.deferRedirect = false;
            this.pendingUser = null;
            this.init();
        }

        async init() {
            try {
                console.log('Initializing Firebase Auth...');

                const params = new URLSearchParams(window.location.search);
                if (params.get('logout') === '1') {
                    try {
                        await firebase.auth().signOut();
                        params.delete('logout');
                        const cleanQuery = params.toString();
                        const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}`;
                        window.history.replaceState({}, document.title, cleanUrl);
                        console.log('Firebase session cleared due to logout flag');
                    } catch (logoutError) {
                        console.warn('Failed to sign out during logout flow:', logoutError);
                    }
                }

                this.auth = new FirebaseAuth();

                const currentUser = this.auth.getCurrentUser();
                if (currentUser) {
                    console.log('User already logged in, redirecting to main app...');
                    this.redirectToMainApp();
                    return;
                }

                this.auth.onAuthStateChanged((user) => {
                    if (user) {
                        if (this.deferRedirect) {
                            console.log('User logged in, waiting for onboarding confirmation...');
                            this.pendingUser = user;
                            this.showWelcomeState(user);
                            return;
                        }

                        console.log('User logged in, redirecting to main app...');
                        this.redirectToMainApp();
                    } else {
                        this.deferRedirect = false;
                        this.pendingUser = null;
                        this.showAuthForm();
                    }
                });

                this.setupEventListeners();

                console.log('Firebase Auth initialized successfully');
            } catch (error) {
                console.error('Firebase Auth initialization error:', error);
                this.showMessage('인증 시스템을 초기화할 수 없습니다.', 'error');
            }
        }

        setupEventListeners() {
            document.getElementById('googleSignInBtn')?.addEventListener('click', () => {
                this.handleGoogleSignIn();
            });

            document.getElementById('emailAuthForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEmailAuth();
            });

            document.getElementById('authModeSwitch')?.addEventListener('click', () => {
                this.switchAuthMode();
            });

            document.getElementById('forgotPasswordBtn')?.addEventListener('click', () => {
                this.handleForgotPassword();
            });

            document.getElementById('resendVerificationBtn')?.addEventListener('click', () => {
                this.handleResendVerification();
            });

            document.getElementById('backToLoginBtn')?.addEventListener('click', () => {
                this.resetToLogin();
            });

            document.getElementById('goToAppBtn')?.addEventListener('click', () => {
                this.redirectToMainApp();
            });
        }

        async handleGoogleSignIn() {
            try {
                this.showLoading();
                console.log('Starting Google sign in...');
                const user = await this.auth.signInWithGoogle();
                console.log('Google sign in successful:', user);
            } catch (error) {
                console.error('Google sign in error:', error);
                this.showMessage('Google 로그인에 실패했습니다.', 'error');
                this.hideLoading();
            }
        }

        async handleEmailAuth() {
            try {
                this.showLoading();
                const email = document.getElementById('emailInput')?.value;
                const password = document.getElementById('passwordInput')?.value;

                if (!email || !password) {
                    this.showMessage('이메일과 비밀번호를 입력해주세요.', 'error');
                    this.hideLoading();
                    return;
                }

                if (this.authMode === 'signup') {
                    this.deferRedirect = true;
                    const confirmPassword = document.getElementById('confirmPasswordInput')?.value;
                    if (password !== confirmPassword) {
                        this.showMessage('비밀번호가 일치하지 않습니다.', 'error');
                        this.hideLoading();
                        this.deferRedirect = false;
                        return;
                    }
                    if (password.length < 6) {
                        this.showMessage('비밀번호는 6자 이상이어야 합니다.', 'error');
                        this.hideLoading();
                        this.deferRedirect = false;
                        return;
                    }

                    console.log('Starting sign up...');
                    const user = await this.auth.signUpWithEmail(email, password);
                    try {
                        await user?.sendEmailVerification();
                    } catch (sendError) {
                        console.error('Send verification email error:', sendError);
                    }
                    this.showWelcomeState(user);
                } else {
                    console.log('Starting sign in...');
                    await this.auth.signInWithEmail(email, password);
                }
            } catch (error) {
                console.error('Email auth error:', error);
                this.deferRedirect = false;
                let message = '인증에 실패했습니다.';

                if (error.code === 'auth/user-not-found') {
                    message = '가입되지 않은 이메일입니다.';
                } else if (error.code === 'auth/wrong-password') {
                    message = '비밀번호가 올바르지 않습니다.';
                } else if (error.code === 'auth/email-already-in-use') {
                    message = '이미 사용 중인 이메일입니다.';
                } else if (error.code === 'auth/weak-password') {
                    message = '비밀번호는 6자 이상이어야 합니다.';
                }

                this.showMessage(message, 'error');
                this.hideLoading();
            }
        }

        showWelcomeState(user) {
            this.deferRedirect = true;
            this.pendingUser = user || null;

            this.hideAllStates();
            this.hideMessage();

            const onboardingState = document.getElementById('onboardingState');
            const socialContainer = document.getElementById('socialAuthContainer');
            const emailForm = document.getElementById('emailAuthForm');
            const switchContainer = document.getElementById('authModeSwitchContainer');
            const forgotContainer = document.getElementById('forgotPasswordContainer');

            socialContainer?.classList.add('hidden');
            emailForm?.classList.add('hidden');
            switchContainer?.classList.add('hidden');
            forgotContainer?.classList.add('hidden');

            if (onboardingState) {
                onboardingState.classList.remove('hidden');
            }

            this.updateOnboardingInfo(`${user?.email || '등록한 이메일'}로 인증 메일을 보냈습니다.`, 'info');

            document.getElementById('authForm')?.classList.remove('hidden');
            this.hideLoading();
        }

        updateOnboardingInfo(message, type = 'info') {
            const info = document.getElementById('onboardingEmailInfo');
            const text = document.getElementById('onboardingEmailText');

            if (!info || !text) {
                return;
            }

            if (!message) {
                info.className = 'alert alert-info hidden';
                info.classList.add('hidden');
                text.textContent = '';
                return;
            }

            const variant = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info';
            info.className = `alert alert-${variant}`;
            info.classList.remove('hidden');
            text.textContent = message;
        }

        async handleResendVerification(user) {
            try {
                const authInstance = this.auth?.auth || (typeof firebase !== 'undefined' ? firebase.auth() : null);
                const targetUser = user || this.pendingUser || authInstance?.currentUser;
                if (!targetUser) {
                    this.updateOnboardingInfo('현재 로그인된 사용자가 없어 인증 메일을 보낼 수 없습니다.', 'error');
                    return;
                }

                this.updateOnboardingInfo(`${targetUser.email || '등록한 이메일'}로 인증 메일을 다시 보내는 중입니다...`, 'info');
                await targetUser.sendEmailVerification();
                this.updateOnboardingInfo(`${targetUser.email || '등록한 이메일'}로 인증 메일을 다시 보냈습니다.`, 'success');
            } catch (error) {
                console.error('Resend verification error:', error);
                this.updateOnboardingInfo('인증 메일을 다시 보내지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
            }
        }

        async resetToLogin() {
            this.deferRedirect = false;
            this.pendingUser = null;

            try {
                await this.auth.signOut();
            } catch (error) {
                console.error('Sign out before returning to login failed:', error);
            }

            this.hideAllStates();

            document.getElementById('socialAuthContainer')?.classList.remove('hidden');
            document.getElementById('emailAuthForm')?.classList.remove('hidden');
            document.getElementById('authModeSwitchContainer')?.classList.remove('hidden');
            document.getElementById('forgotPasswordContainer')?.classList.remove('hidden');

            const emailInput = document.getElementById('emailInput');
            const passwordInput = document.getElementById('passwordInput');
            const confirmInput = document.getElementById('confirmPasswordInput');
            if (emailInput) emailInput.value = '';
            if (passwordInput) passwordInput.value = '';
            if (confirmInput) confirmInput.value = '';

            this.authMode = 'login';
            this.updateAuthForm();
            this.showAuthForm();
            this.hideMessage();
        }

        hideAllStates() {
            document.getElementById('loadingState')?.classList.add('hidden');
            document.getElementById('onboardingState')?.classList.add('hidden');
            document.getElementById('authMessage')?.classList.add('hidden');
            this.updateOnboardingInfo('', 'info');
        }

        async handleForgotPassword() {
            try {
                const email = document.getElementById('emailInput')?.value;
                if (!email) {
                    this.showMessage('이메일을 입력해주세요.', 'error');
                    return;
                }

                this.showLoading();
                await this.auth.resetPassword(email);
                this.showMessage('비밀번호 재설정 이메일을 발송했습니다.', 'success');
                this.hideLoading();
            } catch (error) {
                console.error('Forgot password error:', error);
                this.showMessage('비밀번호 재설정 이메일 발송에 실패했습니다.', 'error');
                this.hideLoading();
            }
        }

        switchAuthMode() {
            this.authMode = this.authMode === 'login' ? 'signup' : 'login';
            this.updateAuthForm();
        }

        updateAuthForm() {
            const submitBtn = document.getElementById('authSubmitBtn');
            const confirmPasswordDiv = document.getElementById('confirmPasswordDiv');
            const authModeText = document.getElementById('authModeText');
            const authModeSwitch = document.getElementById('authModeSwitch');

            if (this.authMode === 'signup') {
                if (submitBtn) submitBtn.textContent = '회원가입';
                confirmPasswordDiv?.classList.remove('hidden');
                if (authModeText) authModeText.textContent = '이미 계정이 있으신가요?';
                if (authModeSwitch) authModeSwitch.textContent = '로그인';
            } else {
                if (submitBtn) submitBtn.textContent = '로그인';
                confirmPasswordDiv?.classList.add('hidden');
                if (authModeText) authModeText.textContent = '계정이 없으신가요?';
                if (authModeSwitch) authModeSwitch.textContent = '회원가입';
            }

            this.hideMessage();
        }

        showAuthForm() {
            document.getElementById('loadingState')?.classList.add('hidden');
            document.getElementById('authForm')?.classList.remove('hidden');
        }

        showLoading() {
            document.getElementById('authForm')?.classList.add('hidden');
            document.getElementById('loadingState')?.classList.remove('hidden');
        }

        hideLoading() {
            document.getElementById('loadingState')?.classList.add('hidden');
            document.getElementById('authForm')?.classList.remove('hidden');
        }

        showMessage(message, type = 'info') {
            const messageDiv = document.getElementById('authMessage');
            const messageText = document.getElementById('messageText');
            const alertBox = document.getElementById('alertBox');

            if (messageDiv && messageText && alertBox) {
                messageText.textContent = message;
                messageDiv.classList.remove('hidden');
                alertBox.className = `alert alert-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}`;
            }
        }

        hideMessage() {
            document.getElementById('authMessage')?.classList.add('hidden');
        }

        redirectToMainApp() {
            this.deferRedirect = false;
            this.pendingUser = null;
            localStorage.setItem('firebaseAuth', 'true');
            window.location.href = 'index.html';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing auth app...');
        new AuthApp();
    });
});
