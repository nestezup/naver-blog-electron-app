# Naver Blog Electron App — Code Review and Fixes

## Summary
- Fixed inaccurate login detection by checking Naver auth cookies instead of any cookie presence.
- Automated domain handling for post publishing to avoid manual navigation to `blog.naver.com` (and the user’s blog path).
- Removed hard-coded blog ID in publish logic and replaced with dynamic extraction from the WebView URL.
- Adjusted referer header to reflect the actual blog path, improving acceptance/CORS behavior for the `RabbitWrite.naver` endpoint.

## Findings

- Login detection was unreliable.
  - Problem: `app/renderer/js/app.js` treated “any cookie” as logged in.
  - Impact: UI showed logged-in state even when not authenticated; posting workflow could proceed incorrectly.
  - Fix: Use `window.utils.isLoggedIn` from `preload.js` (checks `NID_AUT` and `NID_SES` and user cookies) with a safe fallback if `utils` is not available.

- Manual navigation required before publishing.
  - Problem: `createBlogPost()` aborted if WebView URL wasn’t already on `blog.naver.com`, forcing manual movement.
  - Fix: Removed the early return and moved domain enforcement into the request path. The WebView now navigates automatically to the proper domain before sending the request.

- Hard-coded `blogId` during publishing.
  - Problem: `sendBlogAPIRequest()` used a constant `nest4000` blog ID; referer header was also hard-coded to this user.
  - Impact: Publishing for other accounts or when not on that blog path would fail or behave unexpectedly.
  - Fix: Dynamically extract `blogId` from the WebView URL when available. If missing, return a clear error prompting the user to land on their blog home once. The referer header now uses the detected `blogId`.

- Domain and referer alignment for `fetch`.
  - Change: `makeRequestFromWebview()` now accepts `{ blogId }` and, when needed, navigates to `https://blog.naver.com/<blogId>/postwrite` before sending the POST to `RabbitWrite.naver`. The referer header is set to `https://blog.naver.com/<blogId>/postwrite?categoryNo=6`.

## Files Changed

- app/renderer/js/app.js
  - Added `this.userBlogId` to track detected blog ID.
  - Updated `extractCookies()` to use robust login detection via `window.utils.isLoggedIn` with fallback checks.
  - Removed early domain guard in `createBlogPost()` so posting can auto-handle navigation.
  - Reworked `sendBlogAPIRequest()` to detect and require a valid blog ID.
  - Extended `makeRequestFromWebview()` to accept `{ blogId }`, auto-navigate to the appropriate blog path, and use a dynamic referer header.

## How To Validate

1. Start the app (`npm run dev`).
2. In the WebView, log in to Naver (ensure cookies like `NID_AUT`, `NID_SES` exist).
3. Click “쿠키 새로고침” to update login status; the indicator should show “로그인됨 (yourBlogId)” when on your blog path.
4. Try “새 글 작성” from any page (even if not already on `blog.naver.com`). The app should:
   - Auto-navigate WebView to `https://blog.naver.com/<yourBlogId>/postwrite` or `blog.naver.com` first.
   - Perform the `RabbitWrite.naver` `POST` with same-origin credentials and the correct referer.

If the app can’t detect your `blogId`, it will show an error asking to land on your blog home once so it can learn it from the URL.

## Recommendations / Next Steps

- Category and blog ID handling
  - Make `categoryId` configurable from the UI instead of hard-coded `6`.
  - Add a one-time detection workflow to reliably get `blogId` (e.g., redirect to `BlogHome.naver` and parse path) if it’s missing.

- Auth robustness
  - Optionally verify login by calling a login-required endpoint via WebView JS (HEAD/GET) and using the response as an extra check.
  - Consider showing the detected account name or avatar for clarity.

- Code organization
  - Centralize Naver-specific constants and endpoint paths.
  - Consider moving publish request building into a small service module for maintainability.

- Security and stability
  - BrowserWindow has `webSecurity: false` while `<webview>` has `webSecurity="true"`. Prefer keeping `webSecurity` enabled globally if possible and whitelist what’s needed.
  - Add error surface in the UI (toast or panel) to avoid blocking alerts.

