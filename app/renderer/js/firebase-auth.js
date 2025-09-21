(function () {
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded.');
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyDxsV7stAOurueI85AL0-e1__izkBNtNpk",
    authDomain: "auto-navlog.firebaseapp.com",
    projectId: "auto-navlog",
    storageBucket: "auto-navlog.firebasestorage.app",
    messagingSenderId: "691469496655",
    appId: "1:691469496655:web:b4c2375317ad86c520153a"
  };

  if (!firebase.apps || !firebase.apps.length) {
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
          try {
            localStorage.setItem('firebaseUser', JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              emailVerified: user.emailVerified,
            }));
          } catch (error) {
            console.warn('Failed to persist firebaseUser:', error);
          }
        } else {
          localStorage.removeItem('firebaseUser');
        }
      });
    }

    async signInWithGoogle() {
      const result = await this.auth.signInWithPopup(this.googleProvider);
      return result.user;
    }

    async signInWithEmail(email, password) {
      const result = await this.auth.signInWithEmailAndPassword(email, password);
      return result.user;
    }

    async signUpWithEmail(email, password) {
      const result = await this.auth.createUserWithEmailAndPassword(email, password);
      return result.user;
    }

    async resetPassword(email) {
      await this.auth.sendPasswordResetEmail(email);
      return true;
    }

    async signOut() {
      await this.auth.signOut();
      return true;
    }

    getCurrentUser() {
      return this.auth.currentUser;
    }

    getUserFromLocalStorage() {
      try {
        const userStr = localStorage.getItem('firebaseUser');
        if (userStr) {
          return JSON.parse(userStr);
        }
      } catch (error) {
        console.warn('Failed to parse firebaseUser:', error);
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
      this.listeners.forEach((callback) => {
        try {
          callback(user);
        } catch (error) {
          console.error('Auth listener error:', error);
        }
      });
    }

    isLoggedIn() {
      return !!this.auth.currentUser;
    }

    isEmailVerified() {
      return this.auth.currentUser && this.auth.currentUser.emailVerified;
    }
  }

  window.firebaseAuth = new FirebaseAuth();
})();
