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
        this.webview = document.getElementById('blogWebview')
        this.setupEventListeners()
        this.setupWebView()
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

        // Theme toggle
        document.getElementById('toggleTheme').addEventListener('click', () => {
            const html = document.documentElement
            const currentTheme = html.getAttribute('data-theme')
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
            html.setAttribute('data-theme', newTheme)
        })

        // Blog post creation
        document.getElementById('createPost').addEventListener('click', () => {
            this.createBlogPost()
        })

        // Cookie refresh
        document.getElementById('refreshCookies').addEventListener('click', () => {
            this.extractCookies()
        })

        // Blog ID management
        document.getElementById('saveBlogId').addEventListener('click', () => {
            this.saveBlogId()
        })

        document.getElementById('goToMyBlog').addEventListener('click', () => {
            this.goToMyBlog()
        })

        // Markdown post creation
        document.getElementById('createPostFromMarkdown').addEventListener('click', () => {
            this.createPostFromMarkdown()
        })

        document.getElementById('previewMarkdown').addEventListener('click', () => {
            this.previewMarkdown()
        })

        // Load saved blog ID on startup (with delay for DOM)
        setTimeout(() => {
            this.loadSavedBlogId()
        }, 100)
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
            editorSource: "EPJG7EJse3NuChiZasrm8g=="
        }

        const requestData = {
            blogId: blogId,
            documentModel: JSON.stringify(documentModel),
            mediaResources: JSON.stringify({ image: [], video: [], file: [] }),
            populationParams: JSON.stringify(populationParams),
            productApiVersion: 'v1'  // 새 글 작성에는 포함됨
        }

        console.log('Sending API request with data:', requestData)

        // WebView에서 fetch 요청 (새 글 작성 API)
        return await this.makeRequestFromWebview('https://blog.naver.com/RabbitWrite.naver', requestData, { blogId })
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
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''
        for (let i = 0; i < 26; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    // Blog ID Management Methods
    saveBlogId() {
        const blogIdInput = document.getElementById('blogIdInput')
        const blogId = blogIdInput.value.trim()

        if (!blogId) {
            alert('블로그 ID를 입력해주세요.')
            return
        }

        // 간단한 블로그 ID 유효성 검사
        if (!/^[a-zA-Z0-9_-]+$/.test(blogId)) {
            alert('블로그 ID는 영문, 숫자, _, - 만 사용할 수 있습니다.')
            return
        }

        try {
            // localStorage에 저장 (여러 방식으로 시도)
            localStorage.setItem('userBlogId', blogId)

            // 세션 스토리지에도 백업 저장
            sessionStorage.setItem('userBlogId', blogId)

            // 메모리에도 저장
            this.userBlogId = blogId

            console.log('Blog ID saved to localStorage:', blogId)
            console.log('Blog ID saved to sessionStorage:', blogId)
            console.log('Blog ID saved to memory:', this.userBlogId)

            // 저장 확인
            const saved = localStorage.getItem('userBlogId')
            if (saved === blogId) {
                alert(`블로그 ID "${blogId}"가 성공적으로 저장되었습니다.`)
            } else {
                alert(`저장 실패: localStorage에 저장되지 않았습니다. 메모리에만 저장됩니다.`)
            }

            // 로그인 상태 업데이트
            this.updateLoginStatus()
        } catch (error) {
            console.error('Storage error:', error)
            // localStorage 실패시 메모리에만 저장
            this.userBlogId = blogId
            alert(`블로그 ID "${blogId}"가 메모리에 저장되었습니다. (영구 저장 실패)`)
        }
    }

    loadSavedBlogId() {
        try {
            // localStorage에서 먼저 시도
            let savedBlogId = localStorage.getItem('userBlogId')

            // localStorage가 실패하면 sessionStorage에서 시도
            if (!savedBlogId) {
                savedBlogId = sessionStorage.getItem('userBlogId')
            }

            if (savedBlogId) {
                const blogIdInput = document.getElementById('blogIdInput')
                if (blogIdInput) {
                    blogIdInput.value = savedBlogId
                }
                this.userBlogId = savedBlogId
                console.log('Loaded saved blog ID:', savedBlogId)
                console.log('From localStorage:', localStorage.getItem('userBlogId'))
                console.log('From sessionStorage:', sessionStorage.getItem('userBlogId'))
            } else {
                console.log('No saved blog ID found')
            }
        } catch (error) {
            console.error('Error loading saved blog ID:', error)
        }
    }

    goToMyBlog() {
        // 먼저 최신 저장된 블로그 ID를 다시 로드
        this.loadSavedBlogId()

        console.log('Current userBlogId in memory:', this.userBlogId)
        console.log('localStorage userBlogId:', localStorage.getItem('userBlogId'))
        console.log('sessionStorage userBlogId:', sessionStorage.getItem('userBlogId'))

        if (!this.userBlogId) {
            const storedId = localStorage.getItem('userBlogId') || sessionStorage.getItem('userBlogId')
            if (storedId) {
                this.userBlogId = storedId
                console.log('Found stored blog ID, setting to memory:', storedId)
            } else {
                alert('먼저 블로그 ID를 입력하고 저장해주세요.')
                return
            }
        }

        if (!this.webview) {
            alert('WebView가 준비되지 않았습니다.')
            return
        }

        const blogUrl = `https://blog.naver.com/${this.userBlogId}`
        console.log('Navigating to user blog:', blogUrl)
        this.webview.src = blogUrl
    }

    // Markdown Functions
    previewMarkdown() {
        const markdownInput = document.getElementById('markdownInput')
        const markdown = markdownInput.value.trim()

        if (!markdown) {
            alert('마크다운 내용을 입력해주세요.')
            return
        }

        const parsed = this.parseMarkdown(markdown)
        console.log('Parsed markdown:', parsed)
        alert(`파싱된 결과:\n제목: ${parsed.title}\n단락 수: ${parsed.paragraphs.length}`)
    }

    async createPostFromMarkdown() {
        if (!this.isLoggedIn) {
            alert('먼저 로그인해주세요.')
            return
        }

        const markdownInput = document.getElementById('markdownInput')
        const markdown = markdownInput.value.trim()

        if (!markdown) {
            alert('마크다운 내용을 입력해주세요.')
            return
        }

        console.log('Creating post from markdown...')

        const parsed = this.parseMarkdown(markdown)
        const naverBlogData = this.convertToNaverBlogFormat(parsed.title, parsed.paragraphs)

        console.log('Naver blog data:', naverBlogData)

        try {
            const result = await this.sendBlogAPIRequestWithData(naverBlogData)
            console.log('Markdown post creation result:', result)

            if (result.success) {
                alert('마크다운 글이 성공적으로 작성되었습니다!')
                markdownInput.value = '' // 입력 필드 초기화
            } else {
                alert('글 작성에 실패했습니다: ' + result.message)
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
        let isInQuote = false
        let quoteContent = ''

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim()

            // 제목 처리 (# 으로 시작)
            if (line.startsWith('# ') && i === 0) {
                title = line.substring(2).trim()
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

            // 빈 줄 처리
            if (line === '') {
                if (currentParagraph) {
                    paragraphs.push({ type: 'text', content: currentParagraph.trim() })
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
            paragraphs.push({ type: 'text', content: currentParagraph.trim() })
        }

        return { title, paragraphs }
    }

    convertToNaverBlogFormat(title, paragraphs) {
        const components = []

        // 제목 컴포넌트
        components.push({
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
        })

        // 단락 컴포넌트들
        for (const paragraph of paragraphs) {
            if (paragraph.type === 'quote') {
                // 인용구 컴포넌트
                components.push({
                    id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                    layout: "quotation_line",
                    value: [{
                        id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                        nodes: [{
                            id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                            value: paragraph.content,
                            "@ctype": "textNode"
                        }],
                        "@ctype": "paragraph"
                    }],
                    source: null,
                    "@ctype": "quotation"
                })
            } else {
                // 일반 텍스트 컴포넌트
                const sentences = this.splitIntoSentences(paragraph.content)
                const textParagraphs = sentences.map(sentence => ({
                    id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                    nodes: [{
                        id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                        value: sentence,
                        style: {
                            fontFamily: "nanumbareunhipi",
                            "@ctype": "nodeStyle"
                        },
                        "@ctype": "textNode"
                    }],
                    "@ctype": "paragraph"
                }))

                components.push({
                    id: "SE-" + this.generateId().substring(0, 8) + "-" + this.generateId().substring(8, 12) + "-" + this.generateId().substring(12, 16) + "-" + this.generateId().substring(16, 20) + "-" + this.generateId().substring(20),
                    layout: "default",
                    value: textParagraphs,
                    "@ctype": "text"
                })
            }
        }

        return components
    }

    splitIntoSentences(text) {
        // 간단한 문장 분리 (마침표, 느낌표, 물음표 기준)
        const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
        return sentences.length > 0 ? sentences : [text]
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
                                st: 495,
                                sk: 102
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
                commentYn: false,
                scrapYn: false,
                allowHtml: false,
                hideTitle: false
            },
            editorSource: "EPJG7EJse3NuChiZasrm8g=="
        }

        const requestData = {
            blogId: blogId,
            documentModel: JSON.stringify(documentModel),
            mediaResources: JSON.stringify({ image: [], video: [], file: [] }),
            populationParams: JSON.stringify(populationParams),
            productApiVersion: 'v1'
        }

        console.log('Sending markdown API request with data:', requestData)

        // WebView에서 fetch 요청 (마크다운으로 작성)
        return await this.makeRequestFromWebview('https://blog.naver.com/RabbitWrite.naver', requestData, { blogId })
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App()
})
