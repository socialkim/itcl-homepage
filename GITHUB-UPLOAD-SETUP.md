# 🐙 GitHub 업로드 설정 가이드

관리자 페이지에서 로고 이미지를 업로드하면 GitHub 리포지토리의 `uploads/logos/` 폴더에 자동 커밋됩니다. 이 기능을 쓰려면 아래 3가지 설정이 필요합니다.

---

## STEP 1 · GitHub 리포지토리 준비

로고가 저장될 리포지토리가 필요합니다. 세 가지 선택지:

### 옵션 A — 전용 에셋 리포지토리 (권장)
**장점**: 메인 프로젝트와 분리되어 히스토리 깨끗함, 권한 관리 용이
1. https://github.com/new 접속
2. Repository name: `itcl-assets` (또는 원하는 이름)
3. **Public** 또는 Private 선택 (Public이면 raw URL 바로 접근 가능해서 더 간단)
4. "Create repository" 클릭
5. ⚠️ **완전히 빈 repo면 첫 커밋이 실패할 수 있음** — README라도 하나 만들어두세요
   (Initialize this repository with: **Add a README file** 체크)

### 옵션 B — 이미 있는 홈페이지 소스 repo 사용
홈페이지 프로젝트를 GitHub에 push하셨으면 그 repo 사용 가능.

### 옵션 C — 홈페이지 소스를 지금 GitHub에 push하고 사용
```bash
cd C:/Users/kimdu/claude/itcl
# 이미 상위 폴더가 git repo라 itcl 따로 push 하려면 subtree 필요.
# 간단히: 새 repo 만들고 itcl만 push
```
이 옵션은 복잡하므로 옵션 A 권장.

---

## STEP 2 · Personal Access Token (PAT) 생성

1. https://github.com/settings/tokens?type=beta 접속 (Fine-grained tokens 권장)
   - 또는 classic: https://github.com/settings/tokens/new
2. **Fine-grained token** 생성:
   - Token name: `ITCL Admin Upload`
   - Expiration: 1 year (또는 원하는 기간)
   - Repository access: **Only select repositories** → 위에서 만든 `itcl-assets` 선택
   - Repository permissions:
     - **Contents**: Read and write ✅
     - 나머지는 No access
3. **Generate token** 클릭 → `github_pat_xxx...` 형식 토큰 복사

⚠️ 이 토큰은 **채팅창에 붙이지 마세요.** 바로 Vercel로 옮깁니다.

---

## STEP 3 · Vercel 환경변수 추가 (3개)

브라우저에서 이 URL 열기:
```
https://vercel.com/socialkim0211-3722s-projects/itcl/settings/environment-variables
```

**Add Environment Variable** 버튼 3번 눌러서:

| Key | Value | Environment |
|---|---|---|
| `GITHUB_TOKEN` | STEP 2에서 복사한 `github_pat_xxx...` | Production + Preview |
| `GITHUB_OWNER` | GitHub 사용자명 (예: `kimdukjin`) | Production + Preview |
| `GITHUB_REPO` | STEP 1에서 만든 repo 이름 (예: `itcl-assets`) | Production + Preview |

**Save** 각각 클릭.

---

## STEP 4 · 재배포 (Vercel이 새 env vars 반영)

환경변수는 **재배포 후** 적용됩니다. Claude에게 "재배포 해줘" 요청하거나 직접:

```bash
cd C:/Users/kimdu/claude/itcl
vercel --prod --yes
```

---

## STEP 5 · 테스트

1. 관리자 페이지 → **콘텐츠 관리 → 클라이언트 기업**
2. 아무 기업 행의 **"📤 선택"** 버튼 클릭
3. 로고 PNG/JPG/SVG 파일 하나 선택 (최대 3MB)
4. 자동 업로드 → "업로드 완료" 토스트
5. URL 필드에 `https://raw.githubusercontent.com/{owner}/{repo}/main/uploads/logos/...` 자동 입력
6. **"전체 저장"** 클릭
7. 메인 페이지 새로고침 → Trusted by 섹션에 로고 이미지 표시

---

## ❓ 안 되면 확인할 것

### "GitHub 업로드 설정 누락" 에러
- Vercel env vars 3개 모두 들어갔는지 확인
- 재배포 했는지 확인 (env 변경 후 필수)

### "HTTP 401 Bad credentials"
- PAT 만료 or 잘못 복사됨
- 새 PAT 생성해서 GITHUB_TOKEN 갱신

### "HTTP 404"
- GITHUB_OWNER / GITHUB_REPO 값 오타 (대소문자 주의)
- 토큰이 해당 repo에 접근 권한 없음 (PAT 생성 시 repository 선택 확인)

### "HTTP 422 too large"
- 파일이 100MB 넘음 (우리 쪽에서 3MB 제한 걸어놨으니 이건 거의 발생 X)

### 업로드는 됐는데 이미지가 안 뜸
- Private repo면 raw.githubusercontent.com URL이 인증 필요
- **해결**: repo를 Public으로 전환 (권장), 또는 Supabase Storage로 대안 구현 요청
- 또는 업로드 후 1분 정도 GitHub CDN 반영 대기

---

## 🔐 보안 참고

- PAT는 **서버 환경변수에만** 저장 (프론트엔드에 절대 노출 안 됨)
- PAT는 **해당 repo + Contents write 권한만** 있음 (다른 권한 없음)
- 관리자 로그인 세션이 있어야 업로드 API 호출 가능 (공격자가 임의로 repo에 파일 넣을 수 없음)
- 이미지 파일 형식 (png/jpg/gif/svg/webp)만 허용 — 악성 실행 파일 차단

---

## 🤔 왜 Supabase Storage 아닌 GitHub인가?

덕진님이 GitHub 기반을 선호하셔서 이렇게 구현했습니다.

**GitHub 방식 장점:**
- 버전 관리 (어떤 로고가 언제 교체됐는지 git 히스토리에 남음)
- 타 저장소로 이관 용이 (repo 복사만 하면 끝)
- 별도 외부 서비스 의존 없음

**GitHub 방식 단점:**
- 초기 설정 3단계 (PAT, repo, env) 필요
- 바이너리 파일이 Git history에 쌓임 (대량이면 repo 비대화)
- Public repo면 누구나 URL 접근 가능 (로고는 공개 자산이라 OK)

나중에 이미지 업로드가 많아지면 **Supabase Storage** 또는 **Cloudflare R2**로 전환 고려 가능.
