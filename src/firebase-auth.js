import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    User
} from 'firebase/auth';
import firebaseConfig from './firebase-config.js';

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

class FirebaseAuth {
    constructor() {
        this.auth = auth;
        this.googleProvider = googleProvider;
        this.user = null;
        this.listeners = [];

        // 인증 상태 변경 리스너 설정
        this.setupAuthListener();
    }

    setupAuthListener() {
        onAuthStateChanged(this.auth, (user) => {
            this.user = user;
            this.notifyListeners(user);

            // 로컬 스토리지에 사용자 정보 저장
            if (user) {
                localStorage.setItem('firebaseUser', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified
                }));
            } else {
                localStorage.removeItem('firebaseUser');
            }
        });
    }

    // Google 로그인
    async signInWithGoogle() {
        try {
            const result = await signInWithPopup(this.auth, this.googleProvider);
            return result.user;
        } catch (error) {
            console.error('Google sign-in error:', error);
            throw error;
        }
    }

    // 이메일/비밀번호 로그인
    async signInWithEmail(email, password) {
        try {
            const result = await signInWithEmailAndPassword(this.auth, email, password);
            return result.user;
        } catch (error) {
            console.error('Email sign-in error:', error);
            throw error;
        }
    }

    // 이메일/비밀번호 회원가입
    async signUpWithEmail(email, password) {
        try {
            const result = await createUserWithEmailAndPassword(this.auth, email, password);
            return result.user;
        } catch (error) {
            console.error('Email sign-up error:', error);
            throw error;
        }
    }

    // 비밀번호 재설정 이메일 발송
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(this.auth, email);
            return true;
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }

    // 로그아웃
    async signOut() {
        try {
            await signOut(this.auth);
            return true;
        } catch (error) {
            console.error('Sign-out error:', error);
            throw error;
        }
    }

    // 현재 사용자 정보 가져오기
    getCurrentUser() {
        return this.user;
    }

    // 로컬 스토리지에서 사용자 정보 가져오기
    getUserFromLocalStorage() {
        const userStr = localStorage.getItem('firebaseUser');
        if (userStr) {
            return JSON.parse(userStr);
        }
        return null;
    }

    // 인증 상태 리스너 추가
    onAuthStateChanged(callback) {
        this.listeners.push(callback);
        if (this.user) {
            callback(this.user);
        }
    }

    // 리스너에게 알림
    notifyListeners(user) {
        this.listeners.forEach(callback => callback(user));
    }

    // 사용자가 로그인되어 있는지 확인
    isLoggedIn() {
        return !!this.user;
    }

    // 이메일 인증 여부 확인
    isEmailVerified() {
        return this.user && this.user.emailVerified;
    }
}

// 전역 인스턴스 생성
const firebaseAuth = new FirebaseAuth();

export default firebaseAuth;