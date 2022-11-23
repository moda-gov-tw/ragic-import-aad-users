# Ragic Import AAD Users
每日使用 Github Actions 排程匯入 Azure AD 使用者到 Ragic

## Getting Started
### 1. 取得能夠讀取使用者資料的 AAD API Secret
會需要取得 tenant_id, client_id, client_secret
### 2. 取得能夠讀取使用者資料的 Ragic Token 
### 3. Fork this repo
### 4. Set Github Actions Secret
- AAD_TENANT_ID: 步驟一取得
- AAD_CLIENT_ID: 步驟一取得
- AAD_CLIENT_SECRET: 步驟一取得
- RAGIC_URL: Ragic網址，如https://ragic.example.com
- RAGIC_KEY: 步驟二取得
