// Simple Naver Blog Electron App

class App {
    constructor() {
        this.webview = null
        this.sidebarOpen = false
        this.cookies = {}
        this.isLoggedIn = false
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

                // 쿠키가 있으면 로그인으로 처리 (간단하게)
                this.isLoggedIn = Object.keys(this.cookies).length > 0

                console.log('Login status:', this.isLoggedIn)

                // URL에서 사용자 블로그 ID 추출
                const currentUrl = this.webview.getURL()
                const urlMatch = currentUrl.match(/blog\.naver\.com\/([^\/\?]+)/)
                if (urlMatch && urlMatch[1] !== 'PostView.naver' && urlMatch[1] !== 'RabbitWrite.naver') {
                    this.userBlogId = urlMatch[1]
                    console.log('User blog ID from URL:', this.userBlogId)
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

        if (!currentURL.includes('blog.naver.com')) {
            alert('네이버 블로그 페이지에서 시도해주세요.\n현재 URL: ' + currentURL)
            return
        }

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
        const blogId = 'nest4000'

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
        return await this.makeRequestFromWebview('https://blog.naver.com/RabbitWrite.naver', requestData)
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

    async makeRequestFromWebview(url, data) {
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
                console.log(`WebView not on blog.naver.com domain (current: ${domainInfo.hostname}), navigating...`);
                this.webview.src = 'https://blog.naver.com';

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
                                'referer': 'https://blog.naver.com/nest4000/postwrite?categoryNo=6',
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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App()
})