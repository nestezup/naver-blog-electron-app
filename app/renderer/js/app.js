// Simple Naver Blog Electron App

class App {
    constructor() {
        this.webview = null
        this.sidebarOpen = false
        this.cookies = {}
        this.isLoggedIn = false
        this.userBlogId = null
        this.init()
    }

    init() {
        // Check if user is authenticated
        this.checkAuthentication();

        this.webview = document.getElementById('blogWebview')
        this.setupEventListeners()
        this.setupWebView()
        this.setupBlogIdModalEvents()
    }

    setupEventListeners() {
        // Sidebar toggle
        document.getElementById('toggleSidebar').addEventListener('click', () => {
            this.toggleSidebar()
        })

        // Navigation
        document.getElementById('goBack').addEventListener('click', () => {
            if (this.webview && this.webview.canGoBack()) {
                this.webview.goBack()
            }
        })

        document.getElementById('goForward').addEventListener('click', () => {
            if (this.webview && this.webview.canGoForward()) {
                this.webview.goForward()
            }
        })

        document.getElementById('refresh').addEventListener('click', () => {
            if (this.webview) {
                this.webview.reload()
            }
        })

        // User profile and logout
        document.getElementById('userProfileBtn').addEventListener('click', () => {
            this.showUserProfileModal()
        })

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout()
        })

        // Blog post creation
        document.getElementById('createPost').addEventListener('click', () => {
            this.createBlogPost()
        })

        document.getElementById('goToMyBlog').addEventListener('click', () => {
            this.goToMyBlog()
        })

        // Markdown post creation
        document.getElementById('createPostFromMarkdown').addEventListener('click', () => {
            this.createPostFromMarkdown()
        })

        // Sample post creation
        document.getElementById('createSamplePost').addEventListener('click', () => {
            this.createSamplePost()
        })

        document.getElementById('createSamplePostWithMarkdown').addEventListener('click', () => {
            this.createSamplePostFromMarkdown()
        })

        // Load saved blog ID on startup (with delay for DOM)
        setTimeout(() => {
            this.syncBlogIdFromStorage()
        }, 200)
    }

    async checkAuthentication() {
        try {
            const cachedAuth = localStorage.getItem('firebaseAuth');
            if (cachedAuth === 'true') {
                console.log('User authenticated via local flag, loading main app');
                return true;
            }

            if (window.electronAPI?.checkAuth) {
                const result = await window.electronAPI.checkAuth();
                if (result?.authenticated) {
                    console.log('User authenticated via IPC check, loading main app');
                    localStorage.setItem('firebaseAuth', 'true');
                    return true;
                }
            }

            console.log('No authenticated session detected, redirecting to auth screen');
            localStorage.removeItem('firebaseAuth');
            window.location.href = 'auth.html';
            return false;
        } catch (error) {
            console.error('Authentication check failed:', error);
            localStorage.removeItem('firebaseAuth');
            window.location.href = 'auth.html';
            return false;
        }
    }

  setupWebView() {
        if (!this.webview) return

        console.log('Setting up webview events')

        // Loading events
        this.webview.addEventListener('did-start-loading', () => {
            console.log('WebView started loading')
            this.showLoading()
        })

        this.webview.addEventListener('did-stop-loading', () => {
            console.log('WebView stopped loading')
            this.hideLoading()
            this.extractCookies()
        })

        this.webview.addEventListener('dom-ready', () => {
            console.log('WebView DOM ready')
            this.hideLoading()
            this.extractCookies()
        })

        this.webview.addEventListener('did-fail-load', (event) => {
            console.log('WebView failed to load:', event)
            this.hideLoading()
        })

        // 3초 후 강제로 로딩 해제
        setTimeout(() => {
            console.log('Force hiding loading overlay after 3 seconds')
            this.hideLoading()
        }, 3000)

        // Navigation events
        this.webview.addEventListener('did-navigate', (event) => {
            this.updateUrl(event.url)
        })

        this.webview.addEventListener('did-navigate-in-page', (event) => {
            this.updateUrl(event.url)
        })
    }

    async extractCookies() {
        if (!this.webview) {
            console.log('WebView not available')
            return
        }

        try {
            // 기본적인 쿠키 추출 (원래대로)
            const cookieString = await this.webview.executeJavaScript('document.cookie')
            console.log('Raw cookie string:', cookieString)

            if (cookieString && cookieString.length > 0) {
                this.cookies = this.parseCookies(cookieString)
                console.log('All parsed cookies:', Object.keys(this.cookies))

                // 실제 로그인/로그아웃 테스트 결과 기반 로그인 감지
                // 로그인시에만 존재: NID_SES, nid_inf
                // 항상 존재: NAC, NACT, BA_DEVICE, NNB, SRT30, SRT5
                const loginRequiredCookies = ['NID_SES', 'nid_inf']

                const hasLoginCookies = loginRequiredCookies.every(cookieName =>
                    this.cookies[cookieName] && this.cookies[cookieName].length > 0
                )

                this.isLoggedIn = hasLoginCookies

                console.log('Required login cookies check:')
                loginRequiredCookies.forEach(cookie => {
                    const exists = !!(this.cookies[cookie] && this.cookies[cookie].length > 0)
                    console.log(`  ${cookie}: ${exists ? 'PRESENT' : 'MISSING'}`)
                })
                console.log('Login status (accurate detection):', this.isLoggedIn)

                // URL에서 사용자 블로그 ID 추출 (https://blog.naver.com/nest4000 형태)
                const currentUrl = this.webview.getURL()
                console.log('Current URL for blog ID extraction:', currentUrl)

                // 블로그 ID 패턴 매칭 개선 (시스템 페이지 제외)
                const systemPages = [
                    'PostView.naver', 'RabbitWrite.naver', 'postwrite',
                    'BlogHome.naver', 'BlogMenuBar.naver', 'BlogView.naver'
                ]

                let detectedBlogId = null

                // 1. 일반 블로그 URL: https://blog.naver.com/nest4000
                const generalBlogMatch = currentUrl.match(/blog\.naver\.com\/([a-zA-Z0-9_-]+)(?:\/|$|\?)/)
                if (generalBlogMatch && generalBlogMatch[1] && !systemPages.includes(generalBlogMatch[1])) {
                    detectedBlogId = generalBlogMatch[1]
                }

                // 2. section.blog.naver.com에서 blogId 파라미터로 추출
                if (!detectedBlogId) {
                    const sectionMatch = currentUrl.match(/section\.blog\.naver\.com.*[?&]blogId=([a-zA-Z0-9_-]+)/)
                    if (sectionMatch && sectionMatch[1]) {
                        detectedBlogId = sectionMatch[1]
                    }
                }

                if (detectedBlogId) {
                    this.userBlogId = detectedBlogId
                    console.log('User blog ID detected:', this.userBlogId)
                } else {
                    console.log('No blog ID detected from URL')
                }
            } else {
                console.log('No cookies found')
                this.cookies = {}
                this.isLoggedIn = false
                this.userBlogId = null
            }

            this.updateLoginStatus()
        } catch (error) {
            console.error('Cookie extraction failed:', error.message)
            this.cookies = {}
            this.isLoggedIn = false
            this.updateLoginStatus()
        }
    }

    parseCookies(cookieString) {
        const cookies = {}
        cookieString.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=')
            if (name && value) {
                cookies[name] = decodeURIComponent(value)
            }
        })
        return cookies
    }

    updateLoginStatus() {
        const loginStatus = document.getElementById('loginStatus')
        const loginText = document.getElementById('loginText')

        console.log('Login status:', this.isLoggedIn ? 'LOGGED IN' : 'NOT LOGGED IN')
        console.log('User blog ID:', this.userBlogId)

        if (this.isLoggedIn) {
            loginStatus.className = 'w-3 h-3 rounded-full bg-success'
            loginText.textContent = this.userBlogId ? `로그인됨 (${this.userBlogId})` : '로그인됨'
        } else {
            loginStatus.className = 'w-3 h-3 rounded-full bg-error'
            loginText.textContent = '로그인되지 않음'
            this.userBlogId = null
        }

        this.updateBlogIdUI(this.userBlogId)
    }

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen
        const sidebar = document.getElementById('sidebar')

        if (this.sidebarOpen) {
            sidebar.classList.remove('-translate-x-full')
        } else {
            sidebar.classList.add('-translate-x-full')
        }
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay')
        overlay.classList.remove('hidden')
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay')
        overlay.classList.add('hidden')
    }

    updateUrl(url) {
        const urlInput = document.getElementById('urlInput')
        urlInput.value = url
    }

    async createBlogPost() {
        if (!this.isLoggedIn) {
            alert('먼저 네이버 블로그에 로그인해주세요.\n\n쿠키 새로고침 버튼을 눌러보세요.')
            return
        }

        console.log('Creating blog post - login confirmed')

        // WebView 상태 먼저 확인
        if (!this.webview) {
            alert('WebView가 준비되지 않았습니다.')
            return
        }

        const currentURL = this.webview.getURL()
        console.log('Current WebView URL:', currentURL)

        // 도메인 자동 전환은 요청 시 내부에서 처리합니다.

        // Simple test post data
        const postData = {
            title: '테스트 글 제목',
            content: '이것은 Electron 앱에서 작성한 테스트 글입니다.\n\n자동으로 생성된 글입니다.'
        }

        try {
            console.log('Creating blog post with cookies:', this.cookies)
            const result = await this.sendBlogAPIRequest(postData)
            console.log('Blog post creation result:', result)

            if (result.success) {
                alert('글이 성공적으로 작성되었습니다!')
            } else {
                alert('글 작성에 실패했습니다: ' + result.message)
            }
        } catch (error) {
            console.error('Blog post creation error:', error)
            alert('글 작성 중 오류가 발생했습니다: ' + error.message)
        }
    }

    async sendBlogAPIRequest(postData) {
        // 동적으로 블로그 ID 확보 (시스템 페이지 제외)
        let blogId = this.userBlogId || null
        if (!blogId && this.webview) {
            try {
                blogId = await this.webview.executeJavaScript(`(function(){
                    try {
                        const systemPages = ['PostView.naver', 'RabbitWrite.naver', 'postwrite', 'BlogHome.naver', 'BlogMenuBar.naver', 'BlogView.naver'];

                        // 일반 블로그 URL에서 추출
                        const m = (window.location.href || '').match(/blog\\.naver\\.com\\/([^\\/\\?]+)/);
                        if (m && m[1] && !systemPages.includes(m[1])) {
                            return m[1];
                        }

                        // section.blog.naver.com에서 blogId 파라미터 추출
                        const sectionMatch = (window.location.href || '').match(/section\\.blog\\.naver\\.com.*[?&]blogId=([a-zA-Z0-9_-]+)/);
                        if (sectionMatch && sectionMatch[1]) {
                            return sectionMatch[1];
                        }

                        return null;
                    } catch(e){ return null; }
                })();`)
            } catch (_) {
                blogId = null
            }
        }

        if (!blogId) {
            return { success: false, message: '블로그 ID를 찾을 수 없습니다. 블로그 홈으로 이동한 뒤 다시 시도해주세요.' }
        }

        // RabbitWrite API용 document 구조 (새 글 작성)
        const documentModel = {
            documentId: "",  // 새 글은 빈 문자열
            document: {
                version: "2.8.10",
                theme: "default",
                language: "ko-KR",
                id: this.generateId(),
                components: this.createPostComponents(postData.title, postData.content),
                di: {
                    dif: false,
                    dio: [
                        { dis: "N", dia: { t: 0, p: 0, st: 37, sk: 3 } },
                        { dis: "N", dia: { t: 0, p: 0, st: 37, sk: 3 } }
                    ]
                }
            }
        }

        const populationParams = {
            configuration: {
                openType: 0,  // 비공개
                commentYn: false,
                searchYn: false,
                sympathyYn: false,
                scrapType: 0,
                outSideAllowYn: false,
                twitterPostingYn: false,
                facebookPostingYn: false,
                cclYn: false
            },
            populationMeta: {
                categoryId: 6,
                logNo: null,
                directorySeq: 0,
                directoryDetail: null,
                mrBlogTalkCode: null,
                postWriteTimeType: "now",
                tags: "",
                moviePanelParticipation: false,
                greenReviewBannerYn: false,
                continueSaved: false,
                noticePostYn: false,
                autoByCategoryYn: false,
                postLocationSupportYn: false,
                postLocationJson: null,
                prePostDate: null,
                thisDayPostInfo: null,
                scrapYn: false
            },
            editorSource: "4I0ix70hXGPBHQA2KadBEg=="
        }

        const requestData = {
            blogId: blogId,
            documentModel: JSON.stringify(documentModel),
            mediaResources: JSON.stringify({ image: [], video: [], file: [] }),
            populationParams: JSON.stringify(populationParams),
            productApiVersion: 'v1'  // 새 글 작성에는 포함됨
        }

        console.log('Sending API request with data:', requestData)

        // 임시 저장 후 발행 시도
        console.log('=== 임시 저장 시도 ===')
        const tempSaveResult = await this.makeRequestFromWebview('https://blog.naver.com/RabbitWrite.naver', requestData, { blogId })

        console.log('Temp save result:', tempSaveResult)

        if (tempSaveResult.success && tempSaveResult.data) {
            try {
                const tempResponse = JSON.parse(tempSaveResult.data.trim())

                if (tempResponse.isSuccess && tempResponse.result && tempResponse.result.documentId) {
                    const documentId = tempResponse.result.documentId
                    console.log('임시 저장 성공, documentId:', documentId)

                    const publishData = {
                        ...requestData,
                        documentModel: JSON.stringify({
                            ...JSON.parse(requestData.documentModel),
                            documentId: documentId
                        })
                    }

                    console.log('=== 발행 시도 ===')
                    return await this.makeRequestFromWebview('https://blog.naver.com/RabbitWrite.naver', publishData, { blogId })
                }
            } catch (parseError) {
                console.error('Temp save response parsing error:', parseError)
            }
        }

        return tempSaveResult
    }

    async submitFormInWebview(url, data) {
        if (!this.webview) {
            return { success: false, message: 'WebView not available' }
        }

        try {
            // WebView에서 숨은 form을 생성해서 제출
            const formScript = `
                (function() {
                    try {
                        console.log('[WebView] Creating hidden form for POST request');

                        // 기존 form 제거
                        const existingForm = document.getElementById('blog-submit-form');
                        if (existingForm) {
                            existingForm.remove();
                        }

                        // 새 form 생성
                        const form = document.createElement('form');
                        form.id = 'blog-submit-form';
                        form.method = 'POST';
                        form.action = '${url}';
                        form.style.display = 'none';

                        const requestData = ${JSON.stringify(data)};

                        // 각 데이터를 input으로 추가
                        Object.entries(requestData).forEach(([key, value]) => {
                            const input = document.createElement('input');
                            input.type = 'hidden';
                            input.name = key;
                            input.value = value;
                            form.appendChild(input);
                            console.log('[WebView] Added form field:', key);
                        });

                        // body에 추가하고 제출
                        document.body.appendChild(form);
                        console.log('[WebView] Submitting form...');
                        form.submit();

                        return { success: true, message: 'Form submitted' };
                    } catch (error) {
                        console.error('[WebView] Form submission error:', error);
                        return { success: false, message: error.message };
                    }
                })();
            `

            console.log('Submitting form in webview...')
            const result = await this.webview.executeJavaScript(formScript)
            console.log('WebView form result:', result)

            return result
        } catch (error) {
            console.error('WebView form error:', error)
            return { success: false, message: error.message }
        }
    }

    async makeRequestFromWebview(url, data, options = {}) {
        if (!this.webview) {
            return { success: false, message: 'WebView not available' }
        }

        try {
            // First, check if WebView is on the correct domain and navigate if needed
            const domainCheckScript = `
                (function() {
                    return {
                        url: window.location.href,
                        origin: window.location.origin,
                        hostname: window.location.hostname,
                        isNaverDomain: window.location.hostname.includes('naver.com'),
                        cookies: document.cookie.length > 0
                    };
                })()
            `;

            const domainInfo = await this.webview.executeJavaScript(domainCheckScript);
            console.log('WebView domain check:', domainInfo);

            // If not on blog.naver.com specifically, navigate there
            if (!domainInfo.isNaverDomain || domainInfo.hostname !== 'blog.naver.com') {
                // blogId가 유효한지 확인 (시스템 페이지가 아닌지)
                const systemPages = ['PostView.naver', 'RabbitWrite.naver', 'postwrite', 'BlogHome.naver', 'BlogMenuBar.naver', 'BlogView.naver']
                const validBlogId = options.blogId && !systemPages.includes(options.blogId)

                const target = validBlogId ? `https://blog.naver.com/${options.blogId}` : 'https://blog.naver.com'
                console.log(`WebView not on blog.naver.com domain (current: ${domainInfo.hostname}), navigating to: ${target}`);
                this.webview.src = target;

                // Wait for navigation to complete
                await new Promise((resolve) => {
                    const handleLoad = () => {
                        this.webview.removeEventListener('dom-ready', handleLoad);
                        setTimeout(resolve, 3000); // Additional wait for page to fully load
                    };
                    this.webview.addEventListener('dom-ready', handleLoad);
                });

                // Check again after navigation
                const newDomainInfo = await this.webview.executeJavaScript(domainCheckScript);
                console.log('After navigation domain check:', newDomainInfo);

                if (newDomainInfo.hostname !== 'blog.naver.com') {
                    return {
                        success: false,
                        message: `Failed to navigate to blog.naver.com domain. Current: ${newDomainInfo.hostname}`,
                        currentUrl: newDomainInfo.url
                    };
                }
            }

            const refererBlogId = options.blogId || this.userBlogId || ''
            const referer = refererBlogId
                ? `https://blog.naver.com/${refererBlogId}/postwrite?categoryNo=6`
                : `https://blog.naver.com/postwrite?categoryNo=6`

            const requestScript = `
                (async function() {
                    console.log('[WebView] === DEBUGGING FETCH REQUEST ===');
                    console.log('[WebView] Target URL:', '${url}');
                    console.log('[WebView] Current location:', window.location.href);
                    console.log('[WebView] Current origin:', window.location.origin);
                    console.log('[WebView] Document cookies:', document.cookie ? 'PRESENT' : 'MISSING');
                    console.log('[WebView] Cookie sample:', document.cookie.substring(0, 100) + '...');

                    // Same-origin 확인
                    const targetOrigin = new URL('${url}').origin;
                    const currentOrigin = window.location.origin;
                    console.log('[WebView] Target origin:', targetOrigin);
                    console.log('[WebView] Current origin:', currentOrigin);
                    console.log('[WebView] Same origin?', targetOrigin === currentOrigin);

                    const requestData = ${JSON.stringify(data)};
                    const body = new URLSearchParams();

                    Object.entries(requestData).forEach(([key, value]) => {
                        body.append(key, value);
                    });

                    console.log('[WebView] Request body size:', body.toString().length);
                    console.log('[WebView] Request body preview:', body.toString().substring(0, 200) + '...');

                    // 먼저 간단한 연결 테스트
                    try {
                        console.log('[WebView] Testing basic fetch to same origin...');
                        const testResponse = await fetch(window.location.origin + '/test', {
                            method: 'GET',
                            credentials: 'same-origin'
                        }).catch(e => {
                            console.log('[WebView] Basic fetch test failed (expected):', e.message);
                            return null;
                        });

                        console.log('[WebView] Making actual API request...');
                        const response = await fetch('${url}', {
                            method: 'POST',
                            headers: {
                                'accept': 'application/json, text/plain, */*',
                                'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                                'cache-control': 'no-cache',
                                'content-type': 'application/x-www-form-urlencoded',
                                'origin': 'https://blog.naver.com',
                                'pragma': 'no-cache',
                                'priority': 'u=1, i',
                                'referer': '${referer}',
                                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                                'sec-ch-ua-mobile': '?0',
                                'sec-ch-ua-platform': '"macOS"',
                                'sec-fetch-dest': 'empty',
                                'sec-fetch-mode': 'cors',
                                'sec-fetch-site': 'same-origin',
                                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
                            },
                            body: body,
                            credentials: 'same-origin'
                        });

                        console.log('[WebView] Response received!');
                        console.log('[WebView] Response status:', response.status);
                        console.log('[WebView] Response ok:', response.ok);
                        console.log('[WebView] Response headers:', JSON.stringify([...response.headers.entries()]));

                        const text = await response.text();
                        console.log('[WebView] Response text length:', text.length);
                        console.log('[WebView] Response preview:', text.substring(0, 500));

                        return {
                            success: response.ok,
                            status: response.status,
                            data: text
                        };
                    } catch (fetchError) {
                        console.error('[WebView] Fetch error details:', fetchError);
                        console.error('[WebView] Error name:', fetchError.name);
                        console.error('[WebView] Error message:', fetchError.message);
                        console.error('[WebView] Error stack:', fetchError.stack);

                        // 네트워크 상태 확인
                        console.log('[WebView] Navigator online:', navigator.onLine);

                        throw fetchError;
                    }
                })().catch(err => {
                    console.error('[WebView] FINAL ERROR:', err);
                    return {
                        success: false,
                        message: err.message,
                        name: err.name,
                        stack: err.stack
                    };
                });
            `

            console.log('Executing fetch in webview...')
            const result = await this.webview.executeJavaScript(requestScript)
            console.log('WebView fetch result:', result)

            return result
        } catch (error) {
            console.error('WebView fetch error:', error)
            return { success: false, message: error.message }
        }
    }

    createPostComponents(title, content) {
        return [
            // Document Title
            {
                id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                layout: "default",
                title: [{
                    id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                    nodes: [{
                        id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                        value: title,
                        style: {
                            fontFamily: "nanumbareunhipi",
                            "@ctype": "nodeStyle"
                        },
                        "@ctype": "textNode"
                    }],
                    "@ctype": "paragraph"
                }],
                subTitle: null,
                align: "left",
                "@ctype": "documentTitle"
            },
            // Text Content
            {
                id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                layout: "default",
                value: content.split('\n').map(paragraph => ({
                    id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                    nodes: [{
                        id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                        value: paragraph,
                        style: {
                            fontFamily: "nanumbareunhipi",
                            "@ctype": "nodeStyle"
                        },
                        "@ctype": "textNode"
                    }],
                    "@ctype": "paragraph"
                })),
                "@ctype": "text"
            }
        ]
    }

    generateId() {
        // 26자리 영숫자 ID 생성
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''
        for (let i = 0; i < 26; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    generateSEId() {
        // 네이버 형식과 유사한 짧은 hex ID 생성
        const chars = 'abcdef0123456789'
        const generateSegment = (length) => {
            let result = ''
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            return result
        }

        return `SE-${generateSegment(8)}-${generateSegment(4)}-${generateSegment(4)}-${generateSegment(4)}-${generateSegment(12)}`
    }

    extractYouTubeId(url) {
        // YouTube URL에서 video ID 추출
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    extractDomainFromUrl(url) {
        // URL에서 도메인 추출
        try {
            const domain = new URL(url).hostname.replace('www.', '');
            return domain;
        } catch (e) {
            return url;
        }
    }

    async fetchLinkPreview(url) {
        // 링크 미리보기 정보 가져오기 (일단은 fallback으로만 테스트)
        try {
            console.log('Fetching link preview for:', url);

            // 임시로 네이버 API 호출을 생략하고 fallback으로 바로 이동
            console.log('Using fallback preview for now (API calls temporarily disabled)...');
            return this.generateFallbackPreview(url);

            /* TODO: API 인증 문제 해결 후 다시 활성화
            // 1. 네이버 oglink API 호출 (제공해주신 curl 예시 기반)
            const oglinkResult = await this.fetchNaverOglinkAPI(url);
            if (oglinkResult && !oglinkResult.error) {
                console.log('Naver oglink API result:', oglinkResult);
                return oglinkResult;
            }

            // 2. fallback으로 단순 링크 변환 API 호출
            console.log('Falling back to simple link conversion...');
            const simpleResult = await this.fetchSimpleLinkConversion(url);
            if (simpleResult && !simpleResult.error) {
                console.log('Simple link conversion result:', simpleResult);
                return simpleResult;
            }

            // 3. 최후의 fallback
            console.log('Using fallback preview...');
            return this.generateFallbackPreview(url);
            */

        } catch (error) {
            console.error('Error in fetchLinkPreview:', error);
            return this.generateFallbackPreview(url);
        }
    }

    async fetchNaverOglinkAPI(url) {
        // 네이버 oglink API 호출 (임베딩용)
        try {
            const jsCode = `
                (async () => {
                    try {
                        const encodedUrl = encodeURIComponent('${url}');
                        const apiUrl = 'https://platform.editor.naver.com/api/blogpc001/v1/oglink?url=' + encodedUrl;

                        console.log('Calling oglink API:', apiUrl);

                        const response = await fetch(apiUrl, {
                            method: 'GET',
                            headers: {
                                'accept': 'application/json',
                                'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                                'cache-control': 'no-cache',
                                'origin': 'https://blog.naver.com',
                                'referer': 'https://blog.naver.com/nest4000/postwrite',
                                'sec-app-id': 'SE-f3ea5641-ec92-4525-80d0-24acfeaa81b1',
                                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
                            },
                            credentials: 'same-origin'
                        });

                        if (!response.ok) {
                            console.log('oglink API failed:', response.status, response.statusText);
                            return { error: 'HTTP ' + response.status };
                        }

                        const data = await response.json();
                        console.log('oglink API response:', data);

                        if (data && data.result) {
                            const domain = new URL('${url}').hostname.replace('www.', '');

                            return {
                                title: data.result.title || domain,
                                domain: domain,
                                url: '${url}',
                                thumbnail: {
                                    src: data.result.imageUrl || "https://www.google.com/s2/favicons?domain=" + domain + "&sz=128",
                                    width: 1200,
                                    height: 1200,
                                    "@ctype": "thumbnail"
                                },
                                description: data.result.description || '',
                                video: data.result.video || false,
                                oglinkSign: data.result.oglinkSign || "Ub2GJaay33GnzOcInKXBCIubN2t5LrWC7is7G-rP_-A__v1.0",
                                siteName: data.result.siteName || domain
                            };
                        }

                        return { error: 'No result in oglink response' };

                    } catch (error) {
                        console.log('oglink API error:', error.message);
                        return { error: error.message };
                    }
                })()
            `;

            const result = await this.webview.executeJavaScript(jsCode);
            return result;

        } catch (error) {
            console.error('Error in fetchNaverOglinkAPI:', error);
            return { error: error.message };
        }
    }

    async fetchSimpleLinkConversion(url) {
        // 단순 링크 변환 API 호출
        try {
            const jsCode = `
                (async () => {
                    try {
                        const linkHtml = '<a href="${url}">${url}</a>';

                        const response = await fetch('https://upconvert.editor.naver.com/blog/html/components?documentWidth=693&userId=nest4000', {
                            method: 'POST',
                            headers: {
                                'accept': 'application/json',
                                'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                                'cache-control': 'no-cache',
                                'content-type': 'text/plain',
                                'origin': 'https://blog.naver.com',
                                'referer': 'https://blog.naver.com/nest4000/postwrite',
                                'sec-app-id': 'SE-f3ea5641-ec92-4525-80d0-24acfeaa81b1',
                                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
                            },
                            body: linkHtml,
                            credentials: 'same-origin'
                        });

                        if (!response.ok) {
                            console.log('Simple link API failed:', response.status, response.statusText);
                            return { error: 'HTTP ' + response.status };
                        }

                        const data = await response.json();
                        console.log('Simple link API response:', data);

                        // 단순 링크 결과를 oglink 형식으로 변환
                        const domain = new URL('${url}').hostname.replace('www.', '');

                        return {
                            title: domain,
                            domain: domain,
                            url: '${url}',
                            thumbnail: {
                                src: "https://www.google.com/s2/favicons?domain=" + domain + "&sz=128",
                                width: 1200,
                                height: 1200,
                                "@ctype": "thumbnail"
                            },
                            description: '',
                            video: false,
                            oglinkSign: "Ub2GJaay33GnzOcInKXBCIubN2t5LrWC7is7G-rP_-A__v1.0",
                            siteName: domain
                        };

                    } catch (error) {
                        console.log('Simple link API error:', error.message);
                        return { error: error.message };
                    }
                })()
            `;

            const result = await this.webview.executeJavaScript(jsCode);
            return result;

        } catch (error) {
            console.error('Error in fetchSimpleLinkConversion:', error);
            return { error: error.message };
        }
    }

    async convertLinkWithUpconvertAPI(linkHtml) {
        // 네이버 upconvert API로 HTML 링크를 네이버 컴포넌트로 변환
        try {
            const jsCode = `
                (async () => {
                    try {
                        // 동적 헤더 값 가져오기
                        const getCurrentUrl = window.location.href;
                        const blogIdMatch = getCurrentUrl.match(/blog\\.naver\\.com\\/([^\\/\\?]+)/);
                        const currentBlogId = blogIdMatch ? blogIdMatch[1] : 'nest4000';

                        // se-app-id 생성
                        const secAppId = 'SE-' + Math.random().toString(36).substr(2, 32);

                        // 기본 헤더
                        const headers = {
                            'accept': 'application/json',
                            'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                            'cache-control': 'no-cache',
                            'content-type': 'text/plain',
                            'origin': 'https://blog.naver.com',
                            'referer': 'https://blog.naver.com/' + currentBlogId + '/postwrite',
                            'sec-app-id': secAppId,
                            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
                        };

                        console.log('Upconvert API headers:', headers);

                        const response = await fetch('https://upconvert.editor.naver.com/blog/html/components?documentWidth=693&userId=' + currentBlogId, {
                            method: 'POST',
                            headers: headers,
                            body: \`${linkHtml}\`,
                            credentials: 'same-origin'
                        });

                        if (!response.ok) {
                            console.log('Upconvert API failed:', response.status, response.statusText);
                            return null;
                        }

                        const data = await response.json();
                        console.log('Upconvert API response:', data);
                        return data.components || [];

                    } catch (error) {
                        console.log('Upconvert API error:', error.message);
                        return null;
                    }
                })()
            `;

            const result = await this.webview.executeJavaScript(jsCode);
            return result;

        } catch (error) {
            console.error('Error in convertLinkWithUpconvertAPI:', error);
            return null;
        }
    }

    addSimpleLinkComponent(components, paragraph) {
        // 단순 텍스트 링크 컴포넌트 추가 (네이버 공식 형식)
        components.push({
            id: this.generateSEId(),
            layout: "default",
            value: [{
                id: this.generateSEId(),
                nodes: [{
                    id: this.generateSEId(),
                    value: paragraph.text || paragraph.url,
                    link: {
                        "@ctype": "urlLink",
                        "url": paragraph.url
                    },
                    style: {
                        fontFamily: "nanumbareunhipi",
                        "@ctype": "nodeStyle"
                    },
                    "@ctype": "textNode"
                }],
                "@ctype": "paragraph"
            }],
            "@ctype": "text"
        });
    }

    addOgLinkComponent(components, paragraph) {
        // OGLink 카드 컴포넌트 추가
        try {
            const url = new URL(paragraph.url.startsWith('http') ? paragraph.url : 'https://' + paragraph.url);
            const domain = url.hostname;

            components.push({
                id: this.generateSEId(),
                layout: "default",
                title: paragraph.text || paragraph.url,
                domain: domain,
                link: url.href,
                thumbnail: {
                    src: "https://www.google.com/s2/favicons?domain=" + domain + "&sz=128",
                    width: 128,
                    height: 128,
                    "@ctype": "thumbnail"
                },
                description: paragraph.text || paragraph.url,
                video: false,
                oglinkSign: "fallback_link_" + Date.now(),
                "@ctype": "oglink"
            });
        } catch (error) {
            console.error('URL parsing error, using simple link:', error);
            this.addSimpleLinkComponent(components, paragraph);
        }
    }

    generateFallbackPreview(url) {
        // 미리보기 정보를 가져올 수 없을 때 기본값 생성
        const domain = this.extractDomainFromUrl(url);

        // 사이트별 기본 정보
        let title = domain;
        let description = '';
        let thumbnailSrc = "https://www.google.com/s2/favicons?domain=" + domain + "&sz=128";
        let isVideo = false;

        if (domain.includes('youtube.com')) {
            title = "YouTube";
            description = "YouTube에서 마음에 드는 동영상과 음악을 감상하고, 직접 만든 콘텐츠를 업로드하여 친구, 가족뿐만 아니라 전 세계 사람들과 콘텐츠를 공유할 수 있습니다.";
            thumbnailSrc = "https://www.youtube.com/img/desktop/yt_1200.png";
            isVideo = true;
        } else if (domain.includes('naver.com')) {
            title = "네이버";
            description = "네이버 메인에서 다양한 정보와 유용한 컨텐츠를 만나 보세요";
        }

        return {
            title: title,
            domain: domain,
            url: url,
            thumbnail: {
                src: thumbnailSrc,
                width: 1200,
                height: 1200,
                "@ctype": "thumbnail"
            },
            description: description,
            video: isVideo,
            siteName: domain
        };
    }

    // Blog ID Management Methods
    getCurrentFirebaseUser() {
        try {
            if (typeof firebaseAuth !== 'undefined') {
                const liveUser = firebaseAuth.getCurrentUser?.();
                if (liveUser) {
                    return liveUser;
                }
                const storedUser = firebaseAuth.getUserFromLocalStorage?.();
                if (storedUser) {
                    return storedUser;
                }
            }
        } catch (error) {
            console.warn('Failed to read Firebase user info:', error);
        }
        return null;
    }

    getBlogSettingsStore() {
        try {
            return JSON.parse(localStorage.getItem('firebaseBlogSettings') || '{}') || {};
        } catch (error) {
            console.warn('Failed to parse firebaseBlogSettings from storage:', error);
            return {};
        }
    }

    saveBlogSettingsStore(store) {
        try {
            localStorage.setItem('firebaseBlogSettings', JSON.stringify(store));
        } catch (error) {
            console.warn('Failed to persist firebaseBlogSettings:', error);
        }
    }

    getStoredBlogIdForUser(uid) {
        if (!uid) {
            return null;
        }
        const store = this.getBlogSettingsStore();
        const entry = store[uid];
        if (entry && typeof entry.blogId === 'string') {
            return entry.blogId;
        }
        return null;
    }

    setStoredBlogIdForUser(uid, blogId) {
        if (!uid) {
            return;
        }
        const store = this.getBlogSettingsStore();

        if (blogId) {
            store[uid] = {
                blogId,
                updatedAt: Date.now(),
            };
        } else {
            delete store[uid];
        }

        this.saveBlogSettingsStore(store);
        this.userBlogId = blogId || null;
        this.updateBlogIdUI(this.userBlogId);
    }

    syncBlogIdFromStorage() {
        const firebaseUser = this.getCurrentFirebaseUser();
        let blogId = null;

        if (firebaseUser?.uid) {
            blogId = this.getStoredBlogIdForUser(firebaseUser.uid);
        }

        if (!blogId) {
            const legacy = localStorage.getItem('userBlogId') || sessionStorage.getItem('userBlogId');
            if (legacy) {
                blogId = legacy;
                if (firebaseUser?.uid) {
                    this.setStoredBlogIdForUser(firebaseUser.uid, legacy);
                }
            }
        }

        this.userBlogId = blogId || null;
        this.updateBlogIdUI(this.userBlogId);
    }

    updateBlogIdUI(blogId) {
        const displayValue = blogId || '미설정';

        const sidebarDisplay = document.getElementById('sidebarBlogId');
        if (sidebarDisplay) {
            sidebarDisplay.textContent = displayValue;
        }

        const profileDisplay = document.getElementById('profileBlogIdValue');
        if (profileDisplay) {
            profileDisplay.textContent = displayValue;
        }

        if (this.isLoggedIn) {
            const loginText = document.getElementById('loginText');
            if (loginText) {
                loginText.textContent = blogId ? `로그인됨 (${blogId})` : '로그인됨';
            }
        }
    }

    async handleBlogIdEdit() {
        const firebaseUser = this.getCurrentFirebaseUser();
        if (!firebaseUser || !firebaseUser.uid) {
            alert('Firebase 계정 정보가 필요합니다. 로그인 상태를 확인해주세요.');
            return;
        }

        const modal = this.blogIdModal || document.getElementById('blogIdModal');
        const input = this.blogIdModalInput || document.getElementById('blogIdModalInput');
        if (!modal || !input) {
            alert('블로그 ID 설정 창을 불러오지 못했습니다.');
            return;
        }

        const currentBlogId = this.getStoredBlogIdForUser(firebaseUser.uid) || '';
        input.value = currentBlogId;

        modal.classList.remove('hidden');
        modal.classList.add('modal-open');
    }

    closeBlogIdModal() {
        const modal = this.blogIdModal || document.getElementById('blogIdModal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('modal-open');
    }

    handleBlogIdModalSave() {
        const firebaseUser = this.getCurrentFirebaseUser();
        if (!firebaseUser || !firebaseUser.uid) {
            alert('Firebase 계정 정보가 필요합니다. 로그인 상태를 확인해주세요.');
            return;
        }

        const input = this.blogIdModalInput || document.getElementById('blogIdModalInput');
        if (!input) {
            alert('입력 필드를 찾을 수 없습니다.');
            return;
        }

        const trimmed = input.value.trim();

        if (!trimmed) {
            this.setStoredBlogIdForUser(firebaseUser.uid, null);
            localStorage.removeItem('userBlogId');
            sessionStorage.removeItem('userBlogId');
            this.closeBlogIdModal();
            alert('블로그 ID 설정이 초기화되었습니다.');
            return;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
            alert('블로그 ID는 영문, 숫자, -, _ 만 사용할 수 있습니다.');
            return;
        }

        this.setStoredBlogIdForUser(firebaseUser.uid, trimmed);
        localStorage.setItem('userBlogId', trimmed); // 레거시 호환
        sessionStorage.setItem('userBlogId', trimmed);
        this.closeBlogIdModal();
        alert(`블로그 ID가 "${trimmed}"(으)로 설정되었습니다.`);
    }

    goToMyBlog() {
        this.syncBlogIdFromStorage();

        if (!this.userBlogId) {
            alert('블로그 ID가 설정되지 않았습니다. 사용자 정보에서 블로그 ID를 설정해주세요.');
            return;
        }

        if (!this.webview) {
            alert('WebView가 준비되지 않았습니다.');
            return;
        }

        const blogUrl = `https://blog.naver.com/${this.userBlogId}`;
        console.log('Navigating to user blog:', blogUrl);
        this.webview.src = blogUrl;
    }

    async createPostFromMarkdown() {
        if (!this.isLoggedIn) {
            alert('먼저 로그인해주세요.')
            return
        }

        // 추가 로그인 상태 확인
        console.log('Detailed login status check:')
        console.log('isLoggedIn:', this.isLoggedIn)
        console.log('userBlogId:', this.userBlogId)
        console.log('Available cookies:', Object.keys(this.cookies))

        const loginRequiredCookies = ['nid_inf', 'NID_SES']
        loginRequiredCookies.forEach(cookie => {
            const exists = !!(this.cookies[cookie] && this.cookies[cookie].length > 0)
            console.log(`  ${cookie}: ${exists ? 'PRESENT' : 'MISSING'}`)
        })

        if (!this.userBlogId) {
            alert('블로그 ID가 설정되지 않았습니다. 사용자 정보에서 블로그 ID를 설정해주세요.')
            return
        }

        const markdownInput = document.getElementById('markdownInput')
        const markdown = markdownInput.value.trim()

        if (!markdown) {
            alert('마크다운 내용을 입력해주세요.')
            return
        }

        console.log('Creating post from markdown...')
        console.log('Original markdown:', markdown)

        const parsed = this.parseMarkdown(markdown)
        console.log('Parsed markdown:', parsed)

        // convertToNaverBlogFormat으로 변환하여 components 생성
        const linkOption = document.getElementById('linkProcessingOption').value;
        const components = await this.convertToNaverBlogFormat(parsed.title, parsed.paragraphs, linkOption)
        console.log('Converted components:', components)

        try {
            // 잘되는 샘플글과 동일한 방식으로 전체 documentModel 생성
            const fullDocumentModel = {
                documentId: "",
                document: {
                    version: "2.8.10",
                    theme: "default",
                    language: "ko-KR",
                    id: this.generateId(),
                    components: components,
                    di: {
                        dif: false,
                        dio: [
                            {
                                dis: "N",
                                dia: {
                                    t: 0,
                                    p: 0,
                                    st: 318,
                                    sk: 93
                                }
                            },
                            {
                                dis: "N",
                                dia: {
                                    t: 0,
                                    p: 0,
                                    st: 318,
                                    sk: 93
                                }
                            }
                        ]
                    }
                }
            }

            console.log('=== Full DocumentModel (matching working sample) ===')
            console.log('DocumentModel ID:', fullDocumentModel.document.id)
            console.log('Components count:', components.length)
            console.log('DI field included:', !!fullDocumentModel.document.di)

            const result = await this.sendBlogAPIRequestWithDocumentModel(fullDocumentModel)
            console.log('Markdown post creation result:', result)

            // 응답 내용 상세 분석
            console.log('Full API response:', result)

            if (result.data) {
                try {
                    const responseData = JSON.parse(result.data.trim())
                    console.log('Parsed response:', responseData)

                    if (responseData.isSuccess === false) {
                        console.error('Naver API Error:', responseData)
                        console.error('Full error details:', JSON.stringify(responseData, null, 2))
                        const errorMessage = responseData.result ?
                            (typeof responseData.result === 'object' ?
                                JSON.stringify(responseData.result, null, 2) :
                                responseData.result) :
                            '알 수 없는 오류'

                        // 추가 디버깅 정보
                        console.error('Login status at error time:', {
                            isLoggedIn: this.isLoggedIn,
                            userBlogId: this.userBlogId,
                            hasNidInf: !!(this.cookies['nid_inf'] && this.cookies['nid_inf'].length > 0),
                            hasNidSes: !!(this.cookies['NID_SES'] && this.cookies['NID_SES'].length > 0)
                        })

                        alert(`네이버 API 오류:\n${errorMessage}\n\n가능한 원인:\n- 블로그 ID 확인\n- 로그인 상태 확인\n- 블로그 쓰기 권한 확인\n\n콘솔에서 자세한 오류 정보를 확인해주세요.`)
                        return
                    }
                } catch (parseError) {
                    console.error('Response parsing error:', parseError)
                    console.error('Raw response data:', result.data)
                }
            }

            if (result.success) {
                alert('마크다운 글이 성공적으로 작성되었습니다!')
                markdownInput.value = '' // 입력 필드 초기화
            } else {
                const errorMessage = result.message || '알 수 없는 오류'
                console.error('API request failed:', result)
                alert(`글 작성에 실패했습니다: ${errorMessage}\n\n콘솔에서 자세한 오류 정보를 확인해주세요.`)
            }
        } catch (error) {
            console.error('Markdown post creation error:', error)
            alert('글 작성 중 오류가 발생했습니다: ' + error.message)
        }
    }

    parseMarkdown(markdown) {
        const lines = markdown.split('\n')
        let title = '마크다운 글'
        const paragraphs = []
        let currentParagraph = ''
        let quoteContent = ''

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim()

            // 제목 처리 (# 으로 시작)
            if (line.startsWith('# ') && i === 0) {
                title = line.substring(2).trim()
                continue
            }

            // 소제목 처리 (## 으로 시작)
            if (line.startsWith('## ')) {
                if (currentParagraph) {
                    paragraphs.push({ type: 'text', content: currentParagraph.trim() })
                    currentParagraph = ''
                }
                const subtitle = line.substring(3).trim()
                paragraphs.push({ type: 'subtitle', content: subtitle })
                continue
            }

            // 인용구 처리 (> 으로 시작)
            if (line.startsWith('> ')) {
                if (currentParagraph) {
                    paragraphs.push({ type: 'text', content: currentParagraph.trim() })
                    currentParagraph = ''
                }
                quoteContent = line.substring(2).trim()
                paragraphs.push({ type: 'quote', content: quoteContent })
                continue
            }

            // 리스트 처리 (- 항목 또는 1. 항목)
            const listMatch = line.match(/^([ \t]*)([-*]|\d+\.)\s+(.+)$/)
            if (listMatch) {
                if (currentParagraph) {
                    paragraphs.push({ type: 'text', content: currentParagraph.trim() })
                    currentParagraph = ''
                }

                const indent = listMatch[1].length
                const listMarker = listMatch[2]
                const itemText = listMatch[3].trim()

                // 리스트 레벨 계산 (2 spaces per level)
                const level = Math.floor(indent / 2)

                // 리스트 타입 결정
                const listType = listMarker === '-' || listMarker === '*' ? 'bullet' : 'number'

                // 리스트 항목의 스타일된 텍스트 파싱
                const styledNodes = this.parseStyledText(itemText)

                paragraphs.push({
                    type: 'list',
                    content: itemText,
                    listType: listType,
                    level: level,
                    styledNodes: styledNodes
                })
                continue
            }

            // 링크 처리 ([텍스트](URL))
            const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/)
            if (linkMatch) {
                if (currentParagraph) {
                    paragraphs.push({ type: 'text', content: currentParagraph.trim() })
                    currentParagraph = ''
                }

                const linkText = linkMatch[1]
                const url = linkMatch[2]

                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    paragraphs.push({ type: 'youtube', url: url, title: linkText })
                } else if (this.isImageUrl(url)) {
                    paragraphs.push({ type: 'image', url: url, alt: linkText })
                } else {
                    // 일반 링크는 text와 oglink 컴포넌트로 분리
                    paragraphs.push({ type: 'link', url: url, text: linkText })
                }
                continue
            }

            // 빈 줄 처리
            if (line === '') {
                if (currentParagraph) {
                    const styledNodes = this.parseStyledText(currentParagraph.trim())
                    paragraphs.push({ type: 'text', content: currentParagraph.trim(), styledNodes: styledNodes })
                    currentParagraph = ''
                }
                continue
            }

            // 일반 텍스트
            if (currentParagraph) {
                currentParagraph += ' '
            }
            currentParagraph += line
        }

        // 마지막 단락 처리
        if (currentParagraph) {
            const styledNodes = this.parseStyledText(currentParagraph.trim())
            paragraphs.push({ type: 'text', content: currentParagraph.trim(), styledNodes: styledNodes })
        }

        return { title, paragraphs }
    }

    // 볼드 및 색상 텍스트 파싱 함수
    parseStyledText(text) {
        const nodes = []
        let currentIndex = 0

        while (currentIndex < text.length) {
            // 볼드 처리
            const boldStart = text.indexOf('**', currentIndex)

            // 색상 처리: 텍스트(색상코드) 형식
            const colorMatch = text.substring(currentIndex).match(/^(.+?)\(#([0-9A-Fa-f]{6})\)/)

            let nextSegment = null
            let segmentType = 'normal'
            let segmentEnd = text.length

            if (boldStart !== -1 && boldStart >= currentIndex) {
                // 볼드 처리 우선
                if (colorMatch && colorMatch.index < boldStart - currentIndex) {
                    // 색상이 더 먼저 나옴
                    nextSegment = {
                        type: 'color',
                        text: colorMatch[1],
                        color: colorMatch[2]
                    }
                    segmentEnd = currentIndex + colorMatch[0].length
                } else {
                    // 볼드가 더 먼저 나옴
                    const boldEnd = text.indexOf('**', boldStart + 2)
                    if (boldEnd !== -1) {
                        nextSegment = {
                            type: 'bold',
                            text: text.substring(boldStart + 2, boldEnd)
                        }
                        segmentEnd = boldEnd + 2
                    } else {
                        // 볼드 종료 없음
                        break
                    }
                }
            } else if (colorMatch) {
                // 색상 처리
                nextSegment = {
                    type: 'color',
                    text: colorMatch[1],
                    color: colorMatch[2]
                }
                segmentEnd = currentIndex + colorMatch[0].length
            } else {
                // 일반 텍스트
                break
            }

            // 이전 텍스트 처리
            if (currentIndex < (boldStart !== -1 && boldStart >= currentIndex ? boldStart : segmentEnd)) {
                const beforeText = text.substring(currentIndex, nextSegment.type === 'bold' ? boldStart : segmentEnd)
                if (beforeText) {
                    nodes.push({
                        type: 'normal',
                        text: beforeText
                    })
                }
            }

            if (nextSegment) {
                nodes.push(nextSegment)
                currentIndex = segmentEnd
            } else {
                break
            }
        }

        // 나머지 텍스트
        if (currentIndex < text.length) {
            nodes.push({
                type: 'normal',
                text: text.substring(currentIndex)
            })
        }

        return nodes
    }

    isImageUrl(url) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
        const lowerUrl = url.toLowerCase()
        return imageExtensions.some(ext => lowerUrl.includes(ext)) ||
               lowerUrl.includes('pixabay.com') ||
               lowerUrl.includes('pexels.com') ||
               lowerUrl.includes('unsplash.com')
    }

    async convertToNaverBlogFormat(title, paragraphs, linkOption = 'upconvert') {
        const components = []

        // 제목 컴포넌트
        components.push({
            id: this.generateSEId(),
            layout: "default",
            title: [{
                id: this.generateSEId(),
                nodes: [{
                    id: this.generateSEId(),
                    value: title,
                    style: {
                        fontFamily: "nanumbareunhipi",
                        "@ctype": "nodeStyle"
                    },
                    "@ctype": "textNode"
                }],
                "@ctype": "paragraph"
            }],
            subTitle: null,
            align: "left",
            "@ctype": "documentTitle"
        })

        // 단락 컴포넌트들
        for (const paragraph of paragraphs) {
            if (paragraph.type === 'quote') {
                // 인용구 컴포넌트
                components.push({
                    id: this.generateSEId(),
                    layout: "quotation_line",
                    value: [{
                        id: this.generateSEId(),
                        nodes: [{
                            id: this.generateSEId(),
                            value: paragraph.content,
                            "@ctype": "textNode"
                        }],
                        "@ctype": "paragraph"
                    }],
                    source: null,
                    "@ctype": "quotation"
                })
            } else if (paragraph.type === 'youtube') {
                // YouTube도 oglink 컴포넌트로 처리 (일관성 유지)
                console.log('Processing YouTube as oglink:', paragraph.url);
                const preview = await this.fetchLinkPreview(paragraph.url);
                console.log('YouTube oglink preview:', preview);

                // 텍스트 컴포넌트
                components.push({
                    id: this.generateSEId(),
                    layout: "default",
                    value: [{
                        id: this.generateSEId(),
                        nodes: [{
                            id: this.generateSEId(),
                            value: paragraph.text || preview.title,
                            link: {
                                url: paragraph.url,
                                "@ctype": "link"
                            },
                            style: {
                                fontFamily: "nanumbareunhipi",
                                "@ctype": "nodeStyle"
                            },
                            "@ctype": "textNode"
                        }],
                        "@ctype": "paragraph"
                    }],
                    "@ctype": "text"
                });

                // oglink 컴포넌트 생략 - 단순 하이퍼링크로만 처리
            } else if (paragraph.type === 'subtitle') {
                // 소제목 컴포넌트
                components.push({
                    id: this.generateSEId(),
                    layout: "default",
                    title: [{
                        id: this.generateSEId(),
                        nodes: [{
                            id: this.generateSEId(),
                            value: paragraph.content,
                            style: {
                                fontFamily: "nanumbareunhipi",
                                "@ctype": "nodeStyle"
                            },
                            "@ctype": "textNode"
                        }],
                        "@ctype": "paragraph"
                    }],
                    "@ctype": "sectionTitle"
                })
            } else if (paragraph.type === 'image') {
                // 이미지 컴포넌트
                components.push({
                    id: this.generateSEId(),
                    layout: "default",
                    src: paragraph.url,
                    internalResource: false,
                    represent: false,
                    domain: "https://blogfiles.pstatic.net",
                    fileSize: 0,
                    width: 693,
                    widthPercentage: 0,
                    height: 924,
                    originalWidth: 960,
                    originalHeight: 1280,
                    caption: null,
                    format: "normal",
                    displayFormat: "normal",
                    imageLoaded: true,
                    contentMode: "fit",
                    origin: {
                        srcFrom: "copyUrl",
                        "@ctype": "imageOrigin"
                    },
                    ai: false,
                    "@ctype": "image"
                })
            } else if (paragraph.type === 'list') {
                // 리스트 컴포넌트
                console.log('Processing list:', paragraph);

                // 스타일이 적용된 텍스트 노드 생성 (볼드, 색상 지원)
                const styledNodes = paragraph.styledNodes || [{ type: 'normal', text: paragraph.content }]
                const nodes = []

                for (const node of styledNodes) {
                    const style = {
                        fontFamily: "nanumbareunhipi",
                        "@ctype": "nodeStyle"
                    }

                    if (node.type === 'bold') {
                        style.fontWeight = "bold"
                    } else if (node.type === 'color') {
                        style.color = node.color
                    }

                    nodes.push({
                        id: this.generateSEId(),
                        value: node.text,
                        style: style,
                        "@ctype": "textNode"
                    })
                }

                // 리스트 스타일 생성
                const listStyle = {
                    type: paragraph.listType === 'bullet' ? "bullet" : "number",
                    level: paragraph.level || 0,
                    "@ctype": "paragraphListStyle"
                }

                // 전체 단락 스타일
                const paragraphStyle = {
                    dropCap: false,
                    list: listStyle,
                    "@ctype": "paragraphStyle"
                }

                components.push({
                    id: this.generateSEId(),
                    layout: "default",
                    value: [{
                        id: this.generateSEId(),
                        nodes: nodes,
                        style: paragraphStyle,
                        "@ctype": "paragraph"
                    }],
                    "@ctype": "text"
                })
            } else if (paragraph.type === 'link') {
                // 링크 컴포넌트 - 선택된 옵션에 따라 처리
                console.log('Processing link with option:', linkOption, paragraph.url);

                if (linkOption === 'upconvert') {
                    // Upconvert API 사용
                    const linkHtml = `<a href="${paragraph.url}">${paragraph.text || paragraph.url}</a>`;
                    try {
                        const naverComponents = await this.convertLinkWithUpconvertAPI(linkHtml);
                        console.log('Upconvert API result:', naverComponents);

                        if (naverComponents && naverComponents.length > 0) {
                            components.push(...naverComponents);
                        } else {
                            console.log('Upconvert API failed, falling back to simple link');
                            this.addSimpleLinkComponent(components, paragraph);
                        }
                    } catch (error) {
                        console.error('Upconvert API error, using fallback:', error);
                        this.addSimpleLinkComponent(components, paragraph);
                    }
                } else if (linkOption === 'simple') {
                    // 단순 텍스트 링크
                    this.addSimpleLinkComponent(components, paragraph);
                } else if (linkOption === 'oglink') {
                    // OGLink 카드
                    this.addOgLinkComponent(components, paragraph);
                }
            } else {
                // 일반 텍스트 컴포넌트 - 볼드 및 색상 파싱 지원
                const styledNodes = paragraph.styledNodes || [{ type: 'normal', text: paragraph.content }]
                const nodes = styledNodes.map(node => ({
                    id: this.generateSEId(),
                    value: node.text,
                    style: {
                        fontFamily: "nanumbareunhipi",
                        ...(node.type === 'bold' ? { bold: true } : {}),
                        ...(node.type === 'color' ? { fontColor: `#${node.color}` } : {}),
                        "@ctype": "nodeStyle"
                    },
                    "@ctype": "textNode"
                }))

                components.push({
                    id: this.generateSEId(),
                    layout: "default",
                    value: [{
                        id: this.generateSEId(),
                        nodes: nodes,
                        "@ctype": "paragraph"
                    }],
                    "@ctype": "text"
                })
            }
        }

        return components
    }

    splitIntoSentences(text) {
        // 마크다운 텍스트는 자연스러운 단락으로 유지
        // 너무 세분화하지 않고 전체를 하나로 처리
        return [text]
    }

    // 단락을 여러 문장으로 분리하여 개별 paragraph 생성
    createParagraphsFromText(text) {
        const sentences = this.splitIntoSentences(text)
        return sentences.map(sentence => ({
            id: this.generateSEId(),
            nodes: [{
                id: this.generateSEId(),
                value: sentence,
                style: {
                    fontFamily: "nanumbareunhipi",
                    "@ctype": "nodeStyle"
                },
                "@ctype": "textNode"
            }],
            "@ctype": "paragraph"
        }))
    }

    async sendBlogAPIRequestWithData(components) {
        // 동적으로 블로그 ID 확보
        let blogId = this.userBlogId || null
        if (!blogId && this.webview) {
            try {
                blogId = await this.webview.executeJavaScript(`(function(){
                    try {
                        const systemPages = ['PostView.naver', 'RabbitWrite.naver', 'postwrite', 'BlogHome.naver', 'BlogMenuBar.naver', 'BlogView.naver'];

                        // 일반 블로그 URL에서 추출
                        const m = (window.location.href || '').match(/blog\\.naver\\.com\\/([^\\/\\?]+)/);
                        if (m && m[1] && !systemPages.includes(m[1])) {
                            return m[1];
                        }

                        // section.blog.naver.com에서 blogId 파라미터 추출
                        const sectionMatch = (window.location.href || '').match(/section\\.blog\\.naver\\.com.*[?&]blogId=([a-zA-Z0-9_-]+)/);
                        if (sectionMatch && sectionMatch[1]) {
                            return sectionMatch[1];
                        }

                        return null;
                    } catch(e){ return null; }
                })();`)
            } catch (_) {
                blogId = null
            }
        }

        if (!blogId) {
            return { success: false, message: '블로그 ID를 찾을 수 없습니다. 블로그 홈으로 이동한 뒤 다시 시도해주세요.' }
        }

        // RabbitWrite API용 document 구조 (마크다운에서 변환)
        const documentModel = {
            documentId: "",  // 새 글은 빈 문자열
            document: {
                version: "2.8.10",
                theme: "default",
                language: "ko-KR",
                id: this.generateId(),
                di: {
                    dif: false,
                    dio: [
                        {
                            dis: "N",
                            dia: {
                                t: 0,
                                p: 0,
                                st: 318,
                                sk: 93
                            }
                        },
                        {
                            dis: "N",
                            dia: {
                                t: 0,
                                p: 0,
                                st: 318,
                                sk: 93
                            }
                        }
                    ]
                },
                components: components
            }
        }

        const populationParams = {
            configuration: {
                openType: 0,
                commentYn: true,
                searchYn: false,
                sympathyYn: false,
                scrapType: 0,
                outSideAllowYn: false,
                twitterPostingYn: false,
                facebookPostingYn: false,
                cclYn: false
            },
            populationMeta: {
                categoryId: 1,
                logNo: 0,
                directorySeq: 0,
                directoryDetail: null,
                mrBlogTalkCode: null,
                postWriteTimeType: "now",
                tags: "",
                moviePanelParticipation: false,
                greenReviewBannerYn: false,
                continueSaved: false,
                noticePostYn: false,
                autoByCategoryYn: false,
                postLocationSupportYn: false,
                postLocationJson: null,
                prePostDate: null,
                thisDayPostInfo: null,
                scrapYn: false,
                autoSaveNo: Date.now()
            },
            editorSource: "4I0ix70hXGPBHQA2KadBEg=="
        }

        const requestData = {
            blogId: blogId,
            documentModel: JSON.stringify(documentModel),
            mediaResources: JSON.stringify({ image: [], video: [], file: [] }),
            populationParams: JSON.stringify(populationParams),
            productApiVersion: 'v1'
        }

        console.log('=== Markdown API Request Debug ===')
        console.log('BlogId:', blogId)
        console.log('Components count:', components.length)
        console.log('DocumentModel:', documentModel)
        console.log('RequestData keys:', Object.keys(requestData))
        console.log('MediaResources:', requestData.mediaResources)
        console.log('PopulationParams:', requestData.populationParams)

        // 먼저 임시 저장을 시도
        console.log('=== 임시 저장 시도 ===')
        const tempSaveResult = await this.makeRequestFromWebview('https://blog.naver.com/RabbitWrite.naver', requestData, { blogId })

        console.log('Temp save result:', tempSaveResult)

        if (tempSaveResult.success && tempSaveResult.data) {
            try {
                const tempResponse = JSON.parse(tempSaveResult.data.trim())

                if (tempResponse.isSuccess && tempResponse.result && tempResponse.result.documentId) {
                    // 임시 저장 성공 시 documentId로 발행 시도
                    const documentId = tempResponse.result.documentId
                    console.log('임시 저장 성공, documentId:', documentId)

                    // 발행 요청
                    const publishData = {
                        ...requestData,
                        documentModel: JSON.stringify({
                            ...JSON.parse(requestData.documentModel),
                            documentId: documentId
                        })
                    }

                    console.log('=== 발행 시도 ===')
                    return await this.makeRequestFromWebview('https://blog.naver.com/RabbitWrite.naver', publishData, { blogId })
                }
            } catch (parseError) {
                console.error('Temp save response parsing error:', parseError)
            }
        }

        return tempSaveResult
    }

    // 샘플 데이터로 글 작성 (curl 요청의 documentModel 사용)
    async createSamplePost() {
        console.log('Creating sample post from documentModel...')

        // 샘플 documentModel 데이터 (curl 요청에서 추출)
        const sampleDocumentModel = {
            documentId: "",
            document: {
                version: "2.8.10",
                theme: "default",
                language: "ko-KR",
                id: this.generateId(),
                components: [
                    {
                        id: this.generateSEId(),
                        layout: "default",
                        title: [
                            {
                                id: this.generateSEId(),
                                nodes: [
                                    {
                                        id: this.generateSEId(),
                                        value: "샘플 글 제목",
                                        style: {
                                            fontFamily: "nanumbareunhipi",
                                            "@ctype": "nodeStyle"
                                        },
                                        "@ctype": "textNode"
                                    }
                                ],
                                "@ctype": "paragraph"
                            }
                        ],
                        subTitle: null,
                        align: "left",
                        "@ctype": "documentTitle"
                    },
                    {
                        id: this.generateSEId(),
                        layout: "default",
                        value: [
                            {
                                id: this.generateSEId(),
                                nodes: [
                                    {
                                        id: this.generateSEId(),
                                        value: "이것은 샘플 본문입니다. documentModel 데이터를 그대로 사용하여 작성한 글입니다.",
                                        style: {
                                            fontFamily: "nanumbareunhipi",
                                            "@ctype": "nodeStyle"
                                        },
                                        "@ctype": "textNode"
                                    }
                                ],
                                "@ctype": "paragraph"
                            }
                        ],
                        "@ctype": "text"
                    },
                    {
                        id: this.generateSEId(),
                        layout: "quotation_line",
                        value: [
                            {
                                id: this.generateSEId(),
                                nodes: [
                                    {
                                        id: this.generateSEId(),
                                        value: "이것은 인용문 샘플입니다.",
                                        "@ctype": "textNode"
                                    }
                                ],
                                "@ctype": "paragraph"
                            }
                        ],
                        source: null,
                        "@ctype": "quotation"
                    },
                    {
                        id: this.generateSEId(),
                        layout: "large_image",
                        title: "YouTube",
                        domain: "www.youtube.com",
                        link: "https://www.youtube.com",
                        thumbnail: {
                            src: "https://www.youtube.com/img/desktop/yt_1200.png",
                            width: 1200,
                            height: 1200,
                            "@ctype": "thumbnail"
                        },
                        description: "YouTube에서 마음에 드는 동영상과 음악을 감상하고, 직접 만든 콘텐츠를 업로드하여 친구, 가족뿐만 아니라 전 세계 사람들과 콘텐츠를 공유할 수 있습니다.",
                        video: false,
                        oglinkSign: "Ub2GJaay33GnzOcInKXBCIubN2t5LrWC7is7G-rP_-A__v1.0",
                        "@ctype": "oglink"
                    },
                    {
                        id: this.generateSEId(),
                        layout: "default",
                        src: "https://cdn.pixabay.com/photo/2021/10/21/14/03/cats-6729197_1280.jpg",
                        internalResource: false,
                        represent: false,
                        domain: "https://blogfiles.pstatic.net",
                        fileSize: 0,
                        width: 693,
                        widthPercentage: 0,
                        height: 924,
                        originalWidth: 960,
                        originalHeight: 1280,
                        caption: null,
                        format: "normal",
                        displayFormat: "normal",
                        imageLoaded: true,
                        contentMode: "fit",
                        origin: {
                            srcFrom: "copyUrl",
                            "@ctype": "imageOrigin"
                        },
                        ai: false,
                        "@ctype": "image"
                    }
                ],
                di: {
                    dif: false,
                    dio: [
                        {
                            dis: "N",
                            dia: {
                                t: 0,
                                p: 0,
                                st: 318,
                                sk: 93
                            }
                        },
                        {
                            dis: "N",
                            dia: {
                                t: 0,
                                p: 0,
                                st: 318,
                                sk: 93
                            }
                        }
                    ]
                }
            }
        }

        try {
            const result = await this.sendBlogAPIRequestWithDocumentModel(sampleDocumentModel)
            console.log('Sample post creation result:', result)

            if (result.success) {
                alert('샘플 글이 성공적으로 작성되었습니다!')
            } else {
                alert('샘플 글 작성에 실패했습니다: ' + (result.message || '알 수 없는 오류'))
            }
        } catch (error) {
            console.error('Sample post creation error:', error)
            alert('샘플 글 작성 중 오류가 발생했습니다: ' + error.message)
        }
    }

    // 마크다운 샘플 파일로 글 작성
    async createSamplePostFromMarkdown() {
        console.log('Creating sample post from markdown file...')

        // sample.md 파일 내용
        const sampleMarkdown = `# 블로그 글 작성 예시

이것은 일본 본문입니다. 여러 문장으로 구성된 단락입니다. 마크다운 형식으로 작성하면 네이버 블로그에 자동으로 변환됩니다.

두 번째 단락입니다. 인용문, YouTube 링크, 이미지 링크를 포함한 다양한 요소들을 테스트해볼 수 있습니다.

> 이것은 인용문입니다. 블로그에서 중요한 내용을 강조할 때 사용합니다. 여러 줄에 걸친 인용문도 가능합니다.

[YouTube 링크 예시](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

[고양이 이미지](https://cdn.pixabay.com/photo/2021/10/21/14/03/cats-6729197_1280.jpg)

[네이버](https://www.naver.com)

[깃허브](www.github.com)

마지막 단락입니다. 모든 요소가 잘 변환되는지 확인해보세요!`

        console.log('=== Original Markdown ===')
        console.log(sampleMarkdown)

        try {
            const parsed = this.parseMarkdown(sampleMarkdown)
            console.log('=== Parsed Result ===')
            console.log('Title:', parsed.title)
            console.log('Paragraphs:', JSON.stringify(parsed.paragraphs, null, 2))

            const linkOption = document.getElementById('linkProcessingOption').value;
        const components = await this.convertToNaverBlogFormat(parsed.title, parsed.paragraphs, linkOption)
            console.log('=== Converted Components ===')
            console.log('Number of components:', components.length)
            components.forEach((comp, index) => {
                console.log(`Component ${index}: ${comp['@ctype']} (layout: ${comp.layout})`)
            })
            console.log(JSON.stringify(components, null, 2))

            // 디버깅: 샘플 데이터와 비교
            console.log('=== DEBUG: Comparing with sample structure ===')
            console.log('First component (title):', components[0])
            console.log('First component keys:', Object.keys(components[0]))

            // 변환된 documentModel 생성 및 파일로 저장
            const documentModel = {
                documentId: "",
                document: {
                    version: "2.8.10",
                    theme: "default",
                    language: "ko-KR",
                    id: this.generateId(),
                    components: components
                }
            }

            console.log('=== Generated DocumentModel ===')
            console.log(JSON.stringify(documentModel, null, 2))

            // 파일로 저장 (Electron 환경에서)
            try {
                const fs = require('fs')
                const path = require('path')
                const filePath = path.join(__dirname, 'converted_documentModel.json')
                fs.writeFileSync(filePath, JSON.stringify(documentModel, null, 2))
                console.log('DocumentModel saved to:', filePath)
            } catch (e) {
                console.log('Cannot save file in browser environment, but structure is valid')
            }

            // 잘되는 샘플글과 동일한 방식으로 전체 documentModel 생성
            const fullDocumentModel = {
                documentId: "",
                document: {
                    version: "2.8.10",
                    theme: "default",
                    language: "ko-KR",
                    id: this.generateId(),
                    components: components,
                    di: {
                        dif: false,
                        dio: [
                            {
                                dis: "N",
                                dia: {
                                    t: 0,
                                    p: 0,
                                    st: 318,
                                    sk: 93
                                }
                            },
                            {
                                dis: "N",
                                dia: {
                                    t: 0,
                                    p: 0,
                                    st: 318,
                                    sk: 93
                                }
                            }
                        ]
                    }
                }
            }

            console.log('=== Full DocumentModel (matching working sample) ===')
            console.log('DocumentModel ID:', fullDocumentModel.document.id)
            console.log('Components count:', components.length)
            console.log('DI field included:', !!fullDocumentModel.document.di)

            const result = await this.sendBlogAPIRequestWithDocumentModel(fullDocumentModel)
            console.log('Sample markdown post creation result:', result)

            if (result.success) {
                alert('마크다운 샘플 글이 성공적으로 작성되었습니다!')
            } else {
                alert('마크다운 샘플 글 작성에 실패했습니다: ' + (result.message || '알 수 없는 오류'))
            }
        } catch (error) {
            console.error('Sample markdown post creation error:', error)
            alert('마크다운 샘플 글 작성 중 오류가 발생했습니다: ' + error.message)
        }
    }

    // documentModel을 직접 사용하여 API 요청 전송
    async sendBlogAPIRequestWithDocumentModel(documentModel) {
        // 동적으로 블로그 ID 확보
        let blogId = this.userBlogId || null
        if (!blogId && this.webview) {
            try {
                blogId = await this.webview.executeJavaScript(`(function(){
                    try {
                        const systemPages = ['PostView.naver', 'RabbitWrite.naver', 'postwrite', 'BlogHome.naver', 'BlogMenuBar.naver', 'BlogView.naver'];

                        // 일반 블로그 URL에서 추출
                        const m = (window.location.href || '').match(/blog\\.naver\\.com\\/([^\\/\\?]+)/);
                        if (m && m[1] && !systemPages.includes(m[1])) {
                            return m[1];
                        }

                        // section.blog.naver.com에서 blogId 파라미터 추출
                        const sectionMatch = (window.location.href || '').match(/section\\.blog\\.naver\\.com.*[?&]blogId=([a-zA-Z0-9_-]+)/);
                        if (sectionMatch && sectionMatch[1]) {
                            return sectionMatch[1];
                        }

                        return null;
                    } catch(e){ return null; }
                })();`)
            } catch (_) {
                blogId = null
            }
        }

        if (!blogId) {
            return { success: false, message: '블로그 ID를 찾을 수 없습니다. 블로그 홈으로 이동한 뒤 다시 시도해주세요.' }
        }

        const populationParams = {
            configuration: {
                openType: 0,
                commentYn: true,
                searchYn: false,
                sympathyYn: false,
                scrapType: 0,
                outSideAllowYn: false,
                twitterPostingYn: false,
                facebookPostingYn: false,
                cclYn: false
            },
            populationMeta: {
                categoryId: 1,
                logNo: 0,
                directorySeq: 0,
                directoryDetail: null,
                mrBlogTalkCode: null,
                postWriteTimeType: "now",
                tags: "",
                moviePanelParticipation: false,
                greenReviewBannerYn: false,
                continueSaved: false,
                noticePostYn: false,
                autoByCategoryYn: false,
                postLocationSupportYn: false,
                postLocationJson: null,
                prePostDate: null,
                thisDayPostInfo: null,
                scrapYn: false,
                autoSaveNo: Date.now()
            },
            editorSource: "4I0ix70hXGPBHQA2KadBEg=="
        }

        const requestData = {
            blogId: blogId,
            documentModel: JSON.stringify(documentModel),
            mediaResources: JSON.stringify({ image: [], video: [], file: [] }),
            populationParams: JSON.stringify(populationParams),
            productApiVersion: 'v1'
        }

        console.log('=== Sample DocumentModel API Request Debug ===')
        console.log('BlogId:', blogId)
        console.log('isLoggedIn:', this.isLoggedIn)
        console.log('Required cookies present:', {
            nid_inf: !!(this.cookies['nid_inf'] && this.cookies['nid_inf'].length > 0),
            NID_SES: !!(this.cookies['NID_SES'] && this.cookies['NID_SES'].length > 0)
        })
        console.log('DocumentModel:', JSON.stringify(documentModel, null, 2))
        console.log('RequestData keys:', Object.keys(requestData))

        // 임시 저장 후 발행 시도
        console.log('=== 임시 저장 시도 ===')
        console.log('Request URL: https://blog.naver.com/RabbitWrite.naver')
        console.log('Request Data:', requestData)
        const tempSaveResult = await this.makeRequestFromWebview('https://blog.naver.com/RabbitWrite.naver', requestData, { blogId })

        console.log('Temp save result:', tempSaveResult)

        if (tempSaveResult.success && tempSaveResult.data) {
            try {
                const tempResponse = JSON.parse(tempSaveResult.data.trim())

                if (tempResponse.isSuccess && tempResponse.result && tempResponse.result.documentId) {
                    const documentId = tempResponse.result.documentId
                    console.log('임시 저장 성공, documentId:', documentId)

                    const publishData = {
                        ...requestData,
                        documentModel: JSON.stringify({
                            ...JSON.parse(requestData.documentModel),
                            documentId: documentId
                        })
                    }

                    console.log('=== 발행 시도 ===')
                    return await this.makeRequestFromWebview('https://blog.naver.com/RabbitWrite.naver', publishData, { blogId })
                }
            } catch (parseError) {
                console.error('Temp save response parsing error:', parseError)
            }
        }

        return tempSaveResult
    }

    // Firebase 인증 설정
    async setupFirebaseAuth() {
        try {

            if (firebaseAuth) {
                // Firebase 인증 상태 리스너 설정
                firebaseAuth.onAuthStateChanged((user) => {
                    this.updateFirebaseUI(user);
                    this.syncBlogIdFromStorage();
                });

                // Firebase 인증 버튼 이벤트 리스너 설정
                this.setupFirebaseEventListeners();

                console.log('Firebase auth setup completed');
            } else {
                console.log('Firebase auth not available');
            }

            this.syncBlogIdFromStorage();
        } catch (error) {
            console.error('Firebase auth setup error:', error);
        }
    }

    // Firebase 이벤트 리스너 설정
    setupFirebaseEventListeners() {
        // Google 로그인 버튼
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', () => this.handleGoogleSignIn());
        }

        // 이메일 로그인 버튼
        const emailSignInBtn = document.getElementById('emailSignInBtn');
        if (emailSignInBtn) {
            emailSignInBtn.addEventListener('click', () => this.showEmailAuthModal('login'));
        }

        // 회원가입 버튼
        const emailSignUpBtn = document.getElementById('emailSignUpBtn');
        if (emailSignUpBtn) {
            emailSignUpBtn.addEventListener('click', () => this.showEmailAuthModal('signup'));
        }

        // 로그아웃 버튼
        const signOutBtn = document.getElementById('firebaseSignOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.handleSignOut());
        }

        // 이메일 인증 모달 관련 이벤트
        this.setupEmailAuthModalEvents();
    }

    // 이메일 인증 모달 이벤트 설정
    setupEmailAuthModalEvents() {
        const modal = document.getElementById('emailAuthModal');
        const closeBtn = document.getElementById('closeEmailAuthModal');
        const form = document.getElementById('emailAuthForm');
        const modeSwitchBtn = document.getElementById('authModeSwitchBtn');
        const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideEmailAuthModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideEmailAuthModal();
                }
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => this.handleEmailAuthSubmit(e));
        }

        if (modeSwitchBtn) {
            modeSwitchBtn.addEventListener('click', () => this.switchAuthMode());
        }

        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', () => this.handleForgotPassword());
        }
    }

    // Google 로그인 처리
    async handleGoogleSignIn() {
        if (!firebaseAuth) {
            alert('Firebase 인증이 준비되지 않았습니다.');
            return;
        }

        try {
            console.log('Starting Google sign-in...');
            const user = await firebaseAuth.signInWithGoogle();
            console.log('Google sign-in successful:', user);
            this.showNotification('Google 로그인 성공!', 'success');
        } catch (error) {
            console.error('Google sign-in error:', error);
            this.showNotification('Google 로그인에 실패했습니다.', 'error');
        }
    }

    // 이메일 인증 모달 표시
    showEmailAuthModal(mode = 'login') {
        const modal = document.getElementById('emailAuthModal');
        const title = document.getElementById('emailAuthModalTitle');
        const submitBtn = document.getElementById('emailAuthSubmitBtn');
        const confirmPasswordDiv = document.getElementById('confirmPasswordDiv');
        const switchText = document.getElementById('authModeSwitchText');
        const switchBtn = document.getElementById('authModeSwitchBtn');

        this.authMode = mode;

        if (mode === 'signup') {
            title.textContent = '회원가입';
            submitBtn.textContent = '회원가입';
            confirmPasswordDiv.classList.remove('hidden');
            switchText.textContent = '이미 계정이 있으신가요?';
            switchBtn.textContent = '로그인';
        } else {
            title.textContent = '이메일 로그인';
            submitBtn.textContent = '로그인';
            confirmPasswordDiv.classList.add('hidden');
            switchText.textContent = '계정이 없으신가요?';
            switchBtn.textContent = '회원가입';
        }

        // 폼 초기화
        document.getElementById('emailAuthForm').reset();
        this.hideEmailAuthMessage();

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    // 이메일 인증 모달 숨기기
    hideEmailAuthModal() {
        const modal = document.getElementById('emailAuthModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    // 인증 모드 전환
    switchAuthMode() {
        const newMode = this.authMode === 'login' ? 'signup' : 'login';
        this.showEmailAuthModal(newMode);
    }

    // 이메일 인증 폼 제출 처리
    async handleEmailAuthSubmit(e) {
        e.preventDefault();

        if (!firebaseAuth) {
            this.showEmailAuthMessage('Firebase 인증이 준비되지 않았습니다.', 'error');
            return;
        }

        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;

        try {
            if (this.authMode === 'signup') {
                if (password !== confirmPassword) {
                    this.showEmailAuthMessage('비밀번호가 일치하지 않습니다.', 'error');
                    return;
                }

                if (password.length < 6) {
                    this.showEmailAuthMessage('비밀번호는 6자 이상이어야 합니다.', 'error');
                    return;
                }

                console.log('Starting email sign-up...');
                const user = await firebaseAuth.signUpWithEmail(email, password);
                console.log('Email sign-up successful:', user);
                this.showEmailAuthMessage('회원가입 성공! 이메일 인증을 확인해주세요.', 'success');

                setTimeout(() => {
                    this.hideEmailAuthModal();
                }, 2000);
            } else {
                console.log('Starting email sign-in...');
                const user = await firebaseAuth.signInWithEmail(email, password);
                console.log('Email sign-in successful:', user);
                this.hideEmailAuthModal();
                this.showNotification('이메일 로그인 성공!', 'success');
            }
        } catch (error) {
            console.error('Email auth error:', error);
            let message = '인증에 실패했습니다.';

            if (error.code === 'auth/user-not-found') {
                message = '존재하지 않는 계정입니다.';
            } else if (error.code === 'auth/wrong-password') {
                message = '비밀번호가 올바르지 않습니다.';
            } else if (error.code === 'auth/email-already-in-use') {
                message = '이미 사용 중인 이메일입니다.';
            } else if (error.code === 'auth/weak-password') {
                message = '비밀번호는 6자 이상이어야 합니다.';
            }

            this.showEmailAuthMessage(message, 'error');
        }
    }

    // 비밀번호 재설정 처리
    async handleForgotPassword() {
        if (!firebaseAuth) {
            this.showEmailAuthMessage('Firebase 인증이 준비되지 않았습니다.', 'error');
            return;
        }

        const email = document.getElementById('emailInput').value;
        if (!email) {
            this.showEmailAuthMessage('이메일을 입력해주세요.', 'error');
            return;
        }

        try {
            await firebaseAuth.resetPassword(email);
            this.showEmailAuthMessage('비밀번호 재설정 이메일을 발송했습니다.', 'success');
        } catch (error) {
            console.error('Password reset error:', error);
            this.showEmailAuthMessage('비밀번호 재설정 이메일 발송에 실패했습니다.', 'error');
        }
    }

    // 로그아웃 처리
    async handleSignOut() {
        if (!firebaseAuth) {
            return;
        }

        try {
            await firebaseAuth.signOut();
            this.showNotification('로그아웃 성공!', 'success');
        } catch (error) {
            console.error('Sign-out error:', error);
            this.showNotification('로그아웃에 실패했습니다.', 'error');
        }
    }

    // Firebase UI 업데이트
    updateFirebaseUI(user) {
        this.firebaseUser = user;

        const userInfo = document.getElementById('firebaseUserInfo');
        const authButtons = document.getElementById('firebaseAuthButtons');
        const signOutBtn = document.getElementById('firebaseSignOutBtn');

        if (user) {
            // 사용자 정보 표시
            userInfo.classList.remove('hidden');
            authButtons.classList.add('hidden');
            signOutBtn.classList.remove('hidden');

            document.getElementById('userAvatar').src = user.photoURL || 'https://via.placeholder.com/40';
            document.getElementById('userDisplayName').textContent = user.displayName || user.email;
            document.getElementById('userEmail').textContent = user.email;
        } else {
            // 로그인 버튼 표시
            userInfo.classList.add('hidden');
            authButtons.classList.remove('hidden');
            signOutBtn.classList.add('hidden');
        }
    }

    // 로컬 스토리지에서 Firebase 사용자 정보 로드
    loadFirebaseUserFromStorage() {
        if (firebaseAuth) {
            const user = firebaseAuth.getUserFromLocalStorage();
            if (user) {
                console.log('Loaded Firebase user from storage:', user);
                // 실제 인증 상태는 Firebase auth listener에서 업데이트됨
            }
        }
    }

    // 이메일 인증 메시지 표시
    showEmailAuthMessage(message, type = 'info') {
        const messageDiv = document.getElementById('emailAuthMessage');
        const messageText = document.getElementById('emailAuthMessageText');

        messageText.textContent = message;
        messageDiv.classList.remove('hidden');

        // 스타일 설정
        messageDiv.className = `alert alert-${type === 'error' ? 'error' : 'info'}`;
    }

    // 이메일 인증 메시지 숨기기
    hideEmailAuthMessage() {
        const messageDiv = document.getElementById('emailAuthMessage');
        messageDiv.classList.add('hidden');
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        // 간단한 알림 표시 (나중에 개선 가능)
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'error' : 'success'} fixed top-4 right-4 z-50 max-w-sm`;
        notification.innerHTML = `
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // User profile and logout methods
    showUserProfileModal() {
        const modal = document.getElementById('userProfileModal')
        modal.classList.remove('hidden')
        modal.classList.add('flex')

        // Setup modal event listeners
        this.setupUserProfileModalEvents()
    }

    hideUserProfileModal() {
        const modal = document.getElementById('userProfileModal')
        modal.classList.add('hidden')
        modal.classList.remove('flex')
    }

    setupUserProfileModalEvents() {
        const closeBtn = document.getElementById('closeUserProfileModal')
        const closeProfileBtn = document.getElementById('closeProfileBtn')
        const logoutBtn = document.getElementById('authLogoutBtn')
        const editBlogIdBtn = document.getElementById('editBlogIdBtn')
        const refreshCookiesBtn = document.getElementById('globalRefreshCookies')

        // Remove existing event listeners
        const newCloseBtn = closeBtn.cloneNode(true)
        const newCloseProfileBtn = closeProfileBtn.cloneNode(true)
        const newLogoutBtn = logoutBtn.cloneNode(true)
        const newEditBlogIdBtn = editBlogIdBtn.cloneNode(true)
        const newRefreshCookiesBtn = refreshCookiesBtn.cloneNode(true)

        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn)
        closeProfileBtn.parentNode.replaceChild(newCloseProfileBtn, closeProfileBtn)
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn)
        editBlogIdBtn.parentNode.replaceChild(newEditBlogIdBtn, editBlogIdBtn)
        refreshCookiesBtn.parentNode.replaceChild(newRefreshCookiesBtn, refreshCookiesBtn)

        // Add event listeners
        newCloseBtn.addEventListener('click', () => this.hideUserProfileModal())
        newCloseProfileBtn.addEventListener('click', () => this.hideUserProfileModal())
        newLogoutBtn.addEventListener('click', () => this.handleLogout())
        newEditBlogIdBtn.addEventListener('click', () => this.handleBlogIdEdit())
        newRefreshCookiesBtn.addEventListener('click', () => this.extractCookies())
    }

    setupBlogIdModalEvents() {
        const modal = document.getElementById('blogIdModal')
        if (!modal) {
            return
        }

        const input = document.getElementById('blogIdModalInput')
        const saveBtn = document.getElementById('blogIdModalSave')
        const cancelBtn = document.getElementById('blogIdModalCancel')

        if (!saveBtn || !cancelBtn || !input) {
            return
        }

        const newSaveBtn = saveBtn.cloneNode(true)
        const newCancelBtn = cancelBtn.cloneNode(true)

        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn)
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn)

        newSaveBtn.addEventListener('click', () => this.handleBlogIdModalSave())
        newCancelBtn.addEventListener('click', () => this.closeBlogIdModal())

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeBlogIdModal()
            }
        })

        this.blogIdModal = modal
        this.blogIdModalInput = input
    }

    async handleLogout() {
        try {
            console.log('Logging out...')

            if (typeof firebaseAuth !== 'undefined' && firebaseAuth?.signOut) {
                try {
                    await firebaseAuth.signOut()
                    console.log('Firebase auth session cleared')
                } catch (firebaseError) {
                    console.warn('Firebase signOut failed:', firebaseError)
                }
            }

            const result = await window.electronAPI.logout()

            if (result.success) {
                console.log('Logout successful, redirecting to auth page...')
                localStorage.removeItem('firebaseAuth')
                window.location.href = 'auth.html?logout=1'
            } else {
                console.error('Logout failed:', result.error)
                alert('로그아웃에 실패했습니다.')
            }
        } catch (error) {
            console.error('Logout error:', error)
            alert('로그아웃 중 오류가 발생했습니다.')
        }
        localStorage.removeItem('firebaseAuth')
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('App initialized');
})
