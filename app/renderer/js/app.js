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

        // Sample post creation
        document.getElementById('createSamplePost').addEventListener('click', () => {
            this.createSamplePost()
        })

        document.getElementById('createSamplePostWithMarkdown').addEventListener('click', () => {
            this.createSamplePostFromMarkdown()
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
        console.log('Original markdown:', markdown)

        const parsed = this.parseMarkdown(markdown)
        console.log('Parsed markdown:', parsed)

        // convertToNaverBlogFormat으로 변환하여 components 생성
        const components = this.convertToNaverBlogFormat(parsed.title, parsed.paragraphs)
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
                        const errorMessage = responseData.result ?
                            (typeof responseData.result === 'object' ?
                                JSON.stringify(responseData.result, null, 2) :
                                responseData.result) :
                            '알 수 없는 오류'
                        alert(`네이버 API 오류:\n${errorMessage}\n\n가능한 원인:\n- 블로그 ID 확인\n- 로그인 상태 확인\n- 블로그 쓰기 권한 확인`)
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

    convertToNaverBlogFormat(title, paragraphs) {
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
                // YouTube oembed 컴포넌트
                const videoId = this.extractYouTubeId(paragraph.url);
                components.push({
                    id: this.generateSEId(),
                    layout: "default",
                    type: "video",
                    version: "1.0",
                    html: `<iframe width="400" height="225" src="https://www.youtube.com/embed/${videoId}?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="${paragraph.title || 'YouTube video'}"></iframe>`,
                    originalWidth: 400,
                    originalHeight: 225,
                    authorName: "YouTube",
                    authorUrl: "https://www.youtube.com/",
                    providerName: "YouTube",
                    providerUrl: "https://www.youtube.com/",
                    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    thumbnailWidth: 480,
                    thumbnailHeight: 360,
                    title: paragraph.title || "YouTube video",
                    description: "",
                    inputUrl: paragraph.url,
                    contentMode: "fit",
                    oembedSign: "dnqGS1IL5Tk_irorTQ0mBIw5OJHFza4G1EHIbL18eXM__v2.0",
                    "@ctype": "oembed"
                })
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
            } else if (paragraph.type === 'link') {
                // 링크 컴포넌트 - 텍스트 컴포넌트와 oglink 컴포넌트를 모두 생성
                // 텍스트 컴포넌트 (링크 속성 포함)
                components.push({
                    id: this.generateSEId(),
                    layout: "default",
                    value: [{
                        id: this.generateSEId(),
                        nodes: [{
                            id: this.generateSEId(),
                            value: paragraph.text || paragraph.url,
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
                })

                // oglink 컴포넌트 (미리보기)
                components.push({
                    id: this.generateSEId(),
                    layout: "default",
                    title: paragraph.title || this.extractDomainFromUrl(paragraph.url),
                    domain: this.extractDomainFromUrl(paragraph.url),
                    link: paragraph.url,
                    thumbnail: {
                        src: paragraph.thumbnail || "https://www.google.com/s2/favicons?domain=" + this.extractDomainFromUrl(paragraph.url) + "&sz=128",
                        width: 1200,
                        height: 1200,
                        "@ctype": "thumbnail"
                    },
                    description: paragraph.description || "",
                    video: false,
                    oglinkSign: "Ub2GJaay33GnzOcInKXBCIubN2t5LrWC7is7G-rP_-A__v1.0",
                    "@ctype": "oglink"
                })
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

마지막 단락입니다. 모든 요소가 잘 변환되는지 확인해보세요!`

        console.log('=== Original Markdown ===')
        console.log(sampleMarkdown)

        try {
            const parsed = this.parseMarkdown(sampleMarkdown)
            console.log('=== Parsed Result ===')
            console.log('Title:', parsed.title)
            console.log('Paragraphs:', JSON.stringify(parsed.paragraphs, null, 2))

            const components = this.convertToNaverBlogFormat(parsed.title, parsed.paragraphs)
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
        console.log('DocumentModel:', documentModel)
        console.log('RequestData keys:', Object.keys(requestData))

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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App()
})
